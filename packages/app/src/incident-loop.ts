import type {
  DeliveryReceipt,
  IncidentActionKind,
  IncidentActionRecord,
  IncidentCauseCategory,
  IncidentLoop,
  IncidentLoopAction,
  IncidentLoopRecommendation,
  IncidentWorkspace,
  InvestigationNote,
  JournalDay,
  JournalEntry,
  PluginManifest
} from "@openclog/core";
import { buildCapabilityViews, incidentActionCapabilityId, pluginCapabilityId } from "./capabilities.js";
import type { ApplicationRepository } from "./contracts.js";
import { latestEntryAt, requireMethod } from "./utils.js";

interface IncidentLoopContext {
  incident: IncidentWorkspace["incident"];
  day: JournalDay | null;
  entries: JournalEntry[];
  notes: InvestigationNote[];
  alertFindings: IncidentWorkspace["alertFindings"];
  sessionKeys: string[];
  receipts: DeliveryReceipt[];
  actionRecords: IncidentActionRecord[];
  plugins: PluginManifest[];
  capabilities: ReturnType<typeof buildCapabilityViews>;
  integrityOk: boolean;
}

export function buildIncidentWorkspace(repo: ApplicationRepository, incidentId: string): IncidentWorkspace {
  const incident = requireMethod(repo.getIncident, "getIncident")(incidentId);
  if (!incident) throw new Error(`incident_not_found:${incidentId}`);
  const notes = requireMethod(repo.listInvestigationNotes, "listInvestigationNotes")({ incidentId });
  const day = requireMethod(repo.getDay, "getDay")(incident.dayKeys[0] ?? "");
  const days = incident.dayKeys
    .map((dayKey) => requireMethod(repo.getDay, "getDay")(dayKey))
    .filter((item): item is JournalDay => item !== null);
  const entries = incident.entryIds
    .map((entryId) => days.flatMap((candidate) => candidate.entries).find((entry) => entry.id === entryId))
    .filter((entry): entry is JournalEntry => entry !== undefined);
  const sessionKeys = [...new Set(entries.map((entry) => entry.sessionId).filter((sessionKey): sessionKey is string => Boolean(sessionKey)))];
  const alertFindings = incident.dayKeys.flatMap((dayKey) => requireMethod(repo.evaluateAlertRules, "evaluateAlertRules")(dayKey)).filter((finding) => finding.triggered);
  const receipts = (repo.listDeliveryReceipts ? repo.listDeliveryReceipts() : []).filter((receipt) => receipt.incidentId === incidentId);
  const actionRecords = repo.listIncidentActionRecords ? repo.listIncidentActionRecords({ incidentId }) : [];
  const plugins = repo.listPlugins ? repo.listPlugins() : [];
  const capabilities = buildCapabilityViews(repo, new Date().toISOString());
  const integrityOk = repo.getIntegrityReport ? repo.getIntegrityReport().ok : true;
  const loop = buildIncidentLoop({
    incident,
    day,
    entries,
    notes,
    alertFindings,
    sessionKeys,
    receipts,
    actionRecords,
    plugins,
    capabilities,
    integrityOk
  });
  return {
    incident,
    entries,
    alertFindings,
    generatedSummary: day?.generatedSummary,
    notes,
    sessionKeys,
    suggestedNextActions: [...incident.runbookSuggestions.map((item) => item.title), ...loop.recommend.map((item) => item.title)],
    loop
  };
}

export function executeIncidentAction(
  repo: ApplicationRepository,
  input: { incidentId: string; actionId: IncidentActionKind; body?: string; pluginId?: string }
): { actionRecord: IncidentActionRecord; receipt?: DeliveryReceipt; note?: InvestigationNote; packet?: string; nextWorkspace: IncidentWorkspace } {
  const incident = requireMethod(repo.getIncident, "getIncident")(input.incidentId);
  if (!incident) throw new Error(`incident_not_found:${input.incidentId}`);
  const dayKey = incident.dayKeys[0] ?? "";
  const now = new Date().toISOString();
  const saveActionRecord = requireMethod(repo.saveIncidentActionRecord, "saveIncidentActionRecord");
  const refreshWorkspace = () => buildIncidentWorkspace(repo, input.incidentId);
  const assertActionCapability = (actionId: IncidentActionKind, pluginId?: string): void => {
    const capabilities = buildCapabilityViews(repo, now);
    const capabilityId = actionId === "run_plugin" && pluginId ? pluginCapabilityId(pluginId) : incidentActionCapabilityId(actionId);
    const capability = capabilities.find((item) => item.id === capabilityId) ?? capabilities.find((item) => item.id === incidentActionCapabilityId(actionId));
    if (!capability) throw new Error(`capability_not_found:${capabilityId}`);
    if (!capability.useGate.allowed) throw new Error(`capability_blocked:${capability.id}:${capability.useGate.blockers.join(",")}`);
  };

  assertActionCapability(input.actionId, input.pluginId);

  const record = (partial: Omit<IncidentActionRecord, "id" | "incidentId" | "createdAt">): IncidentActionRecord =>
    saveActionRecord({
      id: globalThis.crypto.randomUUID(),
      incidentId: input.incidentId,
      createdAt: now,
      ...partial
    });

  if (input.actionId === "refresh_summary") {
    requireMethod(repo.generateSummary, "generateSummary")(dayKey);
    const actionRecord = record({
      kind: input.actionId,
      title: "Refresh summary",
      status: "completed",
      summary: `Generated summary refreshed for ${dayKey}.`
    });
    return { actionRecord, nextWorkspace: refreshWorkspace() };
  }

  if (input.actionId === "save_note" || input.actionId === "record_closeout") {
    const body = input.body?.trim();
    if (!body) throw new Error("incident_action_body_required");
    const note = requireMethod(repo.saveInvestigationNote, "saveInvestigationNote")({
      id: globalThis.crypto.randomUUID(),
      dayKey,
      incidentId: input.incidentId,
      author: "local-user",
      body,
      linkedEntryIds: incident.entryIds,
      createdAt: now,
      updatedAt: now
    });
    const actionRecord = record({
      kind: input.actionId,
      title: input.actionId === "save_note" ? "Save investigation note" : "Record closeout",
      status: "completed",
      summary: input.actionId === "save_note" ? "Investigation note recorded." : "Closeout record captured.",
      noteId: note.id
    });
    return { actionRecord, note, nextWorkspace: refreshWorkspace() };
  }

  if (input.actionId === "copy_incident_packet") {
    const packet = buildIncidentPacket(refreshWorkspace());
    const actionRecord = record({
      kind: input.actionId,
      title: "Copy incident packet",
      status: "completed",
      summary: "Sanitized incident packet prepared for copy/export.",
      metadata: { packetLength: packet.length }
    });
    return { actionRecord, packet, nextWorkspace: refreshWorkspace() };
  }

  if (input.actionId === "create_github_issue") {
    const receipt = requireMethod(repo.createGithubIssue, "createGithubIssue")(dayKey, {
      incidentId: input.incidentId,
      idempotencyKey: `${input.incidentId}:github-issue`
    });
    const actionRecord = record({
      kind: input.actionId,
      title: "Create GitHub issue",
      status: receipt.status === "delivered" ? "completed" : "failed",
      summary: receipt.status === "delivered" ? "GitHub issue created." : "GitHub issue creation failed closed.",
      receiptId: receipt.id
    });
    return { actionRecord, receipt, nextWorkspace: refreshWorkspace() };
  }

  if (input.actionId === "deliver_slack" || input.actionId === "deliver_generic_webhook" || input.actionId === "deliver_email") {
    const target = input.actionId === "deliver_slack" ? "slack" : input.actionId === "deliver_generic_webhook" ? "generic-webhook" : "email";
    const receipt = requireMethod(repo.deliverIntegration, "deliverIntegration")(target, dayKey, {
      incidentId: input.incidentId,
      idempotencyKey: `${input.incidentId}:${target}`
    });
    const actionRecord = record({
      kind: input.actionId,
      title: `Deliver to ${target}`,
      status: receipt.status === "delivered" ? "completed" : "failed",
      summary: receipt.status === "delivered" ? `${target} delivery recorded.` : `${target} delivery failed closed.`,
      receiptId: receipt.id
    });
    return { actionRecord, receipt, nextWorkspace: refreshWorkspace() };
  }

  if (input.actionId === "run_plugin") {
    const pluginId = input.pluginId ?? requireMethod(repo.listPlugins, "listPlugins")()[0]?.id;
    if (!pluginId) throw new Error("plugin_not_found");
    assertActionCapability(input.actionId, pluginId);
    const result = requireMethod(repo.runPlugin, "runPlugin")(pluginId, { dryRun: false });
    const actionRecord = record({
      kind: input.actionId,
      title: "Run plugin",
      status: result.status === "completed" ? "completed" : "failed",
      summary: result.summary
    });
    return { actionRecord, nextWorkspace: refreshWorkspace() };
  }

  const localActionSummaries: Record<Exclude<IncidentActionKind, "refresh_summary" | "save_note" | "record_closeout" | "copy_incident_packet" | "create_github_issue" | "deliver_slack" | "deliver_generic_webhook" | "deliver_email" | "run_plugin">, { title: string; summary: string }> = {
    rebuild_visible_state: {
      title: "Rebuild visible state",
      summary: "Visible state rebuild requested from persisted evidence."
    },
    open_raw_logs: {
      title: "Open raw logs",
      summary: "Raw log review action recorded."
    },
    open_replay: {
      title: "Open replay",
      summary: "Mission replay review action recorded."
    },
    open_correlation: {
      title: "Open correlation",
      summary: "Correlation graph review action recorded."
    }
  };

  const localAction = localActionSummaries[input.actionId];
  const actionRecord = record({
    kind: input.actionId,
    title: localAction.title,
    status: "completed",
    summary: localAction.summary
  });
  return { actionRecord, nextWorkspace: refreshWorkspace() };
}

function buildIncidentLoop(context: IncidentLoopContext): IncidentLoop {
  const detect = {
    title: context.incident.title,
    summary: `${context.entries.length} linked entries across ${context.incident.dayKeys.length} day(s); ${context.alertFindings.length} active alert finding(s).`,
    affectedDayKeys: context.incident.dayKeys,
    sessionKeys: context.sessionKeys,
    linkedEntryIds: context.entries.map((entry) => entry.id),
    evidence: buildEvidenceLines(context)
  };
  const category = classifyCause(context);
  const explain = explainCause(category, context);
  const recommend = buildRecommendations(category, context);
  const act = buildActions(category, context);
  const record = {
    noteCount: context.notes.length,
    latestReceiptIds: context.receipts.slice(0, 3).map((receipt) => receipt.id),
    latestExportId: context.actionRecords.find((item) => item.exportId)?.exportId,
    latestCloseoutAt: context.actionRecords.find((item) => item.kind === "record_closeout")?.createdAt,
    actionRecords: context.actionRecords.slice(0, 6)
  };
  return { detect, explain, recommend, act, record };
}

function buildEvidenceLines(context: IncidentLoopContext): string[] {
  const lines = [
    `${context.sessionKeys.length} session key(s) linked.`,
    `${context.notes.length} investigation note(s) recorded.`,
    `${context.receipts.length} delivery receipt(s) recorded.`
  ];
  if (context.day?.generatedSummary) {
    lines.push(`Generated summary timestamp ${context.day.generatedSummary.createdAt}.`);
  } else {
    lines.push("Generated summary missing.");
  }
  const sequenceGapEntry = context.entries.find((entry) => includesAny(entry, ["sequence gap", "expected event", "received event 1"]));
  if (sequenceGapEntry) lines.unshift(`Sequence gap evidence: ${sequenceGapEntry.title}.`);
  const reconnectEntry = context.entries.find((entry) => includesAny(entry, ["reconnect", "reconnected"]));
  if (reconnectEntry) lines.unshift(`Reconnect evidence: ${reconnectEntry.title}.`);
  return lines;
}

function classifyCause(context: IncidentLoopContext): IncidentCauseCategory {
  if (context.entries.some((entry) => includesAny(entry, ["sequence gap", "expected event", "received event 1"]))) return "sequence_gap";
  if (context.alertFindings.some((finding) => includesAny(finding.detail, ["reconnect"])) || context.entries.some((entry) => includesAny(entry, ["reconnect"]))) return "reconnect_storm";
  if (context.receipts.some((receipt) => receipt.status === "failed")) return "delivery_failure";
  if (!context.integrityOk) return "integrity_mismatch";
  if (context.day?.generatedSummary && latestEntryAt(context.day.entries) > context.day.generatedSummary.createdAt) return "stale_summary";
  if (!context.day?.generatedSummary || context.entries.length === 0) return "evidence_incomplete";
  if (context.plugins.length === 0) return "unknown";
  return "unknown";
}

function explainCause(category: IncidentCauseCategory, context: IncidentLoopContext): IncidentLoop["explain"] {
  if (category === "sequence_gap") {
    return {
      category,
      title: "Gateway event sequence gap",
      summary: "Expected event continuity broke. The gateway likely restarted or the session lost continuity, so visible state should be rebuilt from persisted receipts and current subscriptions.",
      evidence: buildEvidenceLines(context),
      degraded: false
    };
  }
  if (category === "reconnect_storm") {
    return {
      category,
      title: "Gateway reconnect storm",
      summary: "Repeated reconnect evidence suggests unstable listener continuity. Operators should verify state freshness, review alert findings, and notify downstream consumers if handoff state may be stale.",
      evidence: buildEvidenceLines(context),
      degraded: false
    };
  }
  if (category === "delivery_failure") {
    return {
      category,
      title: "Delivery action failed closed",
      summary: "At least one outbound handoff failed. Retry decisions should stay bounded to recorded receipts and configuration status rather than assuming successful notification.",
      evidence: buildEvidenceLines(context),
      degraded: false
    };
  }
  if (category === "integrity_mismatch") {
    return {
      category,
      title: "Integrity mismatch requires review",
      summary: "Repository integrity checks found evidence mismatches. Export and closeout actions should be treated as degraded until the mismatch is resolved.",
      evidence: buildEvidenceLines(context),
      degraded: true
    };
  }
  if (category === "stale_summary") {
    return {
      category,
      title: "Generated summary is stale",
      summary: "Newer entries exist than the current summary includes. Refresh summary before escalation or closeout so operators are acting on current evidence.",
      evidence: buildEvidenceLines(context),
      degraded: false
    };
  }
  if (category === "evidence_incomplete") {
    return {
      category,
      title: "Incident evidence is incomplete",
      summary: "Core evidence is missing or too thin to support a strong explanation. The loop stays fail-closed and prioritizes collection actions over escalation claims.",
      evidence: buildEvidenceLines(context),
      degraded: true
    };
  }
  return {
    category,
    title: "Incident requires operator review",
    summary: "OpenClog has enough evidence to drive the action loop, but no stronger bounded cause category was established from current data.",
    evidence: buildEvidenceLines(context),
    degraded: false
  };
}

function buildRecommendations(category: IncidentCauseCategory, context: IncidentLoopContext): IncidentLoopRecommendation[] {
  const shared: IncidentLoopRecommendation[] = [
    {
      id: "copy-packet",
      title: "Prepare the sanitized incident packet.",
      rationale: "Creates a bounded handoff artifact before wider escalation.",
      priority: "medium",
      actionId: "copy_incident_packet"
    }
  ];
  if (category === "sequence_gap") {
    return [
      {
        id: "rebuild-state",
        title: "Rebuild visible state from receipts and current subscriptions.",
        rationale: "Sequence continuity broke and stale state is the primary risk.",
        priority: "high",
        actionId: "rebuild_visible_state"
      },
      {
        id: "open-logs",
        title: "Review raw logs and replay side by side.",
        rationale: "Confirms where continuity broke before notifying others.",
        priority: "high",
        actionId: "open_raw_logs"
      },
      ...shared
    ];
  }
  if (category === "reconnect_storm") {
    return [
      {
        id: "notify-operator",
        title: "Notify downstream operators through the delivery surfaces.",
        rationale: "Reconnect instability can invalidate fresh-state assumptions for handoff recipients.",
        priority: "high",
        actionId: "deliver_slack"
      },
      {
        id: "record-note",
        title: "Capture an operator note before closeout.",
        rationale: "Preserves the local interpretation of degraded continuity.",
        priority: context.notes.length === 0 ? "high" : "medium",
        actionId: "save_note"
      },
      ...shared
    ];
  }
  if (category === "stale_summary") {
    return [
      {
        id: "refresh-summary",
        title: "Refresh the generated summary now.",
        rationale: "The summary is lagging current evidence.",
        priority: "high",
        actionId: "refresh_summary"
      },
      ...shared
    ];
  }
  return [
    {
      id: "record-review",
      title: "Capture the current operator conclusion as a note or closeout record.",
      rationale: "Keeps the record trail explicit even when the cause category is weaker.",
      priority: context.notes.length === 0 ? "high" : "medium",
      actionId: "record_closeout"
    },
    ...shared
  ];
}

function buildActions(category: IncidentCauseCategory, context: IncidentLoopContext): IncidentLoopAction[] {
  const actions: IncidentLoopAction[] = [
    createAction("rebuild_visible_state", "Rebuild state", "Rebuild visible state from persisted evidence and current subscriptions."),
    createAction("open_raw_logs", "Open raw logs", "Review the raw log-oriented evidence path for this incident."),
    createAction("open_replay", "Open replay", "Inspect the mission replay generated from linked evidence."),
    createAction("open_correlation", "Open correlation", "Inspect the local correlation graph for this incident."),
    createAction("copy_incident_packet", "Copy incident packet", "Prepare a sanitized incident packet for handoff.", "confirm"),
    createAction("deliver_slack", "Notify Slack", "Send the incident packet through the Slack delivery target.", "confirm"),
    createAction("deliver_generic_webhook", "Notify webhook", "Send the incident packet through the generic webhook target.", "confirm"),
    createAction("deliver_email", "Notify email", "Send the incident packet through the email delivery target.", "confirm"),
    createAction("create_github_issue", "Create GitHub issue", "Create a GitHub issue from the current incident packet.", "confirm"),
    createAction("refresh_summary", "Refresh summary", "Regenerate the day summary from current entries."),
    createAction("save_note", "Save note", "Attach a new operator investigation note to this incident."),
    createAction("record_closeout", "Record closeout", "Store a closeout note for the current incident.")
  ];
  const pluginAction = context.plugins[0]
    ? createAction("run_plugin", `Run plugin: ${context.plugins[0].label}`, "Run the first available bounded plugin action.", "confirm")
    : createAction("run_plugin", "Run plugin", "No plugin is currently registered.", "confirm", "blocked", "Register a plugin before executing this action.");
  actions.push(pluginAction);
  const gateActions = (items: IncidentLoopAction[]): IncidentLoopAction[] =>
    items.map((action) => {
      const capabilityId = incidentActionCapabilityId(action.id);
      const capability = context.capabilities.find((item) => item.id === capabilityId);
      const capabilityReason = capability && !capability.useGate.allowed ? capability.useGate.blockers.join(", ") : undefined;
      return {
        ...action,
        capabilityId,
        availability: capabilityReason ? "blocked" : action.availability,
        reason: capabilityReason ?? action.reason
      };
    });
  if (category === "evidence_incomplete") {
    return gateActions(actions).map((action) =>
      action.availability !== "blocked" &&
      (action.id === "deliver_slack" || action.id === "deliver_generic_webhook" || action.id === "deliver_email" || action.id === "create_github_issue")
        ? { ...action, availability: "degraded", reason: "Evidence is incomplete; outbound escalation remains available but should be treated cautiously." }
        : action
    );
  }
  return gateActions(actions);
}

function createAction(
  id: IncidentActionKind,
  label: string,
  description: string,
  confirmation: IncidentLoopAction["confirmation"] = "none",
  availability: IncidentLoopAction["availability"] = "available",
  reason?: string
): IncidentLoopAction {
  return { id, label, description, confirmation, availability, ...(reason ? { reason } : {}) };
}

function includesAny(value: string | JournalEntry, needles: string[]): boolean {
  const haystack =
    typeof value === "string" ? value.toLocaleLowerCase() : `${value.title} ${value.body ?? ""} ${value.kind} ${value.status ?? ""}`.toLocaleLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function buildIncidentPacket(workspace: IncidentWorkspace): string {
  return [
    `${workspace.incident.title}`,
    workspace.loop.explain.title,
    workspace.loop.explain.summary,
    `Sessions: ${workspace.sessionKeys.join(", ") || "none"}`,
    `Entries: ${workspace.entries.map((entry) => entry.id).join(", ") || "none"}`,
    `Notes: ${workspace.notes.length}`,
    `Timestamp: ${new Date().toISOString()}`
  ].join("\n");
}
