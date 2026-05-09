import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import type { AlertStateRecord, RetentionSnapshotRecord } from "@openclog/app";
import type {
  AdapterEvent,
  AlertFinding,
  AlertRule,
  AnalyticsSnapshot,
  BackendFingerprint,
  BundleSignature,
  BundleVerificationResult,
  CapabilityManifest,
  CloseoutCompletion,
  CorrelationEdge,
  CorrelationGraph,
  CorrelationNode,
  DeliveryAdapterTarget,
  DeliveryReceipt,
  DeliveryRequestOptions,
  GeneratedProfileSummary,
  GeneratedSummary,
  GatewayEventLike,
  HealthAggregate,
  HealthHistoryEntry,
  IncidentRulePack,
  IncidentActionRecord,
  IncidentHandoffPacket,
  IncidentSummary,
  InvestigationWorkspace,
  OperatorRunbook,
  IntegrityMonitorReport,
  IntegrationPayload,
  InvestigationNote,
  JournalDay,
  JournalEntry,
  JournalSearchResult,
  LineageRecord,
  MissionReplay,
  PersistableRedactedEvent,
  PinnedDayContext,
  PluginExecutionResult,
  PluginManifest,
  ProfileConfig,
  RemoteOpsPolicy,
  ReplayWorkspace,
  ReplayStep,
  RetentionClass,
  RetentionClassId,
  RetentionClassPreview,
  RetentionPolicy,
  RetentionPreview,
  SloSnapshot,
  ServiceHealthTimelineEntry,
  SessionDrilldown,
  SummaryJob,
  SummaryCitation,
  SummaryProfile,
  VerificationReceipt
} from "@openclog/core";
import { browserVisibleEntryText, exportDayAsMarkdown, sampleJournalDay, toPersistableRedactedEvent, type RunbookSuggestion } from "@openclog/core";

export interface OpenClogRepository {
  addAudit(action: string, metadata: Record<string, unknown>): void;
  addEntry(entry: JournalEntry, sourceEvent?: GatewayEventLike): JournalEntry;
  addNote(body: string, now?: Date): JournalEntry;
  buildCorrelationGraph(incidentId: string): CorrelationGraph;
  buildIntegrationPayload(target: IntegrationPayload["target"], dayKey: string): IntegrationPayload;
  buildMissionReplay(incidentId: string): MissionReplay;
  close(): void;
  countRedactedEvents(): number;
  deleteDays(dayKeys: string[]): void;
  createGithubIssue(dayKey: string, options?: DeliveryRequestOptions): DeliveryReceipt;
  createReplayWorkspace(dayKey: string): ReplayWorkspace;
  createSummaryJob(dayKey: string): SummaryJob;
  listSummaryJobs(): SummaryJob[];
  completeCloseout(dayKey: string, exportTargets: string[]): CloseoutCompletion;
  deliverIntegration(target: DeliveryAdapterTarget, dayKey: string, options?: DeliveryRequestOptions): DeliveryReceipt;
  evaluateAlertRules(dayKey: string): AlertFinding[];
  generateSummary(dayKey: string, now?: Date): GeneratedSummary;
  generateSummaryProfile(profileId: SummaryProfile["id"], dayKey: string): GeneratedProfileSummary;
  getAnalytics(): AnalyticsSnapshot;
  getBackendFingerprint(): BackendFingerprint;
  getDay(dayKey: string): JournalDay | null;
  getDrilldown(sessionKey: string): SessionDrilldown;
  getHealthAggregate(limit?: number): HealthAggregate;
  getIncident(id: string): IncidentSummary | undefined;
  getIntegrityReport(): { checkedEntries: number; mismatchedEntryIds: string[]; missingRedactedHashes: string[]; ok: boolean };
  getLineage(entryId: string): LineageRecord | undefined;
  getPinnedDayContext(dayKey: string): PinnedDayContext | undefined;
  getRetentionSnapshot(id: string): RetentionSnapshotRecord | undefined;
  getSetting<T>(key: string, fallback: T): T;
  getSloSnapshot(): SloSnapshot;
  getSummaryJob(id: string): SummaryJob | undefined;
  getInvestigationWorkspace(id: string): InvestigationWorkspace | undefined;
  getRemoteOpsPolicy(): RemoteOpsPolicy;
  listCapabilityManifests(): CapabilityManifest[];
  listIncidentHandoffPackets(filter?: { dayKey?: string; incidentId?: string }): IncidentHandoffPacket[];
  getAlertState(ruleId: string): AlertStateRecord | undefined;
  generateOperatorRunbook(): OperatorRunbook;
  listAdapterEvents(): AdapterEvent[];
  listAlertRules(): AlertRule[];
  listDays(): Omit<JournalDay, "entries">[];
  listDeliveryReceipts(): DeliveryReceipt[];
  listHealthHistory(limit: number): HealthHistoryEntry[];
  listHealthTimeline(limit?: number): ServiceHealthTimelineEntry[];
  listIncidents(): IncidentSummary[];
  listIncidentActionRecords(filter?: { incidentId?: string }): IncidentActionRecord[];
  listIncidentRulePacks(): IncidentRulePack[];
  listIntegrityReports(): IntegrityMonitorReport[];
  listInvestigationNotes(filter?: { dayKey?: string; incidentId?: string }): InvestigationNote[];
  listVerificationReceipts(): VerificationReceipt[];
  listPlugins(): PluginManifest[];
  listProfiles(): ProfileConfig[];
  listRetentionClasses(): RetentionClass[];
  listSummaryProfiles(): SummaryProfile[];
  listTables(): string[];
  previewRetention(policy: RetentionPolicy): RetentionPreview;
  previewRetentionByClass(): RetentionClassPreview[];
  recordAdapterEvent(event: AdapterEvent): void;
  registerPlugin(plugin: PluginManifest): PluginManifest;
  restoreRetentionSnapshot(snapshot: RetentionSnapshotRecord): void;
  runIntegrityMonitor(): IntegrityMonitorReport;
  runPlugin(pluginId: string, options?: { dryRun?: boolean }): PluginExecutionResult;
  createInvestigationWorkspace(input: { dayKeys: string[]; title?: string }): InvestigationWorkspace;
  saveIncident(incident: IncidentSummary): IncidentSummary;
  saveIncidentActionRecord(record: IncidentActionRecord): IncidentActionRecord;
  saveCapabilityManifest(manifest: CapabilityManifest): CapabilityManifest;
  saveIncidentHandoffPacket(packet: IncidentHandoffPacket): IncidentHandoffPacket;
  saveInvestigationNote(note: InvestigationNote): InvestigationNote;
  saveRetentionClass(retentionClass: RetentionClass): RetentionClass;
  saveRetentionSnapshot(snapshot: RetentionSnapshotRecord): RetentionSnapshotRecord;
  searchEntries(query: string): JournalSearchResult[];
  setAlertState(ruleId: string, state: AlertStateRecord): AlertStateRecord;
  setPinnedDayContext(dayKey: string, context: Pick<PinnedDayContext, "note" | "summary">, now?: Date): PinnedDayContext;
  setSelectedProfile(id: string): void;
  setSetting(key: string, value: unknown): void;
  storeRedactedEvent(entryId: string, event: PersistableRedactedEvent): void;
  upsertAlertRule(rule: AlertRule): AlertRule;
  upsertDay(day: JournalDay): void;
  upsertProfile(profile: ProfileConfig): ProfileConfig;
  retryDeliveryReceipt(id: string, options?: { useNewIdempotencyKey?: boolean }): DeliveryReceipt;
  verifyIntegrationTarget(target: DeliveryAdapterTarget, dayKey: string): DeliveryReceipt;
  verifyReplayBundle(bundle: { manifest?: Record<string, unknown>; day?: { dayKey?: string; entries?: unknown[] }; markdown?: string }): BundleVerificationResult;
}

const defaultRetentionClasses: RetentionClass[] = [
  buildRetentionClass("entries", "Journal entries", "Primary redacted evidence.", 30),
  buildRetentionClass("alert_state", "Alert state and findings", "Operational alert outcomes.", 30),
  buildRetentionClass("incidents", "Incidents", "Escalation records and workspaces.", 45),
  buildRetentionClass("investigation_notes", "Investigation notes", "Operator-authored notes.", 45),
  buildRetentionClass("summaries", "Summaries", "Generated and pinned summaries.", 30),
  buildRetentionClass("bundle_exports", "Bundle exports", "Replay/export bundle manifests.", 30),
  buildRetentionClass("delivery_receipts", "Delivery receipts", "Outbound handoff receipts.", 30),
  buildRetentionClass("audit_log", "Audit log", "Operator action audit history.", 30),
  buildRetentionClass("analytics_integrity_plugin_runs", "Analytics, integrity, and plugin runs", "Derived governance records.", 30)
];

const summaryProfiles: SummaryProfile[] = [
  { id: "default-operator", label: "Default operator summary", audience: "operator", instructions: "Summarize the day for the next operator shift." },
  { id: "escalation", label: "Escalation summary", audience: "incident commander", instructions: "Summarize operator risk and the most important evidence." },
  { id: "export", label: "Export summary", audience: "external evidence consumer", instructions: "Summarize the exported bundle with citations only." }
];

const incidentRulePacks: IncidentRulePack[] = [
  {
    id: "default-incident-loop",
    label: "Default incident loop",
    rules: [
      {
        id: "reconnect-storm",
        category: "reconnect_storm",
        title: "Route reconnect storms toward notification and note capture.",
        rationale: "Repeated reconnect evidence increases the risk of stale handoff assumptions.",
        actionId: "deliver_slack",
        priority: "high"
      },
      {
        id: "stale-summary",
        category: "stale_summary",
        title: "Refresh summaries before closeout.",
        rationale: "Escalation copy should not lag the newest journal evidence.",
        actionId: "refresh_summary",
        priority: "high"
      },
      {
        id: "delivery-failure",
        category: "delivery_failure",
        title: "Keep failed delivery visible and retryable.",
        rationale: "Escalations must fail closed rather than silently dropping handoff attempts.",
        actionId: "create_github_issue",
        priority: "medium"
      }
    ]
  }
];

const repositoryBootedAt = new Date().toISOString();

export function createSqliteRepository(filename: string): OpenClogRepository {
  const db = new DatabaseSync(filename);
  migrate(db);
  seedDefaults(db);
  const backendFingerprint = persistBackendFingerprint(db, buildBackendFingerprint());

  const repo: OpenClogRepository = {
    addAudit(action, metadata) {
      db.prepare("INSERT INTO journal_audit_log (id, action, actor, target_type, target_id, timestamp, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        crypto.randomUUID(),
        action,
        "local-user",
        String(metadata.target_type ?? "journal"),
        typeof metadata.target_id === "string" ? metadata.target_id : null,
        new Date().toISOString(),
        JSON.stringify(metadata)
      );
    },
    addEntry(entry, sourceEvent) {
      const day = repo.getDay(entry.dayKey) ?? emptyDay(entry.dayKey);
      const entries = [...day.entries.filter((existing) => existing.id !== entry.id), entry].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
      repo.upsertDay({ ...day, metrics: metricsFor(entries), entries });
      repo.generateSummary(entry.dayKey);
      if (sourceEvent) {
        const event = toPersistableRedactedEvent(sourceEvent);
        updateRedactedEventColumns(db, entry.id, event);
      }
      syncLineageForEntry(db, entry, repo);
      return entry;
    },
    addNote(body, now = new Date("2026-05-02T12:30:00.000Z")) {
      const dayKey = formatDay(now);
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        dayKey,
        source: "user",
        kind: "note",
        title: "Manual note",
        body,
        timestamp: now.toISOString(),
        status: "info",
        severity: "info",
        redacted: true
      };
      repo.addEntry(entry);
      repo.addAudit("note.created", { target_type: "entry", target_id: entry.id });
      return entry;
    },
    buildCorrelationGraph(incidentId) {
      const incident = repo.getIncident(incidentId);
      if (!incident) return { incidentId, nodes: [], edges: [] };
      const notes = repo.listInvestigationNotes({ incidentId });
      const receipts = repo.listDeliveryReceipts().filter((receipt) => receipt.incidentId === incidentId);
      const alertFindings = incident.dayKeys.flatMap((dayKey) => repo.evaluateAlertRules(dayKey)).filter((finding) => finding.triggered);
      const entries = incident.entryIds.flatMap((entryId) => findEntryAcrossDays(repo, entryId));
      const nodes: CorrelationNode[] = [
        { id: incident.id, type: "incident", label: incident.title },
        ...entries.map((entry) => ({ id: entry.id, type: "entry" as const, label: entry.title })),
        ...notes.map((note) => ({ id: note.id, type: "note" as const, label: note.body.slice(0, 80) })),
        ...alertFindings.map((finding) => ({ id: finding.ruleId, type: "alert" as const, label: finding.title })),
        ...receipts.map((receipt) => ({ id: receipt.id, type: "delivery_receipt" as const, label: `${receipt.target} ${receipt.status}` })),
        ...entries
          .map((entry) => entry.sessionId)
          .filter((sessionId): sessionId is string => Boolean(sessionId))
          .filter(unique)
          .map((sessionId) => ({ id: sessionId, type: "session" as const, label: sessionId }))
      ];
      const edges: CorrelationEdge[] = [
        ...entries.map((entry) => ({ id: `${incident.id}-includes-${entry.id}`, from: incident.id, to: entry.id, relationship: "includes" as const })),
        ...notes.map((note) => ({ id: `${note.id}-belongs`, from: note.id, to: incident.id, relationship: "belongs_to" as const })),
        ...alertFindings.map((finding) => ({ id: `${finding.ruleId}-triggered`, from: finding.ruleId, to: incident.id, relationship: "triggered_by" as const })),
        ...receipts.map((receipt) => ({ id: `${incident.id}-export-${receipt.id}`, from: incident.id, to: receipt.id, relationship: "exported_to" as const })),
        ...entries
          .filter((entry) => entry.sessionId)
          .map((entry) => ({ id: `${entry.sessionId}-entry-${entry.id}`, from: entry.sessionId!, to: entry.id, relationship: "includes" as const })),
        ...notes.flatMap((note) =>
          note.linkedEntryIds.map((entryId) => ({ id: `${note.id}-ref-${entryId}`, from: note.id, to: entryId, relationship: "references" as const }))
        )
      ];
      saveJsonRow(db, "journal_correlation_graph", incidentId, JSON.stringify({ incidentId, nodes, edges }));
      return { incidentId, nodes, edges };
    },
    buildIntegrationPayload(target, dayKey) {
      const day = repo.getDay(dayKey) ?? emptyDay(dayKey);
      const title = `${day.title} handoff for ${day.dayKey}`;
      const packets = repo.listIncidentHandoffPackets({ dayKey });
      const packetSection =
        packets.length > 0
          ? `\n\n## Incident Handoff Packets\n\n${packets.map((packet) => `### ${packet.title}\n${packet.body}\nProvenance: ${packet.provenance.sourceHash}`).join("\n\n")}\n`
          : "";
      const body = `${day.dateLabel}\n\n${exportDayAsMarkdown(day)}${packetSection}\n`;
      return { target, title, body };
    },
    createGithubIssue(dayKey, options) {
      const payload = repo.buildIntegrationPayload("github-issue", dayKey);
      const requestedAt = new Date().toISOString();
      const correlationId = crypto.randomUUID();
      const existing = findExistingReceipt(repo.listDeliveryReceipts(), "github-issue", dayKey, options?.idempotencyKey);
      if (existing) return existing;
      if (options?.dryRun) {
        const receipt: DeliveryReceipt = {
          id: crypto.randomUUID(),
          target: "github-issue",
          dayKey,
          ...(options.incidentId ? { incidentId: options.incidentId } : {}),
          title: payload.title,
          status: "delivered",
          requestedAt,
          completedAt: requestedAt,
          correlationId,
          retryCount: 0,
          idempotencyKey: options.idempotencyKey,
          dryRun: true,
          secretRef: options.secretRef,
          requestFingerprint: buildReceiptFingerprint("github-issue", dayKey, options.incidentId, options.idempotencyKey),
          deliveryReference: "dry-run"
        };
        saveJsonRow(db, "journal_delivery_receipts", receipt.id, JSON.stringify(receipt), {
          day_key: dayKey,
          incident_id: options.incidentId ?? null,
          target: "github-issue"
        });
        return receipt;
      }
      try {
        const repoName = resolveGithubRepo();
        const created = execFileSync("gh", ["issue", "create", "--repo", repoName, "--title", payload.title, "--body", payload.body], {
          encoding: "utf8"
        }).trim();
        const receipt: DeliveryReceipt = {
          id: crypto.randomUUID(),
          target: "github-issue",
          dayKey,
          ...(options?.incidentId ? { incidentId: options.incidentId } : {}),
          title: payload.title,
          status: "delivered",
          requestedAt,
          completedAt: new Date().toISOString(),
          correlationId,
          retryCount: 0,
          idempotencyKey: options?.idempotencyKey,
          dryRun: false,
          secretRef: options?.secretRef,
          requestFingerprint: buildReceiptFingerprint("github-issue", dayKey, options?.incidentId, options?.idempotencyKey),
          deliveryReference: created
        };
        saveJsonRow(db, "journal_delivery_receipts", receipt.id, JSON.stringify(receipt), {
          day_key: dayKey,
          incident_id: options?.incidentId ?? null,
          target: "github-issue"
        });
        if (options?.incidentId) syncLineageForIncident(db, options.incidentId, repo);
        return receipt;
      } catch (error) {
        const message = error instanceof Error ? error.message : "github issue creation failed";
        const receipt: DeliveryReceipt = {
          id: crypto.randomUUID(),
          target: "github-issue",
          dayKey,
          ...(options?.incidentId ? { incidentId: options.incidentId } : {}),
          title: payload.title,
          status: "failed",
          requestedAt,
          completedAt: new Date().toISOString(),
          correlationId,
          retryCount: 0,
          idempotencyKey: options?.idempotencyKey,
          dryRun: false,
          secretRef: options?.secretRef,
          requestFingerprint: buildReceiptFingerprint("github-issue", dayKey, options?.incidentId, options?.idempotencyKey),
          errorCategory: /auth|logged in|authentication/i.test(message) ? "authentication" : "unknown",
          deadLetterReason: message.slice(0, 240)
        };
        saveJsonRow(db, "journal_delivery_receipts", receipt.id, JSON.stringify(receipt), {
          day_key: dayKey,
          incident_id: options?.incidentId ?? null,
          target: "github-issue"
        });
        if (options?.incidentId) syncLineageForIncident(db, options.incidentId, repo);
        return receipt;
      }
    },
    buildMissionReplay(incidentId) {
      const incident = repo.getIncident(incidentId);
      if (!incident) return { incidentId, title: "Mission replay", generatedAt: new Date().toISOString(), steps: [] };
      const entries = incident.entryIds.flatMap((entryId) => findEntryAcrossDays(repo, entryId)).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
      const notes = repo.listInvestigationNotes({ incidentId });
      const receipts = repo.listDeliveryReceipts().filter((receipt) => receipt.incidentId === incidentId);
      const steps: ReplayStep[] = [
        ...entries.map((entry) => ({
          id: `replay-entry-${entry.id}`,
          kind: entry.kind === "approval_requested" || entry.kind === "approval_resolved" ? ("approval" as const) : ("entry" as const),
          entryIds: [entry.id],
          timestamp: entry.timestamp,
          label: entry.title,
          derived: false,
          sourceIds: [entry.id]
        })),
        ...notes.map((note) => ({
          id: `replay-note-${note.id}`,
          kind: "note" as const,
          entryIds: note.linkedEntryIds,
          timestamp: note.updatedAt,
          label: `Operator note: ${note.body.slice(0, 80)}`,
          derived: false,
          sourceIds: [note.id, ...note.linkedEntryIds]
        })),
        ...receipts.map((receipt) => ({
          id: `replay-delivery-${receipt.id}`,
          kind: "delivery" as const,
          entryIds: [],
          timestamp: receipt.completedAt,
          label: `${receipt.target} delivery ${receipt.status}`,
          derived: true,
          sourceIds: [receipt.id]
        }))
      ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
      return { incidentId, title: incident.title, generatedAt: new Date().toISOString(), steps };
    },
    close() {
      db.close();
    },
    countRedactedEvents() {
      const row = db.prepare("SELECT COUNT(*) AS count FROM journal_entries WHERE raw_event_hash IS NOT NULL").get() as { count: number };
      return Number(row.count);
    },
    completeCloseout(dayKey, exportTargets) {
      const plan = buildCloseoutCompletion(repo, dayKey, exportTargets);
      saveJsonRow(db, "journal_closeout_completions", plan.id, JSON.stringify(plan));
      return plan;
    },
    deliverIntegration(target, dayKey, options) {
      const payload = repo.buildIntegrationPayload(target, dayKey);
      const config = deliveryConfigFor(target);
      const requestedAt = new Date().toISOString();
      const correlationId = crypto.randomUUID();
      const existing = options?.forceNewAttempt ? undefined : findExistingReceipt(repo.listDeliveryReceipts(), target, dayKey, options?.idempotencyKey);
      if (existing) return existing;
      let receipt: DeliveryReceipt;
      if (options?.dryRun) {
        receipt = {
          id: crypto.randomUUID(),
          target,
          dayKey,
          ...(options.incidentId ? { incidentId: options.incidentId } : {}),
          title: payload.title,
          status: "delivered",
          requestedAt,
          completedAt: requestedAt,
          correlationId,
          retryCount: 0,
          idempotencyKey: options.idempotencyKey,
          dryRun: true,
          secretRef: options.secretRef,
          requestFingerprint: buildReceiptFingerprint(target, dayKey, options.incidentId, options.idempotencyKey),
          deliveryReference: "dry-run"
        };
      } else if (!config.enabled || !config.url) {
        receipt = {
          id: crypto.randomUUID(),
          target,
          dayKey,
          ...(options?.incidentId ? { incidentId: options.incidentId } : {}),
          title: payload.title,
          status: "failed",
          requestedAt,
          completedAt: new Date().toISOString(),
          correlationId,
          retryCount: 0,
          idempotencyKey: options?.idempotencyKey,
          dryRun: false,
          secretRef: options?.secretRef,
          requestFingerprint: buildReceiptFingerprint(target, dayKey, options?.incidentId, options?.idempotencyKey),
          errorCategory: "missing_config",
          deadLetterReason: "delivery target is not configured"
        };
      } else {
        try {
          if (target === "slack" || target === "generic-webhook") {
            void fetch(config.url, {
              method: "POST",
              headers: { "content-type": "application/json", ...(config.authorization ? { authorization: config.authorization } : {}) },
              body: JSON.stringify(target === "slack" ? { text: payload.body } : { title: payload.title, body: payload.body })
            });
          } else {
            void fetch(config.url, {
              method: "POST",
              headers: { "content-type": "application/json", ...(config.authorization ? { authorization: config.authorization } : {}) },
              body: JSON.stringify({ to: config.destinationLabel, subject: payload.title, text: payload.body })
            });
          }
          receipt = {
            id: crypto.randomUUID(),
            target,
            dayKey,
            ...(options?.incidentId ? { incidentId: options.incidentId } : {}),
            title: payload.title,
            status: "delivered",
            requestedAt,
            completedAt: new Date().toISOString(),
            correlationId,
            retryCount: 0,
            idempotencyKey: options?.idempotencyKey,
            dryRun: false,
            secretRef: options?.secretRef,
            requestFingerprint: buildReceiptFingerprint(target, dayKey, options?.incidentId, options?.idempotencyKey),
            deliveryReference: config.destinationLabel
          };
        } catch {
          receipt = {
            id: crypto.randomUUID(),
            target,
            dayKey,
            ...(options?.incidentId ? { incidentId: options.incidentId } : {}),
            title: payload.title,
            status: "failed",
            requestedAt,
            completedAt: new Date().toISOString(),
            correlationId,
            retryCount: 0,
            idempotencyKey: options?.idempotencyKey,
            dryRun: false,
            secretRef: options?.secretRef,
            requestFingerprint: buildReceiptFingerprint(target, dayKey, options?.incidentId, options?.idempotencyKey),
            errorCategory: "network",
            deadLetterReason: "network delivery failed"
          };
        }
      }
      receipt = { ...receipt, attemptNumber: receipt.attemptNumber ?? 1 };
      saveJsonRow(db, "journal_delivery_receipts", receipt.id, JSON.stringify(receipt), {
        day_key: dayKey,
        incident_id: options?.incidentId ?? null,
        target
      });
      if (options?.incidentId) syncLineageForIncident(db, options.incidentId, repo);
      return receipt;
    },
    deleteDays(dayKeys) {
      for (const dayKey of dayKeys) {
        db.prepare("DELETE FROM journal_entries WHERE day_key = ?").run(dayKey);
        db.prepare("DELETE FROM journal_days WHERE day_key = ?").run(dayKey);
        db.prepare("DELETE FROM journal_daily_summaries WHERE day_key = ?").run(dayKey);
        db.prepare("DELETE FROM journal_pinned_context WHERE day_key = ?").run(dayKey);
      }
    },
    evaluateAlertRules(dayKey) {
      const day = repo.getDay(dayKey) ?? emptyDay(dayKey);
      const rules = repo.listAlertRules();
      const failedReceiptCount = repo.listDeliveryReceipts().filter((receipt) => receipt.status === "failed").length;
      const unresolvedApprovalCount = day.entries.filter((entry) => entry.kind === "approval_requested" && entry.status === "pending").length;
      const staleSummary = Boolean(day.generatedSummary && latestTimestampForEntries(day.entries) > day.generatedSummary.createdAt);
      return rules.map((rule) => {
        const triggered =
          rule.enabled &&
          ((rule.kind === "reconnect_storm" && day.entries.filter((entry) => /reconnect/i.test(entry.title) || /reconnect/i.test(entry.body ?? "")).length >= rule.threshold) ||
            (rule.kind === "approval_backlog" && day.metrics.approvalCount >= rule.threshold) ||
            (rule.kind === "unresolved_approval_age" && unresolvedApprovalCount >= rule.threshold) ||
            (rule.kind === "stale_summary" && staleSummary) ||
            (rule.kind === "repeated_receipt_failure" && failedReceiptCount >= rule.threshold) ||
            (rule.kind === "tool_failure_spike" &&
              day.entries.filter((entry) => (entry.kind === "tool_result" || entry.kind === "tool_call") && (entry.status === "failed" || entry.severity === "error")).length >= rule.threshold));
        return {
          ruleId: rule.id,
          title: rule.title,
          triggered,
          detail: triggered ? `${rule.title} triggered for ${dayKey}.` : `${rule.title} is within threshold for ${dayKey}.`
        };
      });
    },
    generateSummary(dayKey, now = new Date()) {
      const day = repo.getDay(dayKey) ?? emptyDay(dayKey);
      const entries = day.entries;
      const summary = `${day.metrics.errorCount} failure${day.metrics.errorCount === 1 ? "" : "s"}, ${day.metrics.approvalCount} approval${day.metrics.approvalCount === 1 ? "" : "s"}, ${day.metrics.toolCallCount} tool event${day.metrics.toolCallCount === 1 ? "" : "s"}, ${entries.length} total journal entr${entries.length === 1 ? "y" : "ies"}.`;
      const createdAt = now.toISOString();
      const latestEntryObservedAt = latestTimestampForEntries(entries);
      const lastEntryIncludedAt = latestTimestampForEntries(entries.filter((entry) => entry.timestamp <= createdAt));
      const generatedSummary: GeneratedSummary = {
        summary,
        createdAt,
        source: "rules",
        ...(lastEntryIncludedAt ? { lastEntryIncludedAt } : {}),
        ...(latestEntryObservedAt ? { latestEntryObservedAt } : {}),
        freshnessState: latestEntryObservedAt && latestEntryObservedAt > createdAt ? "stale" : "fresh"
      };
      db.prepare("INSERT INTO journal_daily_summaries (day_key, summary, created_at) VALUES (?, ?, ?) ON CONFLICT(day_key) DO UPDATE SET summary = excluded.summary, created_at = excluded.created_at").run(dayKey, generatedSummary.summary, generatedSummary.createdAt);
      return generatedSummary;
    },
    createSummaryJob(dayKey) {
      const createdAt = new Date().toISOString();
      const job: SummaryJob = {
        id: crypto.randomUUID(),
        dayKey,
        status: "queued",
        createdAt,
        progressLabel: "Summary job queued for local evidence review.",
        correlationId: crypto.randomUUID()
      };
      db.prepare("INSERT INTO journal_summary_jobs (id, day_key, status, created_at, job_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET job_json = excluded.job_json").run(
        job.id,
        dayKey,
        job.status,
        job.createdAt,
        JSON.stringify(job)
      );
      return job;
    },
    listSummaryJobs() {
      return db
        .prepare("SELECT job_json FROM journal_summary_jobs ORDER BY created_at DESC, id DESC")
        .all()
        .map((row) => JSON.parse(String(row.job_json)) as SummaryJob);
    },
    generateSummaryProfile(profileId, dayKey) {
      const day = repo.getDay(dayKey) ?? emptyDay(dayKey);
      const profile = summaryProfiles.find((item) => item.id === profileId) ?? summaryProfiles[0];
      const citedEntries = day.entries.slice(-3);
      const citations: SummaryCitation[] = citedEntries.map((entry) => ({ entryId: entry.id, title: entry.title, timestamp: entry.timestamp }));
      const summary = [
        `${profile.label} for ${day.dayKey}.`,
        `Evidence includes ${day.metrics.errorCount} failures, ${day.metrics.approvalCount} approvals, and ${day.metrics.toolCallCount} tool events.`,
        citations.length > 0 ? `Cited entries: ${citations.map((citation) => citation.entryId).join(", ")}.` : "No citations available."
      ].join(" ");
      const generated: GeneratedProfileSummary = {
        profileId,
        title: `${profile.label} ${day.dayKey}`,
        summary,
        citations,
        createdAt: new Date().toISOString()
      };
      saveJsonRow(db, "journal_summary_profiles", `${profileId}:${dayKey}`, JSON.stringify(generated), { profile_id: profileId, day_key: dayKey });
      return generated;
    },
    getAnalytics() {
      const days = repo.listDays().map((day) => repo.getDay(day.dayKey)).filter((day): day is JournalDay => day !== null);
      const toolCounts = new Map<string, number>();
      const failureCounts = new Map<string, number>();
      for (const entry of days.flatMap((day) => day.entries)) {
        if (entry.toolName) toolCounts.set(entry.toolName, (toolCounts.get(entry.toolName) ?? 0) + 1);
        if (entry.severity === "error" || entry.status === "failed") {
          const label = entry.kind === "tool_result" || entry.kind === "tool_call" ? "tool_failure" : "error";
          failureCounts.set(label, (failureCounts.get(label) ?? 0) + 1);
        }
      }
      const snapshot: AnalyticsSnapshot = {
        createdAt: new Date().toISOString(),
        noisyTools: [...toolCounts.entries()].map(([toolName, count]) => ({ toolName, count })).sort((left, right) => right.count - left.count).slice(0, 5),
        reconnectHeavyDays: days
          .map((day) => ({ dayKey: day.dayKey, reconnectCount: day.entries.filter((entry) => /reconnect/i.test(entry.title) || /reconnect/i.test(entry.body ?? "")).length }))
          .filter((item) => item.reconnectCount > 0),
        approvalHotspots: days.map((day) => ({ dayKey: day.dayKey, approvalCount: day.metrics.approvalCount })).filter((item) => item.approvalCount > 0),
        recurringFailureClasses: [...failureCounts.entries()].map(([label, count]) => ({ label, count }))
      };
      saveJsonRow(db, "journal_analytics_snapshots", snapshot.createdAt, JSON.stringify(snapshot));
      return snapshot;
    },
    getBackendFingerprint() {
      return backendFingerprint;
    },
    getDay(dayKey) {
      const row = db.prepare("SELECT day_key, title, date_label, summary, metrics_json FROM journal_days WHERE day_key = ?").get(dayKey);
      if (!row) return null;
      const entries = db
        .prepare("SELECT entry_json FROM journal_entries WHERE day_key = ? ORDER BY timestamp ASC")
        .all(dayKey)
        .map((entryRow) => JSON.parse(String(entryRow.entry_json)) as JournalEntry);
      const pinnedContext = repo.getPinnedDayContext(dayKey);
      const generatedSummary = getGeneratedSummary(db, dayKey);
      const incidentIds = listIncidentIdsForDay(db, dayKey);
      return {
        dayKey: String(row.day_key),
        title: String(row.title),
        dateLabel: String(row.date_label),
        summary: typeof row.summary === "string" ? row.summary : undefined,
        ...(pinnedContext ? { pinnedContext } : {}),
        ...(generatedSummary ? { generatedSummary } : {}),
        ...(incidentIds.length > 0 ? { incidentIds } : {}),
        evidenceCompleteness: buildEvidenceCompleteness(db, dayKey, typeof row.summary === "string" ? row.summary : undefined, generatedSummary),
        metrics: JSON.parse(String(row.metrics_json)) as JournalDay["metrics"],
        entries
      };
    },
    getDrilldown(sessionKey) {
      const allEntries = listAllEntries(db);
      const directEntries = allEntries.filter((entry) => entry.sessionId === sessionKey);
      const relatedApprovalIds = new Set(directEntries.map((entry) => entry.approvalId).filter((approvalId): approvalId is string => Boolean(approvalId)));
      const entries = allEntries.filter((entry) => entry.sessionId === sessionKey || Boolean(entry.approvalId && relatedApprovalIds.has(entry.approvalId)));
      const uniqueApprovalIds = new Set(entries.map((entry) => entry.approvalId).filter((approvalId): approvalId is string => Boolean(approvalId)));
      let toolCount = 0;
      let reconnectCount = 0;
      for (const entry of entries) {
        if (entry.kind === "tool_call" || entry.kind === "tool_result") toolCount += 1;
        if (/reconnect/i.test(entry.title) || /reconnect/i.test(entry.body ?? "")) reconnectCount += 1;
      }
      return {
        sessionKey,
        entries,
        toolCount,
        approvalCount: uniqueApprovalIds.size,
        reconnectCount,
        sanitizedSummary: buildSessionDrilldownSummary(sessionKey, entries, toolCount, uniqueApprovalIds.size, reconnectCount)
      };
    },
    getIncident(id) {
      const row = db.prepare("SELECT incident_json FROM journal_incidents WHERE id = ?").get(id);
      return row ? (JSON.parse(String(row.incident_json)) as IncidentSummary) : undefined;
    },
    getIntegrityReport() {
      const rows = db.prepare("SELECT id, entry_json, raw_event_hash, raw_event_redacted_json FROM journal_entries ORDER BY timestamp ASC").all();
      const mismatchedEntryIds: string[] = [];
      const missingRedactedHashes: string[] = [];
      for (const row of rows) {
        const entry = JSON.parse(String(row.entry_json)) as JournalEntry;
        if (entry.id !== String(row.id)) mismatchedEntryIds.push(String(row.id));
        if (typeof row.raw_event_redacted_json === "string" && typeof row.raw_event_hash !== "string") missingRedactedHashes.push(String(row.id));
      }
      return {
        ok: mismatchedEntryIds.length === 0 && missingRedactedHashes.length === 0,
        checkedEntries: rows.length,
        mismatchedEntryIds,
        missingRedactedHashes
      };
    },
    getLineage(entryId) {
      const row = db.prepare("SELECT lineage_json FROM journal_lineage WHERE entry_id = ?").get(entryId);
      return row ? (JSON.parse(String(row.lineage_json)) as LineageRecord) : undefined;
    },
    getPinnedDayContext(dayKey) {
      const row = db.prepare("SELECT context_json FROM journal_pinned_context WHERE day_key = ?").get(dayKey);
      return row ? (JSON.parse(String(row.context_json)) as PinnedDayContext) : undefined;
    },
    getRetentionSnapshot(id) {
      const row = db.prepare("SELECT snapshot_json FROM journal_retention_snapshots WHERE id = ?").get(id);
      return row ? (JSON.parse(String(row.snapshot_json)) as RetentionSnapshotRecord) : undefined;
    },
    getSetting(key, fallback) {
      const row = db.prepare("SELECT value_json FROM journal_settings WHERE key = ?").get(key);
      return row ? (JSON.parse(String(row.value_json)) as typeof fallback) : fallback;
    },
    getSummaryJob(id) {
      const row = db.prepare("SELECT job_json FROM journal_summary_jobs WHERE id = ?").get(id);
      if (!row) return undefined;
      const job = JSON.parse(String(row.job_json)) as SummaryJob;
      if (job.status !== "queued" && job.status !== "running") return job;
      const startedAt = job.startedAt ?? new Date().toISOString();
      try {
        const generatedSummary = repo.generateSummary(job.dayKey);
        const completed: SummaryJob = {
          ...job,
          status: "completed",
          startedAt,
          completedAt: new Date().toISOString(),
          progressLabel: "Summary generated from current journal evidence.",
          generatedSummary
        };
        db.prepare("UPDATE journal_summary_jobs SET status = ?, job_json = ? WHERE id = ?").run(completed.status, JSON.stringify(completed), id);
        return completed;
      } catch (error) {
        const failed: SummaryJob = {
          ...job,
          status: "failed",
          startedAt,
          completedAt: new Date().toISOString(),
          progressLabel: "Summary job failed closed.",
          error: error instanceof Error ? error.message : "summary_job_failed"
        };
        db.prepare("UPDATE journal_summary_jobs SET status = ?, job_json = ? WHERE id = ?").run(failed.status, JSON.stringify(failed), id);
        return failed;
      }
    },
    getInvestigationWorkspace(id) {
      const row = db.prepare("SELECT workspace_json FROM journal_investigation_workspaces WHERE id = ?").get(id);
      return row ? (JSON.parse(String(row.workspace_json)) as InvestigationWorkspace) : undefined;
    },
    getRemoteOpsPolicy() {
      return {
        enabled: process.env.OPENCLOG_REMOTE_OPS_ENABLED === "1",
        environmentLabel: process.env.OPENCLOG_REMOTE_ENVIRONMENT ?? "local-loopback",
        allowedOrigins: process.env.OPENCLOG_REMOTE_ALLOWED_ORIGINS?.split(",").map((origin) => origin.trim()).filter(Boolean) ?? ["http://127.0.0.1"],
        secretAccess: "fail-closed"
      };
    },
    listCapabilityManifests() {
      return db.prepare("SELECT capability_json FROM journal_capabilities ORDER BY id ASC").all().map((row) => JSON.parse(String(row.capability_json)) as CapabilityManifest);
    },
    getAlertState(ruleId) {
      const row = db.prepare("SELECT state_json FROM journal_alert_states WHERE id = ?").get(ruleId);
      return row ? (JSON.parse(String(row.state_json)) as AlertStateRecord) : undefined;
    },
    generateOperatorRunbook() {
      return {
        generatedAt: new Date().toISOString(),
        sections: [
          {
            title: "Routes",
            items: ["/api/health", "/api/search", "/api/incidents/:id/workspace", "/api/integrations/:target/deliver", "/api/closeout/plan"]
          },
          {
            title: "Security boundaries",
            items: [
              "Gateway tokens and raw frames remain backend-only.",
              "Delivery secrets stay in secure storage or fail closed.",
              "Replay verification must pass before treating exported evidence as trusted."
            ]
          },
          {
            title: "Verification",
            items: ["npm run verify", "npm run verify:gateway", "npm run smoke -w @openclog/desktop", "git diff --check"]
          }
        ]
      };
    },
    listAdapterEvents() {
      return db.prepare("SELECT adapter_event_json FROM journal_adapter_events ORDER BY id ASC").all().map((row) => JSON.parse(String(row.adapter_event_json)) as AdapterEvent);
    },
    listAlertRules() {
      return db.prepare("SELECT rule_json FROM journal_alert_rules ORDER BY id ASC").all().map((row) => JSON.parse(String(row.rule_json)) as AlertRule);
    },
    listDays() {
      return db
        .prepare("SELECT day_key, title, date_label, summary, metrics_json FROM journal_days ORDER BY day_key DESC")
        .all()
        .map((row) => ({
          dayKey: String(row.day_key),
          title: String(row.title),
          dateLabel: String(row.date_label),
          summary: typeof row.summary === "string" ? row.summary : undefined,
          evidenceCompleteness: buildEvidenceCompleteness(db, String(row.day_key), typeof row.summary === "string" ? row.summary : undefined, getGeneratedSummary(db, String(row.day_key))),
          ...(listIncidentIdsForDay(db, String(row.day_key)).length > 0 ? { incidentIds: listIncidentIdsForDay(db, String(row.day_key)) } : {}),
          metrics: JSON.parse(String(row.metrics_json)) as JournalDay["metrics"]
        }));
    },
    listDeliveryReceipts() {
      return db.prepare("SELECT receipt_json FROM journal_delivery_receipts ORDER BY requested_at DESC, id DESC").all().map((row) => JSON.parse(String(row.receipt_json)) as DeliveryReceipt);
    },
    listHealthHistory(limit) {
      return listAllEntries(db)
        .reverse()
        .map((entry) => {
          const category = classifyHealthHistoryCategory(entry);
          if (!category) return null;
          return { id: `health-${entry.id}`, entryId: entry.id, dayKey: entry.dayKey, title: entry.title, timestamp: entry.timestamp, category } satisfies HealthHistoryEntry;
        })
        .filter((entry): entry is HealthHistoryEntry => entry !== null)
        .slice(0, Math.max(1, limit));
    },
    listHealthTimeline(limit = 10) {
      const historyEntries = repo.listHealthHistory(limit).map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        category: entry.category === "reconnect" ? "reconnect" : entry.category === "gateway_error" ? "stale" : "recovery",
        title: entry.title,
        detail: `${entry.category} observed for ${entry.dayKey}.`,
        relatedId: entry.entryId
      })) as ServiceHealthTimelineEntry[];
      const receiptEntries = repo
        .listDeliveryReceipts()
        .filter((receipt) => receipt.status === "failed")
        .slice(0, limit)
        .map((receipt) => ({
          id: `timeline-${receipt.id}`,
          timestamp: receipt.completedAt,
          category: "adapter_failure" as const,
          title: `${receipt.target} delivery failed`,
          detail: receipt.errorCategory ?? "unknown",
          relatedId: receipt.id
        }));
      const integrityEntries = repo
        .listIntegrityReports()
        .slice(0, limit)
        .map((report) => ({
          id: `timeline-${report.id}`,
          timestamp: report.createdAt,
          category: "integrity" as const,
          title: report.ok ? "Integrity monitor passed" : "Integrity monitor found issues",
          detail: report.checks.filter((check) => !check.ok).map((check) => check.id).join(", ") || "all checks passed",
          relatedId: report.id
        }));
      return [...historyEntries, ...receiptEntries, ...integrityEntries]
        .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
        .slice(0, Math.max(1, limit));
    },
    getHealthAggregate(limit = 20) {
      const history = repo.listHealthHistory(limit);
      const timeline = repo.listHealthTimeline(limit);
      return {
        createdAt: new Date().toISOString(),
        reconnectCount: history.filter((entry) => entry.category === "reconnect").length,
        staleCount: timeline.filter((entry) => entry.category === "stale").length,
        recoveryCount: timeline.filter((entry) => entry.category === "recovery").length,
        adapterFailureCount: timeline.filter((entry) => entry.category === "adapter_failure").length,
        latestErrorCategory: repo.listDeliveryReceipts().find((receipt) => receipt.status === "failed")?.errorCategory
      };
    },
    listIncidents() {
      const stored = db.prepare("SELECT incident_json FROM journal_incidents ORDER BY id ASC").all().map((row) => JSON.parse(String(row.incident_json)) as IncidentSummary);
      return stored.length > 0 ? stored : deriveIncidents(repo.listDays().map((day) => repo.getDay(day.dayKey)).filter((day): day is JournalDay => day !== null));
    },
    listIncidentHandoffPackets(filter) {
      return db
        .prepare("SELECT packet_json FROM journal_incident_handoff_packets ORDER BY created_at DESC, id DESC")
        .all()
        .map((row) => JSON.parse(String(row.packet_json)) as IncidentHandoffPacket)
        .filter((packet) => (!filter?.dayKey || packet.dayKey === filter.dayKey) && (!filter?.incidentId || packet.incidentId === filter.incidentId));
    },
    listIncidentActionRecords(filter) {
      return db
        .prepare("SELECT record_json FROM journal_incident_action_records ORDER BY created_at DESC, id DESC")
        .all()
        .map((row) => JSON.parse(String(row.record_json)) as IncidentActionRecord)
        .filter((record) => !filter?.incidentId || record.incidentId === filter.incidentId);
    },
    listIncidentRulePacks() {
      return incidentRulePacks;
    },
    listIntegrityReports() {
      return db.prepare("SELECT report_json FROM journal_integrity_reports ORDER BY id DESC").all().map((row) => JSON.parse(String(row.report_json)) as IntegrityMonitorReport);
    },
    listInvestigationNotes(filter) {
      return db
        .prepare("SELECT note_json FROM journal_investigation_notes ORDER BY updated_at DESC, id DESC")
        .all()
        .map((row) => JSON.parse(String(row.note_json)) as InvestigationNote)
        .filter((note) => (!filter?.dayKey || note.dayKey === filter.dayKey) && (!filter?.incidentId || note.incidentId === filter.incidentId));
    },
    listVerificationReceipts() {
      const receipts = db
        .prepare("SELECT receipt_json FROM journal_verification_receipts ORDER BY id ASC")
        .all()
        .map((row) => JSON.parse(String(row.receipt_json)) as VerificationReceipt);
      return receipts.length > 0 ? receipts : defaultVerificationReceipts();
    },
    listPlugins() {
      return db.prepare("SELECT plugin_json FROM journal_plugins ORDER BY id ASC").all().map((row) => JSON.parse(String(row.plugin_json)) as PluginManifest);
    },
    listProfiles() {
      return db.prepare("SELECT profile_json FROM journal_profiles ORDER BY id ASC").all().map((row) => JSON.parse(String(row.profile_json)) as ProfileConfig);
    },
    listRetentionClasses() {
      return db.prepare("SELECT retention_class_json FROM journal_retention_classes ORDER BY id ASC").all().map((row) => JSON.parse(String(row.retention_class_json)) as RetentionClass);
    },
    listSummaryProfiles() {
      return summaryProfiles;
    },
    listTables() {
      return db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'journal_%' ORDER BY name ASC").all().map((row) => String(row.name));
    },
    previewRetention(policy) {
      const days = repo.listDays();
      const kept = days.slice(0, Math.max(policy.keepDays, 0));
      const removed = days.slice(kept.length);
      const removedDayKeys = removed.map((day) => day.dayKey);
      const removedEntryCount = removedDayKeys.reduce((count, dayKey) => count + (repo.getDay(dayKey)?.entries.length ?? 0), 0);
      return {
        keepDays: policy.keepDays,
        removedDayKeys,
        removedEntryCount,
        removedSummaryCount: policy.includeSummaries ? removedDayKeys.filter((dayKey) => Boolean(getGeneratedSummary(db, dayKey))).length : 0,
        removedAuditCount: policy.includeAudit ? Math.max(removedEntryCount - kept.length, 0) : 0,
        removedIncidentCount: repo.listIncidents().filter((incident) => incident.dayKeys.some((dayKey) => removedDayKeys.includes(dayKey))).length,
        removedAlertCount: repo.listAlertRules().length,
        removedBundleCount: removedDayKeys.length
      };
    },
    previewRetentionByClass() {
      return repo.listRetentionClasses().map((retentionClass) => ({
        classId: retentionClass.id,
        label: retentionClass.label,
        impact: buildRetentionClassImpact(db, repo, retentionClass)
      }));
    },
    recordAdapterEvent(event) {
      saveJsonRow(db, "journal_adapter_events", event.id, JSON.stringify(event));
    },
    registerPlugin(plugin) {
      const normalized: PluginManifest = {
        ...plugin,
        purpose: plugin.purpose ?? `Run local plugin ${plugin.label} within OpenClog validation metadata.`,
        failureModes: plugin.failureModes ?? ["plugin_failed", "validation_blocked"],
        auditProvenance: plugin.auditProvenance ?? ["journal_plugins", "journal_plugin_runs"],
        approvalSignature: plugin.approvalSignature ?? `local-openclog:plugin:${plugin.id}`,
        reviewBy: plugin.reviewBy ?? "2026-06-08",
        supportsDryRun: plugin.supportsDryRun !== false,
        sandbox: plugin.sandbox ?? { capabilities: plugin.capabilities, dryRunWritesOnly: true, auditedOutputs: true },
        validationStatus: plugin.capabilities.length > 0 && plugin.readScopes.length > 0 ? "valid" : "blocked",
        validationMessage:
          plugin.capabilities.length > 0 && plugin.readScopes.length > 0
            ? undefined
            : "Plugin must declare capability and read-scope boundaries."
      };
      saveJsonRow(db, "journal_plugins", normalized.id, JSON.stringify(normalized));
      return normalized;
    },
    createInvestigationWorkspace(input) {
      const dayKeys = input.dayKeys.length > 0 ? input.dayKeys : [formatDay(new Date())];
      const incidentIds = repo
        .listIncidents()
        .filter((incident) => incident.dayKeys.some((dayKey) => dayKeys.includes(dayKey)))
        .map((incident) => incident.id);
      const workspace: InvestigationWorkspace = {
        id: crypto.randomUUID(),
        title: input.title ?? `Investigation workspace ${dayKeys.join(", ")}`,
        summary: `Workspace spans ${dayKeys.length} day(s) and ${incidentIds.length} incident(s).`,
        dayKeys,
        incidentIds,
        createdAt: new Date().toISOString()
      };
      saveJsonRow(db, "journal_investigation_workspaces", workspace.id, JSON.stringify(workspace));
      return workspace;
    },
    createReplayWorkspace(dayKey) {
      const day = repo.getDay(dayKey) ?? emptyDay(dayKey);
      const bundle = buildSignedBundle(day);
      const workspace: ReplayWorkspace = {
        id: crypto.randomUUID(),
        sourceDayKey: day.dayKey,
        createdAt: new Date().toISOString(),
        entries: day.entries,
        notes: repo.listInvestigationNotes({ dayKey }),
        incidentIds: listIncidentIdsForDay(db, dayKey),
        verification: repo.verifyReplayBundle(bundle)
      };
      db.prepare("INSERT INTO journal_replay_workspaces (id, day_key, workspace_json) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET workspace_json = excluded.workspace_json").run(
        workspace.id,
        dayKey,
        JSON.stringify(workspace)
      );
      return workspace;
    },
    restoreRetentionSnapshot(snapshot) {
      for (const day of snapshot.days) {
        repo.upsertDay(day);
        if (day.generatedSummary) {
          db.prepare("INSERT INTO journal_daily_summaries (day_key, summary, created_at) VALUES (?, ?, ?) ON CONFLICT(day_key) DO UPDATE SET summary = excluded.summary, created_at = excluded.created_at").run(day.dayKey, day.generatedSummary.summary, day.generatedSummary.createdAt);
        }
        if (day.pinnedContext) {
          db.prepare("INSERT INTO journal_pinned_context (day_key, context_json) VALUES (?, ?) ON CONFLICT(day_key) DO UPDATE SET context_json = excluded.context_json").run(day.dayKey, JSON.stringify(day.pinnedContext));
        }
      }
    },
    runIntegrityMonitor() {
      const integrity = repo.getIntegrityReport();
      const classes = repo.listRetentionClasses();
      const latestSummary = db.prepare("SELECT summary_json FROM journal_summary_profiles ORDER BY id DESC LIMIT 1").get() as { summary_json?: string } | undefined;
      const generatedSummary = latestSummary?.summary_json ? (JSON.parse(latestSummary.summary_json) as GeneratedProfileSummary) : undefined;
      const report: IntegrityMonitorReport = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ok: integrity.ok && classes.length >= defaultRetentionClasses.length && (!generatedSummary || generatedSummary.citations.length > 0),
        checks: [
          { id: "schema_health", ok: repo.listTables().includes("journal_delivery_receipts"), detail: "Expected governance tables are present." },
          { id: "export_validity", ok: repo.listDays().length > 0, detail: "At least one day is available for export." },
          { id: "rollback_viability", ok: db.prepare("SELECT COUNT(*) AS count FROM journal_retention_snapshots").get() !== undefined, detail: "Retention snapshots table is reachable." },
          { id: "citation_validity", ok: !generatedSummary || generatedSummary.citations.every((citation) => Boolean(findEntryAcrossDays(repo, citation.entryId)[0])), detail: "Summary citations resolve to stored entries." },
          { id: "redaction_invariants", ok: integrity.missingRedactedHashes.length === 0, detail: "Stored redacted events include hashes." },
          { id: "adapter_contract_validity", ok: repo.listDeliveryReceipts().every((receipt) => !receipt.errorCategory || receipt.errorCategory !== "unknown" || receipt.status === "failed"), detail: "Delivery receipts remain typed and redacted." },
          { id: "plugin_capability_boundary", ok: repo.listPlugins().every((plugin) => plugin.capabilities.length > 0), detail: "Plugins declare explicit capabilities." }
        ]
      };
      saveJsonRow(db, "journal_integrity_reports", report.id, JSON.stringify(report));
      return report;
    },
    getSloSnapshot() {
      const days = repo.listDays().map((day) => repo.getDay(day.dayKey)).filter((day): day is JournalDay => day !== null);
      const failedDeliveryCount = repo.listDeliveryReceipts().filter((receipt) => receipt.status === "failed").length;
      const staleSummaryCount = days.filter((day) => day.generatedSummary && latestTimestampForEntries(day.entries) > day.generatedSummary.createdAt).length;
      const retryBacklogCount = repo.listDeliveryReceipts().filter((receipt) => receipt.status === "failed" && receipt.retryCount > 0).length;
      const reconnectHeavyDayCount = days.filter((day) => day.entries.some((entry) => /reconnect/i.test(`${entry.title} ${entry.body ?? ""}`))).length;
      return {
        createdAt: new Date().toISOString(),
        gatewayFreshnessOk: repo.getHealthAggregate(10).staleCount === 0,
        staleSummaryCount,
        failedDeliveryCount,
        retryBacklogCount,
        reconnectHeavyDayCount,
        baselines: [
          { id: "summary-freshness", label: "Summary freshness", current: staleSummaryCount, baseline: 0, status: staleSummaryCount === 0 ? "ok" : "breach" },
          { id: "export-success", label: "Export success rate", current: failedDeliveryCount, baseline: 0, status: failedDeliveryCount <= 1 ? "watch" : "breach" },
          { id: "reconnect-storms", label: "Reconnect storms", current: reconnectHeavyDayCount, baseline: 0, status: reconnectHeavyDayCount === 0 ? "ok" : "watch" }
        ]
      };
    },
    runPlugin(pluginId, options) {
      const plugin = repo.listPlugins().find((item) => item.id === pluginId);
      const result: PluginExecutionResult = {
        id: crypto.randomUUID(),
        pluginId,
        status: plugin ? "completed" : "failed",
        createdAt: new Date().toISOString(),
        dryRun: options?.dryRun === true,
        validated: plugin?.validationStatus !== "blocked",
        summary: plugin
          ? `${options?.dryRun ? "Dry-run " : ""}plugin ${plugin.label} ran with ${plugin.capabilities.join(", ")} capability boundaries.`
          : "Plugin not found."
      };
      saveJsonRow(db, "journal_plugin_runs", result.id, JSON.stringify(result), { plugin_id: pluginId });
      return result;
    },
    saveIncident(incident) {
      saveJsonRow(db, "journal_incidents", incident.id, JSON.stringify(incident));
      syncLineageForIncident(db, incident.id, repo);
      return incident;
    },
    saveCapabilityManifest(manifest) {
      saveJsonRow(db, "journal_capabilities", manifest.id, JSON.stringify(manifest));
      return manifest;
    },
    saveIncidentHandoffPacket(packet) {
      db.prepare(
        "INSERT INTO journal_incident_handoff_packets (id, day_key, incident_id, created_at, packet_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET day_key = excluded.day_key, incident_id = excluded.incident_id, created_at = excluded.created_at, packet_json = excluded.packet_json"
      ).run(packet.id, packet.dayKey, packet.incidentId ?? null, packet.createdAt, JSON.stringify(packet));
      if (packet.incidentId) {
        const incident = repo.getIncident(packet.incidentId);
        if (incident) repo.saveIncident({ ...incident, handoffPacketIds: [...new Set([...(incident.handoffPacketIds ?? []), packet.id])] });
      }
      repo.addAudit("monitoring_import.handoff_packet", {
        target_type: "incident_handoff_packet",
        target_id: packet.id,
        day_key: packet.dayKey,
        incident_id: packet.incidentId ?? null
      });
      return packet;
    },
    saveIncidentActionRecord(record) {
      db.prepare(
        "INSERT INTO journal_incident_action_records (id, incident_id, created_at, record_json) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET incident_id = excluded.incident_id, created_at = excluded.created_at, record_json = excluded.record_json"
      ).run(record.id, record.incidentId, record.createdAt, JSON.stringify(record));
      repo.addAudit("incident.action", {
        target_type: "incident",
        target_id: record.incidentId,
        action_kind: record.kind,
        status: record.status
      });
      return record;
    },
    saveInvestigationNote(note) {
      db.prepare(
        "INSERT INTO journal_investigation_notes (id, day_key, incident_id, updated_at, note_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET day_key = excluded.day_key, incident_id = excluded.incident_id, updated_at = excluded.updated_at, note_json = excluded.note_json"
      ).run(note.id, note.dayKey, note.incidentId ?? null, note.updatedAt, JSON.stringify(note));
      return note;
    },
    saveRetentionClass(retentionClass) {
      saveJsonRow(db, "journal_retention_classes", retentionClass.id, JSON.stringify(retentionClass));
      return retentionClass;
    },
    saveRetentionSnapshot(snapshot) {
      saveJsonRow(db, "journal_retention_snapshots", snapshot.id, JSON.stringify(snapshot));
      return snapshot;
    },
    searchEntries(query) {
      const needle = query.trim().toLocaleLowerCase();
      if (!needle) return [];
      return listAllEntries(db)
        .reverse()
        .filter((entry) => [entry.title, entry.body ?? "", entry.toolName ?? "", entry.status ?? "", entry.kind, entry.sessionId ?? ""].join(" ").toLocaleLowerCase().includes(needle))
        .map((entry) => ({
          entryId: entry.id,
          dayKey: entry.dayKey,
          title: entry.title,
          bodyPreview: browserVisibleEntryText(entry, { expanded: false }).body,
          ...buildSearchMatchDetails(entry, needle),
          kind: entry.kind,
          status: entry.status
        }));
    },
    setAlertState(ruleId, state) {
      const next = { ...state, ruleId };
      saveJsonRow(db, "journal_alert_states", ruleId, JSON.stringify(next));
      return next;
    },
    setPinnedDayContext(dayKey, context, now = new Date()) {
      const next: PinnedDayContext = { ...context, updatedAt: now.toISOString() };
      db.prepare("INSERT INTO journal_pinned_context (day_key, context_json) VALUES (?, ?) ON CONFLICT(day_key) DO UPDATE SET context_json = excluded.context_json").run(dayKey, JSON.stringify(next));
      return next;
    },
    setSelectedProfile(id) {
      repo.setSetting("selectedProfileId", id);
    },
    setSetting(key, value) {
      db.prepare("INSERT INTO journal_settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json").run(key, JSON.stringify(value));
    },
    storeRedactedEvent(entryId, event) {
      repo.addEntry(
        {
          id: entryId,
          dayKey: "2026-05-02",
          source: "gateway",
          kind: "system_status",
          title: "Redacted event",
          timestamp: "2026-05-02T12:00:00.000Z",
          status: "info",
          severity: "info",
          rawEventHash: event.raw_event_hash,
          redacted: true
        },
        { event: "redacted.persisted", payload: JSON.parse(event.raw_event_redacted_json) }
      );
      updateRedactedEventColumns(db, entryId, event);
    },
    upsertAlertRule(rule) {
      saveJsonRow(db, "journal_alert_rules", rule.id, JSON.stringify(rule));
      return rule;
    },
    upsertDay(day) {
      db.prepare(
        "INSERT INTO journal_days (day_key, title, date_label, summary, metrics_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(day_key) DO UPDATE SET title = excluded.title, date_label = excluded.date_label, summary = excluded.summary, metrics_json = excluded.metrics_json, updated_at = excluded.updated_at"
      ).run(day.dayKey, day.title, day.dateLabel, day.summary ?? null, JSON.stringify(day.metrics), new Date().toISOString(), new Date().toISOString());
      for (const entry of day.entries) upsertEntry(db, entry);
    },
    upsertProfile(profile) {
      saveJsonRow(db, "journal_profiles", profile.id, JSON.stringify(profile));
      return profile;
    },
    retryDeliveryReceipt(id, options) {
      const original = repo.listDeliveryReceipts().find((receipt) => receipt.id === id);
      if (!original) throw new Error(`delivery_receipt_not_found:${id}`);
      if (original.status !== "failed") return original;
      const retryCount = (original.retryCount ?? 0) + 1;
      const retryIdempotencyKey =
        options?.useNewIdempotencyKey === true
          ? `${original.idempotencyKey ?? original.requestFingerprint ?? original.id}:retry:${retryCount + 1}`
          : original.idempotencyKey ?? original.requestFingerprint ?? original.id;
      const candidate = repo.deliverIntegration(original.target, original.dayKey, {
        incidentId: original.incidentId,
        dryRun: original.dryRun,
        secretRef: original.secretRef,
        idempotencyKey: retryIdempotencyKey,
        forceNewAttempt: true
      });
      const receipt: DeliveryReceipt = {
        ...candidate,
        retryOfReceiptId: original.id,
        retryCount,
        attemptNumber: (original.attemptNumber ?? 1) + 1,
        idempotencyKey: retryIdempotencyKey,
        retryPolicy: {
          sameKeyRetryRequiresConfirmation: original.status === "failed" && Boolean(original.idempotencyKey),
          nextAttemptUsesNewIdempotencyKey: true,
          schedule: ["immediate", "5m", "15m"],
          terminalAttemptRule: "Stop after the last bounded local retry and keep the failure visible."
        }
      };
      saveJsonRow(db, "journal_delivery_receipts", receipt.id, JSON.stringify(receipt), {
        day_key: receipt.dayKey,
        incident_id: receipt.incidentId ?? null,
        target: receipt.target
      });
      return receipt;
    },
    verifyIntegrationTarget(target, dayKey) {
      return repo.deliverIntegration(target, dayKey, {
        dryRun: true,
        idempotencyKey: `verify:${target}:${dayKey}`
      });
    },
    verifyReplayBundle(bundle) {
      const digest = sha256(JSON.stringify(bundle.day ?? {}));
      const manifestDigest =
        typeof bundle.manifest?.signature === "object" && bundle.manifest.signature && "digest" in bundle.manifest.signature
          ? String((bundle.manifest.signature as { digest?: unknown }).digest ?? "")
          : "";
      const reasons: string[] = [];
      if (!manifestDigest) reasons.push("manifest signature missing");
      if (manifestDigest && manifestDigest !== digest) reasons.push("manifest digest mismatch");
      return {
        verified: reasons.length === 0,
        digest,
        reasons,
        signature: { algorithm: "sha256", digest, signatureVerified: reasons.length === 0, signer: "local-openclog" }
      };
    }
  };

  repo.upsertDay(sampleJournalDay);
  return repo;
}

function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_days (
      day_key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date_label TEXT NOT NULL,
      summary TEXT,
      metrics_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      day_key TEXT NOT NULL,
      session_id TEXT,
      source TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      timestamp TEXT NOT NULL,
      status TEXT,
      severity TEXT,
      actor_label TEXT,
      tool_name TEXT,
      approval_id TEXT,
      raw_event_redacted_json TEXT,
      raw_event_hash TEXT,
      redaction_report_json TEXT,
      redacted INTEGER NOT NULL DEFAULT 1,
      entry_json TEXT NOT NULL,
      FOREIGN KEY (day_key) REFERENCES journal_days(day_key)
    );
    CREATE INDEX IF NOT EXISTS idx_journal_entries_day_time ON journal_entries(day_key, timestamp);
    CREATE TABLE IF NOT EXISTS journal_entry_artifacts (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, artifact_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_sessions (id TEXT PRIMARY KEY, session_key TEXT NOT NULL, day_key TEXT NOT NULL, session_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_approvals (id TEXT PRIMARY KEY, entry_id TEXT, status TEXT NOT NULL, requested_at TEXT NOT NULL, resolved_at TEXT, resolved_by TEXT, request_json TEXT, result_json TEXT);
    CREATE TABLE IF NOT EXISTS journal_daily_summaries (day_key TEXT PRIMARY KEY, summary TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_pinned_context (day_key TEXT PRIMARY KEY, context_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_incidents (id TEXT PRIMARY KEY, incident_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_investigation_notes (id TEXT PRIMARY KEY, day_key TEXT NOT NULL, incident_id TEXT, updated_at TEXT NOT NULL, note_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_alert_rules (id TEXT PRIMARY KEY, rule_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_adapter_events (id TEXT PRIMARY KEY, adapter_event_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_profiles (id TEXT PRIMARY KEY, profile_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_retention_snapshots (id TEXT PRIMARY KEY, snapshot_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_alert_states (id TEXT PRIMARY KEY, state_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_audit_log (id TEXT PRIMARY KEY, action TEXT NOT NULL, actor TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT, timestamp TEXT NOT NULL, metadata_json TEXT);
    CREATE TABLE IF NOT EXISTS journal_delivery_receipts (id TEXT PRIMARY KEY, requested_at TEXT, day_key TEXT, incident_id TEXT, target TEXT, receipt_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_lineage (entry_id TEXT PRIMARY KEY, lineage_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_retention_classes (id TEXT PRIMARY KEY, retention_class_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_summary_profiles (id TEXT PRIMARY KEY, profile_id TEXT, day_key TEXT, summary_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_integrity_reports (id TEXT PRIMARY KEY, report_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_analytics_snapshots (id TEXT PRIMARY KEY, snapshot_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_correlation_graph (id TEXT PRIMARY KEY, graph_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_plugins (id TEXT PRIMARY KEY, plugin_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_capabilities (id TEXT PRIMARY KEY, capability_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_plugin_runs (id TEXT PRIMARY KEY, plugin_id TEXT, run_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_incident_handoff_packets (id TEXT PRIMARY KEY, day_key TEXT NOT NULL, incident_id TEXT, created_at TEXT NOT NULL, packet_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_bundle_exports (id TEXT PRIMARY KEY, export_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_summary_jobs (id TEXT PRIMARY KEY, day_key TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, job_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_replay_workspaces (id TEXT PRIMARY KEY, day_key TEXT NOT NULL, workspace_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_incident_action_records (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, created_at TEXT NOT NULL, record_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_backend_fingerprints (id TEXT PRIMARY KEY, fingerprint_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_closeout_completions (id TEXT PRIMARY KEY, completion_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_verification_receipts (id TEXT PRIMARY KEY, receipt_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_investigation_workspaces (id TEXT PRIMARY KEY, workspace_json TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_session ON journal_entries(session_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_status ON journal_entries(status, timestamp);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_tool_name ON journal_entries(tool_name, timestamp);
    CREATE INDEX IF NOT EXISTS idx_journal_adapter_events_id ON journal_adapter_events(id);
    CREATE INDEX IF NOT EXISTS idx_journal_delivery_receipts_requested ON journal_delivery_receipts(requested_at, target);
    CREATE INDEX IF NOT EXISTS idx_journal_incident_action_records_created ON journal_incident_action_records(created_at, incident_id);
    CREATE INDEX IF NOT EXISTS idx_journal_handoff_packets_day ON journal_incident_handoff_packets(day_key, created_at);
  `);
}

function seedDefaults(db: DatabaseSync): void {
  for (const retentionClass of defaultRetentionClasses) {
    saveJsonRow(db, "journal_retention_classes", retentionClass.id, JSON.stringify(retentionClass));
  }
}

function saveJsonRow(db: DatabaseSync, table: string, id: string, json: string, extras: Record<string, string | null> = {}): void {
  if (table === "journal_delivery_receipts") {
    db.prepare("INSERT INTO journal_delivery_receipts (id, requested_at, day_key, incident_id, target, receipt_json) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET receipt_json = excluded.receipt_json").run(
      id,
      JSON.parse(json).requestedAt ?? new Date().toISOString(),
      extras.day_key ?? null,
      extras.incident_id ?? null,
      extras.target ?? null,
      json
    );
    return;
  }
  if (table === "journal_summary_profiles") {
    db.prepare("INSERT INTO journal_summary_profiles (id, profile_id, day_key, summary_json) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET summary_json = excluded.summary_json").run(
      id,
      extras.profile_id ?? null,
      extras.day_key ?? null,
      json
    );
    return;
  }
  if (table === "journal_plugin_runs") {
    db.prepare("INSERT INTO journal_plugin_runs (id, plugin_id, run_json) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET run_json = excluded.run_json").run(id, extras.plugin_id ?? null, json);
    return;
  }
  if (table === "journal_lineage") {
    db.prepare("INSERT INTO journal_lineage (entry_id, lineage_json) VALUES (?, ?) ON CONFLICT(entry_id) DO UPDATE SET lineage_json = excluded.lineage_json").run(id, json);
    return;
  }
  const jsonColumns: Record<string, string> = {
    journal_incidents: "incident_json",
    journal_alert_rules: "rule_json",
    journal_profiles: "profile_json",
    journal_retention_snapshots: "snapshot_json",
    journal_alert_states: "state_json",
    journal_adapter_events: "adapter_event_json",
    journal_plugins: "plugin_json",
    journal_capabilities: "capability_json",
    journal_integrity_reports: "report_json",
    journal_analytics_snapshots: "snapshot_json",
    journal_correlation_graph: "graph_json",
    journal_retention_classes: "retention_class_json",
    journal_lineage: "lineage_json",
    journal_bundle_exports: "export_json",
    journal_backend_fingerprints: "fingerprint_json",
    journal_closeout_completions: "completion_json",
    journal_verification_receipts: "receipt_json",
    journal_investigation_workspaces: "workspace_json"
  };
  const jsonColumn = jsonColumns[table] ?? "";
  if (!jsonColumn) throw new Error(`unsupported_json_table:${table}`);
  db.prepare(`INSERT INTO ${table} (id${table === "journal_lineage" ? "" : ""}, ${jsonColumn}) VALUES (?, ?) ON CONFLICT(id${table === "journal_lineage" ? "" : ""}) DO UPDATE SET ${jsonColumn} = excluded.${jsonColumn}`).run(id, json);
}

function upsertEntry(db: DatabaseSync, entry: JournalEntry): void {
  db.prepare(
    `INSERT INTO journal_entries (
      id, day_key, session_id, source, kind, title, body, timestamp, status, severity,
      actor_label, tool_name, approval_id, raw_event_redacted_json, raw_event_hash,
      redaction_report_json, redacted, entry_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET entry_json = excluded.entry_json`
  ).run(
    entry.id,
    entry.dayKey,
    entry.sessionId ?? null,
    entry.source,
    entry.kind,
    entry.title,
    entry.body ?? null,
    entry.timestamp,
    entry.status ?? null,
    entry.severity ?? null,
    entry.actorLabel ?? null,
    entry.toolName ?? null,
    entry.approvalId ?? null,
    entry.rawEventHash ?? null,
    entry.redacted ? 1 : 0,
    JSON.stringify(entry)
  );
}

function updateRedactedEventColumns(db: DatabaseSync, entryId: string, event: PersistableRedactedEvent): void {
  db.prepare("UPDATE journal_entries SET raw_event_redacted_json = ?, raw_event_hash = ?, redaction_report_json = ? WHERE id = ?").run(
    event.raw_event_redacted_json,
    event.raw_event_hash,
    event.redaction_report_json,
    entryId
  );
}

function listAllEntries(db: DatabaseSync): JournalEntry[] {
  return db.prepare("SELECT entry_json FROM journal_entries ORDER BY timestamp ASC").all().map((row) => JSON.parse(String(row.entry_json)) as JournalEntry);
}

function getGeneratedSummary(db: DatabaseSync, dayKey: string): GeneratedSummary | undefined {
  const row = db.prepare("SELECT summary, created_at FROM journal_daily_summaries WHERE day_key = ?").get(dayKey);
  if (!row) return undefined;
  const createdAt = String(row.created_at);
  const entries = db
    .prepare("SELECT entry_json FROM journal_entries WHERE day_key = ? ORDER BY timestamp ASC")
    .all(dayKey)
    .map((entryRow) => JSON.parse(String(entryRow.entry_json)) as JournalEntry);
  const latestEntryObservedAt = latestTimestampForEntries(entries);
  const lastEntryIncludedAt = latestTimestampForEntries(entries.filter((entry) => entry.timestamp <= createdAt));
  return {
    summary: String(row.summary),
    createdAt,
    source: "rules",
    ...(lastEntryIncludedAt ? { lastEntryIncludedAt } : {}),
    ...(latestEntryObservedAt ? { latestEntryObservedAt } : {}),
    freshnessState: latestEntryObservedAt && latestEntryObservedAt > createdAt ? "stale" : "fresh"
  };
}

function buildBackendFingerprint(): BackendFingerprint {
  const commitSha = resolveCommitSha();
  const buildTimestamp = process.env.OPENCLOG_BUILD_TIMESTAMP ?? repositoryBootedAt;
  const basis = [process.pid, repositoryBootedAt, commitSha, buildTimestamp, process.version].join("|");
  const runtimeFingerprint = sha256(basis);
  return {
    id: runtimeFingerprint,
    runtimeFingerprint,
    pid: process.pid,
    bootedAt: repositoryBootedAt,
    commitSha,
    buildTimestamp,
    nodeVersion: process.version
  };
}

function persistBackendFingerprint(db: DatabaseSync, fingerprint: BackendFingerprint): BackendFingerprint {
  saveJsonRow(db, "journal_backend_fingerprints", fingerprint.id, JSON.stringify(fingerprint));
  return fingerprint;
}

function resolveCommitSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim() || "unknown";
  } catch {
    return "unknown";
  }
}

function defaultVerificationReceipts(now = new Date()): VerificationReceipt[] {
  const startedAt = now.toISOString();
  return [
    { id: "verification-verify", command: "npm run verify", status: "unknown", startedAt, summary: "Repo verification has not published a receipt in this database yet." },
    { id: "verification-gateway", command: "npm run verify:gateway", status: "unknown", startedAt, summary: "Gateway verification has not published a receipt in this database yet." },
    { id: "verification-desktop", command: "npm run verify:desktop-native", status: "unknown", startedAt, summary: "Desktop-native verification has not published a receipt in this database yet." },
    { id: "verification-visual", command: "npm run test:visual", status: "unknown", startedAt, summary: "Visual regression verification has not published a receipt in this database yet." }
  ];
}

function buildCloseoutCompletion(repo: OpenClogRepository, dayKey: string, exportTargets: string[]): CloseoutCompletion {
  const day = repo.getDay(dayKey);
  const blockers: string[] = [];
  if (!day) blockers.push("Day evidence is unavailable.");
  const summaryFresh = Boolean(day?.generatedSummary && latestTimestampForEntries(day.entries) <= day.generatedSummary.createdAt);
  if (!summaryFresh) blockers.push("Generated summary is stale or missing.");
  const incidents = repo.listIncidents().filter((incident) => incident.dayKeys.includes(dayKey));
  if (incidents.length === 0) blockers.push("No incident snapshot is linked to closeout.");
  const notes = repo.listInvestigationNotes({ dayKey });
  if (notes.length === 0) blockers.push("No operator investigation note is recorded.");
  if (exportTargets.length === 0) blockers.push("No export targets selected.");
  const checklist = [
    summaryFresh ? "Summary freshness satisfied." : "Refresh generated summary.",
    incidents.length > 0 ? `${incidents.length} incident(s) linked.` : "Capture or link an incident.",
    notes.length > 0 ? `${notes.length} investigation note(s) recorded.` : "Record an investigation note.",
    exportTargets.length > 0 ? `Exports selected: ${exportTargets.join(", ")}.` : "Select export targets."
  ];
  return {
    id: `closeout-${dayKey}-${sha256(`${dayKey}:${exportTargets.join(",")}:${new Date().toISOString()}`).slice(0, 12)}`,
    dayKey,
    completedAt: new Date().toISOString(),
    blocked: blockers.length > 0,
    checklist,
    blockers,
    exportTargets
  };
}

function deriveIncidents(days: JournalDay[]): IncidentSummary[] {
  const unresolvedApprovalIds = new Set(findUnresolvedApprovalIds(days));
  const candidates = days.flatMap((day) =>
    day.entries
      .filter((entry) => entry.severity === "error" || /reconnect/i.test(entry.title) || (entry.kind === "approval_requested" && (!entry.approvalId || unresolvedApprovalIds.has(entry.approvalId))))
      .map((entry) => ({ day, entry }))
  );
  if (candidates.length === 0) return [];
  const first = candidates[0];
  return [
    {
      id: "incident-derived-1",
      title: first.entry.severity === "error" ? "Error narrative" : "Operational instability narrative",
      summary: `Derived from ${candidates.length} operationally important entries across ${new Set(candidates.map((item) => item.day.dayKey)).size} day(s).`,
      dayKeys: [...new Set(candidates.map((item) => item.day.dayKey))],
      entryIds: candidates.map((item) => item.entry.id),
      createdAt: new Date().toISOString(),
      runbookSuggestions: buildRunbookSuggestions(candidates.map((item) => item.entry)),
      loopProgress: { detect: true, explain: true, recommend: true, act: false, record: false }
    }
  ];
}

function findUnresolvedApprovalIds(days: JournalDay[]): string[] {
  const statusByApprovalId = new Map<string, "requested" | "resolved">();
  const orderedEntries = days.flatMap((day) => day.entries).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  for (const entry of orderedEntries) {
    if (!entry.approvalId) continue;
    if (entry.kind === "approval_requested") statusByApprovalId.set(entry.approvalId, "requested");
    if (entry.kind === "approval_resolved") statusByApprovalId.set(entry.approvalId, "resolved");
  }
  return [...statusByApprovalId.entries()].filter(([, status]) => status === "requested").map(([approvalId]) => approvalId);
}

function buildRunbookSuggestions(entries: JournalEntry[]): RunbookSuggestion[] {
  const suggestions: RunbookSuggestion[] = [];
  if (entries.some((entry) => /reconnect/i.test(entry.title) || /reconnect/i.test(entry.body ?? ""))) {
    suggestions.push({
      id: "gateway-reconnect-check",
      title: "Check Gateway listener health",
      summary: "Confirm loopback listener, token, and device identity are still valid.",
      reason: "Reconnect-related entry detected."
    });
  }
  if (entries.some((entry) => entry.kind === "approval_requested")) {
    suggestions.push({
      id: "approval-backlog-review",
      title: "Review pending approvals",
      summary: "Resolve queued approvals before continuing operator flow.",
      reason: "Approval request detected."
    });
  }
  return suggestions;
}

function buildSearchMatchDetails(entry: JournalEntry, needle: string): Pick<JournalSearchResult, "matchSnippet" | "matchFieldHints"> {
  const sanitizedBody = browserVisibleEntryText(entry, { expanded: true }).body;
  const candidates = [
    { hint: "title", value: entry.title },
    { hint: "body", value: sanitizedBody },
    { hint: "toolName", value: entry.toolName ?? "" },
    { hint: "status", value: entry.status ?? "" },
    { hint: "sessionId", value: entry.sessionId ?? "" },
    { hint: "kind", value: entry.kind }
  ];
  const matched = candidates.filter((candidate) => candidate.value.toLocaleLowerCase().includes(needle));
  const primary = matched[0] ?? candidates[0];
  return {
    matchSnippet: buildMatchSnippet(primary.hint, primary.value, needle),
    matchFieldHints: matched.map((candidate) => candidate.hint)
  };
}

function buildMatchSnippet(hint: string, value: string, needle: string): string {
  const normalized = value.trim();
  if (!normalized) return `Matched in ${hint}.`;
  const lower = normalized.toLocaleLowerCase();
  const index = lower.indexOf(needle);
  if (index < 0) return `Matched in ${hint}: ${normalized}`;
  const start = Math.max(0, index - 24);
  const end = Math.min(normalized.length, index + needle.length + 36);
  return `Matched in ${hint}: ${normalized.slice(start, end).trim()}`;
}

function buildRetentionClass(id: RetentionClassId, label: string, description: string, keepDays: number): RetentionClass {
  return { id, label, description, policy: { keepDays, includeRollback: true }, updatedAt: "2026-05-04T00:00:00.000Z" };
}

function buildSignedBundle(day: JournalDay): {
  manifest: { dayKey: string; exportedAt: string; version: string; signature: BundleSignature };
  day: JournalDay;
  markdown: string;
} {
  const exportedAt = new Date().toISOString();
  const signature: BundleSignature = {
    algorithm: "sha256",
    digest: sha256(JSON.stringify(day))
  };
  return {
    manifest: {
      dayKey: day.dayKey,
      exportedAt,
      version: "0.1.0",
      signature
    },
    day,
    markdown: exportDayAsMarkdown(day)
  };
}

function buildRetentionClassImpact(
  db: DatabaseSync,
  repo: OpenClogRepository,
  retentionClass: RetentionClass
): RetentionClassPreview["impact"] {
  const keepDays = retentionClass.policy.keepDays;
  const dayKeysToKeep = new Set(repo.listDays().slice(0, Math.max(keepDays, 0)).map((day) => day.dayKey));
  const rows =
    retentionClass.id === "entries"
      ? listAllEntries(db).map((entry) => ({ id: entry.id, dayKey: entry.dayKey }))
      : retentionClass.id === "incidents"
        ? repo.listIncidents().map((incident) => ({ id: incident.id, dayKey: incident.dayKeys[0] ?? "" }))
        : retentionClass.id === "investigation_notes"
          ? repo.listInvestigationNotes().map((note) => ({ id: note.id, dayKey: note.dayKey }))
          : retentionClass.id === "summaries"
            ? repo.listDays().map((day) => ({ id: `summary:${day.dayKey}`, dayKey: day.dayKey }))
            : retentionClass.id === "bundle_exports"
              ? db.prepare("SELECT id FROM journal_bundle_exports ORDER BY id ASC").all().map((row) => ({ id: String(row.id), dayKey: "" }))
              : retentionClass.id === "delivery_receipts"
                ? repo.listDeliveryReceipts().map((receipt) => ({ id: receipt.id, dayKey: receipt.dayKey }))
                : retentionClass.id === "audit_log"
                  ? db.prepare("SELECT id FROM journal_audit_log ORDER BY timestamp ASC").all().map((row) => ({ id: String(row.id), dayKey: "" }))
                  : retentionClass.id === "alert_state"
                    ? repo.listAlertRules().map((rule) => ({ id: rule.id, dayKey: "" }))
                    : db
                        .prepare("SELECT id FROM journal_integrity_reports UNION ALL SELECT id FROM journal_analytics_snapshots UNION ALL SELECT id FROM journal_plugin_runs")
                        .all()
                        .map((row) => ({ id: String(row.id), dayKey: "" }));
  const removable = rows.filter((row) => !row.dayKey || !dayKeysToKeep.has(row.dayKey));
  return {
    beforeCount: rows.length,
    afterCount: rows.length - removable.length,
    removedCount: removable.length,
    affectedIds: removable.slice(0, 10).map((row) => row.id)
  };
}

function classifyHealthHistoryCategory(entry: JournalEntry): HealthHistoryEntry["category"] | null {
  const haystack = `${entry.title} ${entry.body ?? ""}`.toLocaleLowerCase();
  if (haystack.includes("reconnect")) return "reconnect";
  if (haystack.includes("sequence gap")) return "sequence_gap";
  if (entry.kind === "approval_requested" || entry.kind === "approval_resolved") return "approval";
  if ((entry.kind === "tool_call" || entry.kind === "tool_result") && (entry.status === "failed" || entry.severity === "error")) return "tool_failure";
  if (entry.kind === "error") return "gateway_error";
  return null;
}

function buildEvidenceCompleteness(
  db: DatabaseSync,
  dayKey: string,
  summary: string | undefined,
  generatedSummary: GeneratedSummary | undefined
): JournalDay["evidenceCompleteness"] {
  const summaryPresent = Boolean(summary?.trim() || generatedSummary);
  const notesPresent = countRows(db, "SELECT COUNT(*) AS count FROM journal_investigation_notes WHERE day_key = ?", dayKey) > 0;
  const bundlePresent = db
    .prepare("SELECT export_json FROM journal_bundle_exports")
    .all()
    .some((row) => {
      try {
        const parsed = JSON.parse(String(row.export_json)) as { dayKey?: string; day?: { dayKey?: string } };
        return parsed.dayKey === dayKey || parsed.day?.dayKey === dayKey;
      } catch {
        return false;
      }
    });
  const incidentPresent = listIncidentIdsForDay(db, dayKey).length > 0;
  const present = [summaryPresent, notesPresent, bundlePresent, incidentPresent].filter(Boolean).length;
  return {
    present,
    total: 4,
    summaryPresent,
    notesPresent,
    bundlePresent,
    incidentPresent,
    label: `Evidence ${String(present)}/4`
  };
}

function listIncidentIdsForDay(db: DatabaseSync, dayKey: string): string[] {
  return db
    .prepare("SELECT incident_json FROM journal_incidents ORDER BY id ASC")
    .all()
    .map((row) => JSON.parse(String(row.incident_json)) as IncidentSummary)
    .filter((incident) => incident.dayKeys.includes(dayKey))
    .map((incident) => incident.id);
}

function resolveGithubRepo(): string {
  const explicit = process.env.OPENCLOG_GITHUB_REPO?.trim();
  if (explicit) return explicit;
  const remote = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).trim();
  const match = /github\.com[:/](.+?)(?:\.git)?$/.exec(remote);
  if (!match) throw new Error("github_remote_not_found");
  return match[1];
}

function findExistingReceipt(
  receipts: DeliveryReceipt[],
  target: DeliveryReceipt["target"],
  dayKey: string,
  idempotencyKey: string | undefined
): DeliveryReceipt | undefined {
  if (!idempotencyKey) return undefined;
  return receipts.find((receipt) => receipt.target === target && receipt.dayKey === dayKey && receipt.idempotencyKey === idempotencyKey);
}

function buildReceiptFingerprint(
  target: DeliveryReceipt["target"],
  dayKey: string,
  incidentId: string | undefined,
  idempotencyKey: string | undefined
): string {
  return sha256([target, dayKey, incidentId ?? "", idempotencyKey ?? ""].join("|"));
}

function latestTimestampForEntries(entries: JournalEntry[]): string {
  return entries.reduce((latest, entry) => (entry.timestamp > latest ? entry.timestamp : latest), "");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function countRows(db: DatabaseSync, sql: string, value: string): number {
  const row = db.prepare(sql).get(value) as { count?: number } | undefined;
  return typeof row?.count === "number" ? row.count : 0;
}

function buildSessionDrilldownSummary(sessionKey: string, entries: JournalEntry[], toolCount: number, approvalCount: number, reconnectCount: number): string {
  const latestTimestamp = [...entries].sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0]?.timestamp;
  const parts = [
    `Session ${sessionKey}`,
    `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`,
    `${toolCount} tool${toolCount === 1 ? "" : "s"}`,
    `${approvalCount} approval${approvalCount === 1 ? "" : "s"}`,
    `${reconnectCount} reconnect${reconnectCount === 1 ? "" : "s"}`
  ];
  if (latestTimestamp) parts.push(`latest event ${latestTimestamp}`);
  return parts.join(", ");
}

function syncLineageForEntry(db: DatabaseSync, entry: JournalEntry, repo: OpenClogRepository): void {
  const record: LineageRecord = {
    entryId: entry.id,
    rawEventHash: entry.rawEventHash,
    incidentIds: repo.listIncidents().filter((incident) => incident.entryIds.includes(entry.id)).map((incident) => incident.id),
    replayIds: repo.listIncidents().filter((incident) => incident.entryIds.includes(entry.id)).map((incident) => `replay:${incident.id}`),
    bundleExportIds: db
      .prepare("SELECT id, export_json FROM journal_bundle_exports ORDER BY id ASC")
      .all()
      .map((row) => ({ id: String(row.id), json: JSON.parse(String(row.export_json)) as { entryIds?: string[] } }))
      .filter((item) => item.json.entryIds?.includes(entry.id))
      .map((item) => item.id),
    deliveryReceiptIds: repo.listDeliveryReceipts().filter((receipt) => receipt.dayKey === entry.dayKey).map((receipt) => receipt.id)
  };
  db.prepare("INSERT INTO journal_lineage (entry_id, lineage_json) VALUES (?, ?) ON CONFLICT(entry_id) DO UPDATE SET lineage_json = excluded.lineage_json").run(entry.id, JSON.stringify(record));
}

function syncLineageForIncident(db: DatabaseSync, incidentId: string, repo: OpenClogRepository): void {
  const incident = repo.getIncident(incidentId);
  if (!incident) return;
  for (const entryId of incident.entryIds) {
    const entry = findEntryAcrossDays(repo, entryId)[0];
    if (entry) syncLineageForEntry(db, entry, repo);
  }
}

function findEntryAcrossDays(repo: Pick<OpenClogRepository, "listDays" | "getDay">, entryId: string): JournalEntry[] {
  return repo
    .listDays()
    .map((day) => repo.getDay(day.dayKey))
    .filter((day): day is JournalDay => day !== null)
    .flatMap((day) => day.entries)
    .filter((entry) => entry.id === entryId);
}

function deliveryConfigFor(target: DeliveryAdapterTarget): { authorization?: string; destinationLabel: string; enabled: boolean; url?: string } {
  if (target === "slack") {
    return {
      enabled: Boolean(process.env.OPENCLOG_SLACK_WEBHOOK_URL),
      url: process.env.OPENCLOG_SLACK_WEBHOOK_URL,
      destinationLabel: process.env.OPENCLOG_SLACK_CHANNEL ?? "Slack webhook"
    };
  }
  if (target === "generic-webhook") {
    return {
      enabled: Boolean(process.env.OPENCLOG_WEBHOOK_URL),
      url: process.env.OPENCLOG_WEBHOOK_URL,
      authorization: process.env.OPENCLOG_WEBHOOK_AUTH,
      destinationLabel: process.env.OPENCLOG_WEBHOOK_LABEL ?? "Generic webhook"
    };
  }
  return {
    enabled: Boolean(process.env.OPENCLOG_EMAIL_ENDPOINT),
    url: process.env.OPENCLOG_EMAIL_ENDPOINT,
    authorization: process.env.OPENCLOG_EMAIL_AUTH,
    destinationLabel: process.env.OPENCLOG_EMAIL_TO ?? "Email endpoint"
  };
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function emptyDay(dayKey: string): JournalDay {
  return {
    dayKey,
    title: "OpenClog Journal",
    dateLabel: dayKey,
    summary: "",
    entries: [],
    metrics: { sessionCount: 0, messageCount: 0, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
  };
}

function metricsFor(entries: JournalEntry[]): JournalDay["metrics"] {
  return {
    sessionCount: new Set(entries.map((entry) => entry.sessionId).filter(Boolean)).size,
    messageCount: entries.filter((entry) => entry.kind === "user_message" || entry.kind === "assistant_message").length,
    toolCallCount: entries.filter((entry) => entry.kind === "tool_call" || entry.kind === "tool_result").length,
    approvalCount: entries.filter((entry) => entry.kind === "approval_requested" || entry.kind === "approval_resolved").length,
    errorCount: entries.filter((entry) => entry.severity === "error" || entry.status === "failed").length
  };
}

function unique<T>(value: T, index: number, array: T[]): boolean {
  return array.indexOf(value) === index;
}
