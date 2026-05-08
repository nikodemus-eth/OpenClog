import { redactGatewayPayload, type RedactionReport, type MonitoringDecision, type MonitoringImportInput, type MonitoringImportProvenance, type MonitoringImportResult, type MonitoringSourceKind, type IncidentHandoffPacket, type IncidentSummary } from "@openclog/core";
import type { ApplicationRepository } from "./contracts.js";
import { requireMethod, sha256Digest } from "./utils.js";

const defaultWorkflow: MonitoringSourceKind[] = ["gmail", "blogwatcher", "openclaw"];
const handoffTargets = ["github-issue", "slack", "email"] as const;

export function buildMonitoringImportModule(repo: ApplicationRepository) {
  return {
    parseMonitoringDecisions(input: MonitoringImportInput): MonitoringDecision[] {
      return parseMonitoringDecisions(input);
    },
    importMonitoringDecisions(input: MonitoringImportInput): MonitoringImportResult {
      return importMonitoringDecisions(repo, input);
    },
    listIncidentHandoffPackets(filter: { dayKey?: string; incidentId?: string } = {}) {
      return requireMethod(repo.listIncidentHandoffPackets, "listIncidentHandoffPackets")(filter);
    }
  };
}

export function parseMonitoringDecisions(input: MonitoringImportInput): MonitoringDecision[] {
  const importedAt = input.importedAt ?? new Date().toISOString();
  const dayKey = input.dayKey ?? importedAt.slice(0, 10);
  const sourceWorkflow = normalizeWorkflow(input.sourceWorkflow);
  const sourceHash = `sha256-${sha256Digest(input.markdown)}`;
  const lines = input.markdown.split(/\r?\n/);
  let activeSource = sourceWorkflow[0] ?? "manual";
  const decisions: MonitoringDecision[] = [];

  lines.forEach((line, index) => {
    const headingSource = sourceFromHeading(line);
    if (headingSource) activeSource = headingSource;
    const bullet = parseDecisionLine(line);
    if (!bullet) return;
    const redacted = redactGatewayPayload(bullet);
    const body = String(redacted.redacted);
    const title = titleFromDecision(body);
    const lineNumber = index + 1;
    const disposition = input.defaultDisposition ?? inferDisposition(body);
    const provenance = buildProvenance({
      sourceWorkflow,
      sourcePath: input.sourcePath,
      sourceHash,
      importedAt,
      lineNumbers: [lineNumber],
      report: redacted.report
    });
    decisions.push({
      id: `monitoring-decision-${sha256Digest(`${sourceHash}:${lineNumber}:${body}`).slice(0, 12)}`,
      title,
      body,
      dayKey,
      disposition,
      source: activeSource,
      tags: buildTags(activeSource, body, disposition),
      provenance
    });
  });

  return decisions;
}

export function importMonitoringDecisions(repo: ApplicationRepository, input: MonitoringImportInput): MonitoringImportResult {
  const importedAt = input.importedAt ?? new Date().toISOString();
  const decisions = parseMonitoringDecisions({ ...input, importedAt });
  const sourceWorkflow = normalizeWorkflow(input.sourceWorkflow);
  const sourceHash = `sha256-${sha256Digest(input.markdown)}`;
  const totalRedactionCount = decisions.reduce((count, decision) => count + decision.provenance.redactionCount, 0);
  const redactedPaths = [...new Set(decisions.flatMap((decision) => decision.provenance.redactedPaths))];
  const provenance = buildProvenance({
    sourceWorkflow,
    sourcePath: input.sourcePath,
    sourceHash,
    importedAt,
    lineNumbers: decisions.flatMap((decision) => decision.provenance.lineNumbers),
    report: { redactionCount: totalRedactionCount, redactedPaths }
  });
  const notes = [];
  const incidents: IncidentSummary[] = [];
  const handoffPackets: IncidentHandoffPacket[] = [];
  const saveNote = requireMethod(repo.saveInvestigationNote, "saveInvestigationNote");

  for (const decision of decisions) {
    const incident = decision.disposition === "incident_handoff" ? persistIncident(repo, decision, input.incidentId, importedAt) : undefined;
    if (incident) incidents.push(incident);
    const packet = incident ? persistHandoffPacket(repo, decision, incident.id, importedAt) : undefined;
    if (packet) handoffPackets.push(packet);
    notes.push(
      saveNote({
        id: globalThis.crypto.randomUUID(),
        dayKey: decision.dayKey,
        ...(incident ? { incidentId: incident.id } : input.incidentId ? { incidentId: input.incidentId } : {}),
        author: "local-monitoring-import",
        body: buildNoteBody(decision, input.sourcePath),
        linkedEntryIds: [],
        createdAt: importedAt,
        updatedAt: importedAt
      })
    );
  }

  const pinnedContext =
    input.updatePinnedContext === false || decisions.length === 0 || !repo.setPinnedDayContext
      ? undefined
      : setPinnedImportContext(repo, decisions, handoffPackets, input.sourcePath, importedAt);

  return {
    batchId: `monitoring-import-${sha256Digest(`${sourceHash}:${importedAt}`).slice(0, 12)}`,
    importedAt,
    provenance,
    decisions,
    notes,
    incidents,
    handoffPackets,
    ...(pinnedContext ? { pinnedContext } : {})
  };
}

function setPinnedImportContext(
  repo: ApplicationRepository,
  decisions: MonitoringDecision[],
  handoffPackets: IncidentHandoffPacket[],
  sourcePath: string | undefined,
  importedAt: string
) {
  const dayKey = decisions[0].dayKey;
  if (repo.getDay && repo.upsertDay && !repo.getDay(dayKey)) {
    repo.upsertDay({
      dayKey,
      title: `Monitoring import ${dayKey}`,
      dateLabel: dayKey,
      summary: "Monitoring decisions imported locally.",
      entries: [],
      metrics: {
        sessionCount: 0,
        messageCount: 0,
        toolCallCount: 0,
        approvalCount: 0,
        errorCount: 0
      }
    });
  }
  return repo.setPinnedDayContext!(dayKey, buildPinnedContext(decisions, handoffPackets, sourcePath), new Date(importedAt));
}

function persistIncident(repo: ApplicationRepository, decision: MonitoringDecision, providedIncidentId: string | undefined, importedAt: string): IncidentSummary | undefined {
  if (providedIncidentId && repo.getIncident) {
    const existing = repo.getIncident(providedIncidentId);
    if (existing) return existing;
  }
  if (!repo.saveIncident) return undefined;
  const incident: IncidentSummary = {
    id: providedIncidentId ?? `incident-monitoring-${sha256Digest(`${decision.id}:${importedAt}`).slice(0, 12)}`,
    title: `Monitoring handoff: ${decision.title}`,
    summary: decision.body,
    dayKeys: [decision.dayKey],
    entryIds: [],
    createdAt: importedAt,
    runbookSuggestions: [
      {
        id: "monitoring-import-review",
        title: "Review imported monitoring handoff",
        summary: "Confirm imported Gmail, blogwatcher, and OpenClaw triage context before delivery.",
        reason: "Imported monitoring decision requested incident handoff."
      }
    ],
    loopProgress: { detect: true, explain: true, recommend: true, act: false, record: false },
    handoffPacketIds: []
  };
  return repo.saveIncident(incident);
}

function persistHandoffPacket(repo: ApplicationRepository, decision: MonitoringDecision, incidentId: string, importedAt: string): IncidentHandoffPacket | undefined {
  const packet: IncidentHandoffPacket = {
    id: `packet-${sha256Digest(`${incidentId}:${decision.id}`).slice(0, 12)}`,
    incidentId,
    dayKey: decision.dayKey,
    title: decision.title,
    summary: decision.body.slice(0, 240),
    body: [
      `Incident handoff from monitoring import`,
      `Decision: ${decision.title}`,
      `Source: ${decision.source}`,
      `Body: ${decision.body}`,
      `Provenance hash: ${decision.provenance.sourceHash}`,
      `Lines: ${decision.provenance.lineNumbers.join(", ")}`
    ].join("\n"),
    createdAt: importedAt,
    deliveryTargets: [...handoffTargets],
    provenance: decision.provenance
  };
  return repo.saveIncidentHandoffPacket ? repo.saveIncidentHandoffPacket(packet) : packet;
}

function parseDecisionLine(line: string): string | null {
  const bullet = /^\s*(?:[-*]|\d+[.)])\s*(?:\[[ xX]\]\s*)?(?<body>.+?)\s*$/.exec(line);
  if (!bullet?.groups?.body) return null;
  const body = cleanInlineMarkdown(bullet.groups.body);
  if (!body.trim()) return null;
  return body;
}

function sourceFromHeading(line: string): MonitoringSourceKind | null {
  if (!/^\s{0,3}#{1,6}\s+/.test(line)) return null;
  const lower = line.toLocaleLowerCase();
  if (lower.includes("gmail")) return "gmail";
  if (lower.includes("blogwatcher")) return "blogwatcher";
  if (lower.includes("openclaw")) return "openclaw";
  return null;
}

function cleanInlineMarkdown(value: string): string {
  return value
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/^\s*(?:decision|action|recommendation|triage)\s*:\s*/i, "")
    .trim();
}

function titleFromDecision(value: string): string {
  const firstClause = value.split(/[.;]/)[0]?.trim() ?? value.trim();
  const title = firstClause.replace(/^(high-signal|low-signal|quiet triage complete)\s*:\s*/i, "").trim();
  return title.length > 90 ? `${title.slice(0, 87)}...` : title || "Monitoring decision";
}

function inferDisposition(body: string): "operator_note" | "incident_handoff" {
  if (/low-signal|quiet triage|no\s+surface|do not surface|without surfacing/i.test(body)) return "operator_note";
  if (/handoff|incident|escalat|surface|high-signal|notify|deliver|outage|blocked|failure|risk/i.test(body)) return "incident_handoff";
  return "operator_note";
}

function buildTags(source: MonitoringSourceKind, body: string, disposition: "operator_note" | "incident_handoff"): string[] {
  const tags = new Set<string>([source, disposition]);
  if (/gmail/i.test(body)) tags.add("gmail");
  if (/blogwatcher/i.test(body)) tags.add("blogwatcher");
  if (/openclaw/i.test(body)) tags.add("openclaw");
  if (/high-signal/i.test(body)) tags.add("high-signal");
  if (/low-signal/i.test(body)) tags.add("low-signal");
  return [...tags];
}

function buildProvenance(input: {
  sourceWorkflow: MonitoringSourceKind[];
  sourcePath?: string;
  sourceHash: string;
  importedAt: string;
  lineNumbers: number[];
  report: RedactionReport;
}): MonitoringImportProvenance {
  return {
    sourceWorkflow: input.sourceWorkflow,
    ...(input.sourcePath ? { sourcePath: input.sourcePath } : {}),
    sourceHash: input.sourceHash,
    importedAt: input.importedAt,
    lineNumbers: input.lineNumbers,
    redactionCount: input.report.redactionCount,
    redactedPaths: input.report.redactedPaths
  };
}

function normalizeWorkflow(workflow: MonitoringSourceKind[] | undefined): MonitoringSourceKind[] {
  const normalized = (workflow && workflow.length > 0 ? workflow : defaultWorkflow).filter((item): item is MonitoringSourceKind =>
    item === "gmail" || item === "blogwatcher" || item === "openclaw" || item === "manual"
  );
  return normalized.length > 0 ? [...new Set(normalized)] : defaultWorkflow;
}

function buildNoteBody(decision: MonitoringDecision, sourcePath: string | undefined): string {
  return [
    `Monitoring import decision: ${decision.title}`,
    "",
    decision.body,
    "",
    `Disposition: ${decision.disposition.replace("_", " ")}.`,
    `Workflow: ${decision.provenance.sourceWorkflow.join(", ")}.`,
    sourcePath ? `Source path: ${sourcePath}.` : "Source path: local explicit paste.",
    `Source hash: ${decision.provenance.sourceHash}.`,
    `Line(s): ${decision.provenance.lineNumbers.join(", ")}.`,
    decision.provenance.redactionCount > 0 ? `Redactions: ${decision.provenance.redactionCount}.` : "Redactions: none."
  ].join("\n");
}

function buildPinnedContext(decisions: MonitoringDecision[], packets: IncidentHandoffPacket[], sourcePath: string | undefined): { note: string; summary: string } {
  return {
    summary: `Monitoring import: ${String(decisions.length)} decision(s), ${String(packets.length)} handoff packet(s).`,
    note: [
      `Imported from ${sourcePath ?? "local explicit monitoring paste"}.`,
      `Workflow: ${decisions[0]?.provenance.sourceWorkflow.join(", ") ?? defaultWorkflow.join(", ")}.`,
      ...decisions.slice(0, 3).map((decision) => `- ${decision.title}`)
    ].join("\n")
  };
}
