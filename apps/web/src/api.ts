import type {
  AdapterEvent,
  AgentActivity,
  AnalyticsSnapshot,
  HealthAggregate,
  CorrelationGraph,
  DeliveryAdapterTarget,
  DeliveryReceipt,
  GeneratedProfileSummary,
  HealthHistoryEntry,
  IntegrityMonitorReport,
  AlertFinding,
  AlertRule,
  BackendFingerprint,
  CapabilityView,
  CloseoutPlan,
  CloseoutCompletion,
  LineageRecord,
  MissionReplay,
  GeneratedSummary,
  IncidentActionKind,
  IncidentActionRecord,
  MonitoringImportInput,
  MonitoringImportResult,
  OperationsBacklogReport,
  IncidentSummary,
  IncidentWorkspace,
  InvestigationNote,
  IntegrationPayload,
  OpenClogSettings,
  OperatorViewPreset,
  PluginExecutionResult,
  PluginManifest,
  IntegrityReport,
  IncidentRulePack,
  JournalDay,
  JournalSearchResult,
  OperatorRunbook,
  PinnedDayContext,
  ProfileConfig,
  ReplayWorkspace,
  RetentionPolicy,
  RetentionClass,
  RetentionClassPreview,
  RetentionPreview,
  ReplayBundleDiff,
  SavedViewAuditEvent,
  ServiceHealthTimelineEntry,
  SessionDrilldown,
  SloSnapshot,
  SummaryJob,
  SummaryJobStatus,
  SummaryProfile,
  ThemeId,
  VerificationReceipt
} from "@openclog/core";
import { themeIds } from "@openclog/core";

export type { SearchPreset } from "@openclog/core";

export interface HealthResponse {
  ok: boolean;
  backend?: BackendFingerprint | null;
  gateway: {
    connectionStatus?: "connected" | "connecting" | "disconnected";
    lastConnectedAt?: string;
    lastDisconnectedAt?: string;
    lastErrorCategory?: string;
    lastErrorReason?: string;
    lastLiveEventAt?: string;
    lastSuccessfulSyncAt?: string;
    status: "ready" | "blocked" | "degraded";
    role: string;
    scopes: string[];
    missingScopes: string[];
    scopeNegotiation?: { have: string[]; missing: string[] };
    targetReachable?: boolean;
    nextReconnectAt?: string;
    reconnectCount?: number;
    reconnectAttempt?: number;
    serviceRecovery?: {
      enabled: boolean;
      lastAttemptAt?: string;
      lastReason?: string;
      lastResult?: "success" | "failed" | "skipped";
      nextAllowedAt?: string;
      restartCount: number;
    };
    stale: boolean;
  };
}

export interface VersionResponse {
  version: string;
  commitSha: string;
  buildTimestamp: string;
  pid: number;
  bootedAt: string;
  runtimeFingerprint: string;
  nodeVersion: string;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/api/health");
}

export async function fetchVersion(): Promise<VersionResponse> {
  return fetchJson<VersionResponse>("/api/version");
}

export async function fetchDays(): Promise<Array<Omit<JournalDay, "entries">>> {
  const result = await fetchJson<{ days: Array<Omit<JournalDay, "entries">> }>("/api/days");
  return result.days;
}

export async function fetchDay(dayKey: string): Promise<JournalDay> {
  const result = await fetchJson<{ day: JournalDay }>(`/api/days/${encodeURIComponent(dayKey)}`);
  return result.day;
}

export async function updateDayContext(dayKey: string, context: { note?: string; summary?: string }): Promise<PinnedDayContext> {
  const response = await fetch(`/api/days/${encodeURIComponent(dayKey)}/context`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(context)
  });
  if (!response.ok) throw new Error("Day context update failed");
  const result = (await response.json()) as { context: PinnedDayContext };
  return result.context;
}

export async function generateSummary(dayKey: string): Promise<GeneratedSummary> {
  const response = await fetch(`/api/days/${encodeURIComponent(dayKey)}/generate-summary`, { method: "POST" });
  if (!response.ok) throw new Error("Summary generation failed");
  const result = (await response.json()) as { generatedSummary: GeneratedSummary };
  return result.generatedSummary;
}

export async function createSummaryJob(dayKey: string): Promise<SummaryJob> {
  const response = await fetch(`/api/days/${encodeURIComponent(dayKey)}/summary-jobs`, { method: "POST" });
  if (!response.ok) throw new Error("Summary job creation failed");
  const result = (await response.json()) as { job: SummaryJob };
  return result.job;
}

export async function fetchSummaryJob(id: string): Promise<SummaryJob> {
  const result = await fetchJson<{ job: SummaryJob }>(`/api/summary-jobs/${encodeURIComponent(id)}`);
  return result.job;
}

export interface SummaryJobPollingOptions {
  intervalMs?: number;
  maxAttempts?: number;
  onUpdate?: (job: SummaryJob) => void;
  onPollLatency?: (latencyMs: number) => void;
  signal?: AbortSignal;
  sleep?: (ms: number) => Promise<void>;
}

export function isSummaryJobSettled(status: SummaryJobStatus): boolean {
  return status === "completed" || status === "failed";
}

export async function pollSummaryJobUntilSettled(initialJob: SummaryJob, options: SummaryJobPollingOptions = {}): Promise<SummaryJob> {
  const intervalMs = options.intervalMs ?? 750;
  const maxAttempts = options.maxAttempts ?? 20;
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => globalThis.setTimeout(resolve, ms)));
  let current = initialJob;
  options.onUpdate?.(current);
  if (isSummaryJobSettled(current.status)) return current;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw new Error("Summary job polling aborted");
    await sleep(intervalMs);
    if (options.signal?.aborted) throw new Error("Summary job polling aborted");
    const startedAt = performance.now();
    current = await fetchSummaryJob(current.id);
    options.onPollLatency?.(Math.round(performance.now() - startedAt));
    options.onUpdate?.(current);
    if (isSummaryJobSettled(current.status)) return current;
  }
  throw new Error("Summary job polling timed out");
}

export async function fetchSettings(): Promise<OpenClogSettings> {
  const result = await fetchJson<{ settings: Partial<OpenClogSettings> }>("/api/settings");
  return {
    version: 2,
    theme: result.settings.theme ?? "default",
    showToolCalls: result.settings.showToolCalls !== false,
    searchPresets: result.settings.searchPresets ?? [],
    operatorViews: result.settings.operatorViews ?? []
  };
}

export async function updateSettings(settings: Partial<OpenClogSettings> & { operatorViews?: OperatorViewPreset[] }): Promise<OpenClogSettings> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error("Settings update failed");
  const result = (await response.json()) as { settings?: Partial<OpenClogSettings> };
  return {
    version: 2,
    theme: result.settings?.theme ?? "default",
    showToolCalls: result.settings?.showToolCalls !== false,
    searchPresets: result.settings?.searchPresets ?? [],
    operatorViews: result.settings?.operatorViews ?? []
  };
}

export async function recordOperatorViewUsed(view: Pick<OperatorViewPreset, "id" | "label"> & { detail?: string }): Promise<SavedViewAuditEvent> {
  const response = await fetch(`/api/settings/operator-views/${encodeURIComponent(view.id)}/used`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      label: view.label,
      detail: view.detail ?? `Operator view ${view.label} was loaded from the workbench.`
    })
  });
  if (!response.ok) throw new Error("Operator view audit failed");
  const result = (await response.json()) as { event: SavedViewAuditEvent };
  return result.event;
}

export async function fetchSessions(dayKey: string): Promise<AgentActivity[]> {
  const result = await fetchJson<{ agents: AgentActivity[] }>(`/api/sessions?dayKey=${encodeURIComponent(dayKey)}`);
  return result.agents;
}

export async function fetchSessionDrilldown(sessionKey: string): Promise<SessionDrilldown> {
  return fetchJson<SessionDrilldown>(`/api/sessions/${encodeURIComponent(sessionKey)}`);
}

export async function fetchApprovals(): Promise<ApprovalView[]> {
  const result = await fetchJson<{ approvals: ApprovalView[] }>("/api/approvals");
  return result.approvals;
}

export interface ApprovalView {
  id: string;
  title: string;
  command: string;
  status: string;
  requestedAt?: string;
  sessionKey?: string;
}

export async function resolveApproval(id: string, decision: "allow-once" | "deny"): Promise<void> {
  const response = await fetch(`/api/approvals/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ decision })
  });
  if (!response.ok) throw new Error("Approval resolution failed");
}

export async function sendComposer(text: string): Promise<{ day?: JournalDay | null; mode?: string; body?: string; message?: string; sessionKey?: string }> {
  const response = await fetch("/api/composer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text })
  });
  const json = (await response.json()) as { day?: JournalDay | null; mode?: string; body?: string; message?: string; sessionKey?: string };
  if (!response.ok) throw new Error(json.message ?? "Composer failed");
  return json;
}

export async function exportDay(dayKey: string, format: "markdown" | "html" = "markdown"): Promise<Blob> {
  const response = await fetch(`/api/days/${encodeURIComponent(dayKey)}/export?format=${format}`);
  if (!response.ok) throw new Error("Export failed");
  return response.blob();
}

export interface BundleExport {
  manifest: { dayKey: string; exportedAt: string; version: string; signature?: { algorithm: "sha256"; digest: string } };
  day: JournalDay;
  markdown: string;
}

export async function exportBundle(dayKey: string): Promise<BundleExport> {
  return fetchJson(`/api/days/${encodeURIComponent(dayKey)}/export/bundle`);
}

export async function searchJournal(
  query: string,
  cursor?: string,
  limit = 20,
  options?: { signal?: AbortSignal }
): Promise<{ query: string; results: JournalSearchResult[]; nextCursor?: string }> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return fetchJson<{ query: string; results: JournalSearchResult[]; nextCursor?: string }>(`/api/search?${params.toString()}`, options);
}

export async function runIntegrityCheck(): Promise<IntegrityReport> {
  const response = await fetch("/api/integrity-check", { method: "POST" });
  if (!response.ok) throw new Error("Integrity check failed");
  const result = (await response.json()) as { report: IntegrityReport };
  return result.report;
}

export async function previewRetention(policy: { keepDays: number; includeAudit: boolean; includeRedactedEvents: boolean; includeSummaries: boolean }): Promise<{
  keepDays: number;
  removedDayKeys: string[];
  removedEntryCount: number;
  removedSummaryCount: number;
  removedAuditCount: number;
  removedIncidentCount?: number;
  removedBundleCount?: number;
}> {
  const response = await fetch("/api/retention/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(policy)
  });
  if (!response.ok) throw new Error("Retention preview failed");
  const result = (await response.json()) as {
    preview: {
      keepDays: number;
      removedDayKeys: string[];
      removedEntryCount: number;
      removedSummaryCount: number;
      removedAuditCount: number;
      removedIncidentCount?: number;
      removedBundleCount?: number;
    };
  };
  return result.preview;
}

export interface RetentionSnapshotResult {
  id: string;
  createdAt: string;
  preview: RetentionPreview;
  days?: JournalDay[];
}

export async function applyRetention(policy: RetentionPolicy): Promise<RetentionSnapshotResult> {
  const response = await fetch("/api/retention/apply", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(policy)
  });
  if (!response.ok) throw new Error("Retention apply failed");
  const result = (await response.json()) as { snapshot: RetentionSnapshotResult };
  return result.snapshot;
}

export async function rollbackRetention(snapshotId: string): Promise<{ restoredDayKeys: string[] }> {
  const response = await fetch(`/api/retention/rollback/${encodeURIComponent(snapshotId)}`, { method: "POST" });
  if (!response.ok) throw new Error("Retention rollback failed");
  return (await response.json()) as { restoredDayKeys: string[] };
}

export async function fetchIncidents(): Promise<IncidentSummary[]> {
  const result = await fetchJson<{ incidents: IncidentSummary[] }>("/api/incidents");
  return result.incidents;
}

export async function fetchIncidentWorkspace(id: string): Promise<IncidentWorkspace> {
  const result = await fetchJson<{ ok: boolean; workspace: IncidentWorkspace }>(`/api/incidents/${encodeURIComponent(id)}/workspace`);
  return result.workspace;
}

export async function createIncidentSnapshot(payload: { dayKey: string; entryIds: string[]; title?: string }): Promise<IncidentSummary> {
  const response = await fetch("/api/incident-mode", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Incident snapshot failed");
  const result = (await response.json()) as { incident: IncidentSummary };
  return result.incident;
}

export async function fetchInvestigationNotes(filter: { dayKey?: string; incidentId?: string; cursor?: string; limit?: number } = {}): Promise<{
  notes: InvestigationNote[];
  nextCursor?: string;
}> {
  const params = new URLSearchParams();
  if (filter.dayKey) params.set("dayKey", filter.dayKey);
  if (filter.incidentId) params.set("incidentId", filter.incidentId);
  if (filter.cursor) params.set("cursor", filter.cursor);
  if (typeof filter.limit === "number") params.set("limit", String(filter.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return fetchJson<{ notes: InvestigationNote[]; nextCursor?: string }>(`/api/investigation-notes${suffix}`);
}

export async function createInvestigationNote(payload: {
  dayKey: string;
  incidentId?: string;
  sessionKey?: string;
  body: string;
  linkedEntryIds?: string[];
  author?: string;
}): Promise<InvestigationNote> {
  const response = await fetch("/api/investigation-notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Investigation note save failed");
  const result = (await response.json()) as { note: InvestigationNote };
  return result.note;
}

export async function importMonitoringDecisions(payload: MonitoringImportInput & { confirmedLocalImport: true }): Promise<MonitoringImportResult> {
  const response = await fetch("/api/monitoring-imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Monitoring import failed closed");
  const result = (await response.json()) as { import: MonitoringImportResult };
  return result.import;
}

export async function fetchCapabilities(): Promise<CapabilityView[]> {
  const result = await fetchJson<{ capabilities: CapabilityView[] }>("/api/capabilities");
  return result.capabilities;
}

export async function fetchAlerts(): Promise<{ rules: AlertRule[]; findings: AlertFinding[] }> {
  return fetchJson("/api/alerts");
}

export async function saveAlertRule(rule: Partial<AlertRule> & { id: string }): Promise<AlertRule> {
  const response = await fetch(`/api/alerts/rules/${encodeURIComponent(rule.id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(rule)
  });
  if (!response.ok) throw new Error("Alert rule save failed");
  const result = (await response.json()) as { rule: AlertRule };
  return result.rule;
}

export interface AlertStateResult {
  ruleId: string;
  acknowledgedAt?: string;
  snoozedUntil?: string;
}

export async function acknowledgeAlert(ruleId: string, acknowledgedAt = new Date().toISOString()): Promise<AlertStateResult> {
  const response = await fetch(`/api/alerts/${encodeURIComponent(ruleId)}/ack`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ acknowledgedAt })
  });
  if (!response.ok) throw new Error("Alert acknowledgement failed");
  const result = (await response.json()) as { state: AlertStateResult };
  return result.state;
}

export async function snoozeAlert(ruleId: string, snoozedUntil: string): Promise<AlertStateResult> {
  const response = await fetch(`/api/alerts/${encodeURIComponent(ruleId)}/snooze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ snoozedUntil })
  });
  if (!response.ok) throw new Error("Alert snooze failed");
  const result = (await response.json()) as { state: AlertStateResult };
  return result.state;
}

export async function fetchAdapterEvents(): Promise<AdapterEvent[]> {
  const result = await fetchJson<{ events: AdapterEvent[] }>("/api/adapters/events");
  return result.events;
}

export async function fetchHealthHistory(limit = 5): Promise<HealthHistoryEntry[]> {
  const result = await fetchJson<{ history: HealthHistoryEntry[] }>(`/api/health/history?limit=${String(limit)}`);
  return result.history;
}

export async function fetchHealthAggregate(limit = 20): Promise<HealthAggregate> {
  const result = await fetchJson<{ aggregate: HealthAggregate }>(`/api/health/aggregate?limit=${String(limit)}`);
  return result.aggregate;
}

export async function fetchHealthTimeline(limit = 10, cursor?: string): Promise<{ timeline: ServiceHealthTimelineEntry[]; nextCursor?: string }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return fetchJson<{ timeline: ServiceHealthTimelineEntry[]; nextCursor?: string }>(`/api/health/timeline?${params.toString()}`);
}

export async function fetchProfiles(): Promise<{ selectedProfileId: string; profiles: ProfileConfig[] }> {
  return fetchJson("/api/profiles");
}

export async function createProfile(profile: ProfileConfig): Promise<ProfileConfig> {
  const response = await fetch("/api/profiles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(profile)
  });
  if (!response.ok) throw new Error("Profile create failed");
  const result = (await response.json()) as { profile: ProfileConfig };
  return result.profile;
}

export async function selectProfile(id: string): Promise<string> {
  const response = await fetch(`/api/profiles/${encodeURIComponent(id)}/select`, { method: "PUT" });
  if (!response.ok) throw new Error("Profile select failed");
  const result = (await response.json()) as { selectedProfileId: string };
  return result.selectedProfileId;
}

export async function buildIntegrationPayload(target: IntegrationPayload["target"], dayKey: string): Promise<IntegrationPayload> {
  const response = await fetch(`/api/integrations/${encodeURIComponent(target)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dayKey })
  });
  if (!response.ok) throw new Error("Integration payload failed");
  const result = (await response.json()) as { payload: IntegrationPayload };
  return result.payload;
}

export async function deliverIntegration(
  target: "slack" | "generic-webhook" | "email",
  payload: { dayKey: string; incidentId?: string; dryRun?: boolean }
): Promise<DeliveryReceipt> {
  const response = await fetch(`/api/integrations/${encodeURIComponent(target)}/deliver`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(payload.dryRun ? { "x-openclog-dry-run": "1" } : {})
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Integration delivery failed");
  const result = (await response.json()) as { receipt: DeliveryReceipt };
  return result.receipt;
}

export type VerifiableIntegrationTarget = Extract<DeliveryAdapterTarget, "slack" | "generic-webhook" | "email">;

export async function verifyIntegrationTarget(target: VerifiableIntegrationTarget, payload: { dayKey: string }): Promise<DeliveryReceipt> {
  const response = await fetch(`/api/integrations/${encodeURIComponent(target)}/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Integration verification failed");
  const result = (await response.json()) as { receipt: DeliveryReceipt };
  return result.receipt;
}

export async function fetchDeliveryReceipts(
  limit = 20,
  cursor?: string,
  sort: "requestedAt:asc" | "requestedAt:desc" | "status:asc" | "status:desc" = "requestedAt:desc"
): Promise<{ receipts: DeliveryReceipt[]; nextCursor?: string }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  params.set("sort", sort);
  return fetchJson<{ receipts: DeliveryReceipt[]; nextCursor?: string }>(`/api/integrations/receipts?${params.toString()}`);
}

export async function retryDeliveryReceipt(id: string, options: { confirmSameIdempotencyKey?: boolean; useNewIdempotencyKey?: boolean } = {}): Promise<DeliveryReceipt> {
  const response = await fetch(`/api/integrations/receipts/${encodeURIComponent(id)}/retry`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      confirmSameIdempotencyKey: options.confirmSameIdempotencyKey === true,
      useNewIdempotencyKey: options.useNewIdempotencyKey === true
    })
  });
  if (!response.ok) throw new Error("Delivery receipt retry failed");
  const result = (await response.json()) as { receipt: DeliveryReceipt };
  return result.receipt;
}

export async function fetchOperationsBacklog(dayKey: string, incidentId?: string): Promise<OperationsBacklogReport> {
  const params = new URLSearchParams({ dayKey });
  if (incidentId) params.set("incidentId", incidentId);
  const result = await fetchJson<{ report: OperationsBacklogReport }>(`/api/operations/report?${params.toString()}`);
  return result.report;
}

export async function fetchIncidentActionRecords(
  incidentId: string,
  limit = 20,
  cursor?: string,
  sort: "createdAt:asc" | "createdAt:desc" | "status:asc" | "status:desc" = "createdAt:desc"
): Promise<{ records: IncidentActionRecord[]; nextCursor?: string }> {
  const params = new URLSearchParams({ limit: String(limit), sort });
  if (cursor) params.set("cursor", cursor);
  return fetchJson<{ records: IncidentActionRecord[]; nextCursor?: string }>(`/api/incidents/${encodeURIComponent(incidentId)}/actions?${params.toString()}`);
}

export async function fetchIncidentRulePacks(): Promise<IncidentRulePack[]> {
  const result = await fetchJson<{ rulePacks: IncidentRulePack[] }>("/api/incident-rule-packs");
  return result.rulePacks;
}

export async function executeIncidentAction(payload: {
  incidentId: string;
  actionId: IncidentActionKind;
  body?: string;
  pluginId?: string;
}): Promise<{ actionRecord: IncidentActionRecord; receipt?: DeliveryReceipt; note?: InvestigationNote; packet?: string; nextWorkspace: IncidentWorkspace }> {
  const response = await fetch(`/api/incidents/${encodeURIComponent(payload.incidentId)}/actions/${encodeURIComponent(payload.actionId)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ body: payload.body, pluginId: payload.pluginId })
  });
  if (!response.ok) throw new Error("Incident action failed");
  return (await response.json()) as { actionRecord: IncidentActionRecord; receipt?: DeliveryReceipt; note?: InvestigationNote; packet?: string; nextWorkspace: IncidentWorkspace };
}

export async function diffReplayBundles(payload: { left: BundleExport; right: BundleExport }): Promise<ReplayBundleDiff> {
  const response = await fetch("/api/replay-bundles/diff", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Replay bundle diff failed");
  const result = (await response.json()) as { diff: ReplayBundleDiff };
  return result.diff;
}

export async function buildCloseoutPlan(payload: { dayKey: string; keepDays: number; exportTargets: string[] }): Promise<CloseoutPlan> {
  const response = await fetch("/api/closeout/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Closeout plan failed");
  const result = (await response.json()) as { plan: CloseoutPlan };
  return result.plan;
}

export async function completeCloseout(payload: { dayKey: string; exportTargets: string[] }): Promise<CloseoutCompletion> {
  const response = await fetch("/api/closeout/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = (await response.json()) as { completion: CloseoutCompletion };
  if (!response.ok) throw new Error(result.completion?.blockers?.join("; ") || "Closeout completion blocked");
  return result.completion;
}

export async function fetchRetentionClasses(): Promise<RetentionClass[]> {
  const result = await fetchJson<{ classes: RetentionClass[] }>("/api/retention/classes");
  return result.classes;
}

export async function saveRetentionClass(id: RetentionClass["id"], payload: { keepDays: number; includeRollback?: boolean }): Promise<RetentionClass> {
  const response = await fetch(`/api/retention/classes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Retention class save failed");
  const result = (await response.json()) as { retentionClass: RetentionClass };
  return result.retentionClass;
}

export async function previewRetentionByClass(): Promise<RetentionClassPreview[]> {
  const response = await fetch("/api/retention/preview-by-class", { method: "POST" });
  if (!response.ok) throw new Error("Retention by class preview failed");
  const result = (await response.json()) as { previews: RetentionClassPreview[] };
  return result.previews;
}

export async function fetchLineage(entryId: string): Promise<LineageRecord> {
  const result = await fetchJson<{ lineage: LineageRecord }>(`/api/lineage/${encodeURIComponent(entryId)}`);
  return result.lineage;
}

export async function fetchSummaryProfiles(): Promise<SummaryProfile[]> {
  const result = await fetchJson<{ profiles: SummaryProfile[] }>("/api/summaries/profiles");
  return result.profiles;
}

export async function generateSummaryProfile(profileId: SummaryProfile["id"], dayKey: string): Promise<GeneratedProfileSummary> {
  const response = await fetch(`/api/summaries/profiles/${encodeURIComponent(profileId)}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dayKey })
  });
  if (!response.ok) throw new Error("Summary profile generation failed");
  const result = (await response.json()) as { summary: GeneratedProfileSummary };
  return result.summary;
}

export async function runIntegrityMonitor(): Promise<IntegrityMonitorReport> {
  const response = await fetch("/api/integrity-monitor/run", { method: "POST" });
  if (!response.ok) throw new Error("Integrity monitor failed");
  const result = (await response.json()) as { report: IntegrityMonitorReport };
  return result.report;
}

export async function fetchIntegrityReports(): Promise<IntegrityMonitorReport[]> {
  const result = await fetchJson<{ reports: IntegrityMonitorReport[] }>("/api/integrity-monitor/reports");
  return result.reports;
}

export async function fetchAnalytics(): Promise<AnalyticsSnapshot> {
  const result = await fetchJson<{ analytics: AnalyticsSnapshot }>("/api/analytics");
  return result.analytics;
}

export async function fetchSlo(): Promise<SloSnapshot> {
  const result = await fetchJson<{ slo: SloSnapshot }>("/api/slo");
  return result.slo;
}

export async function fetchRunbook(): Promise<OperatorRunbook> {
  const result = await fetchJson<{ runbook: OperatorRunbook }>("/api/runbook");
  return result.runbook;
}

export async function fetchVerificationReceipts(): Promise<VerificationReceipt[]> {
  const result = await fetchJson<{ receipts: VerificationReceipt[] }>("/api/verification/receipts");
  return result.receipts;
}

export async function fetchReplay(incidentId: string): Promise<MissionReplay> {
  const result = await fetchJson<{ replay: MissionReplay }>(`/api/replay/${encodeURIComponent(incidentId)}`);
  return result.replay;
}

export async function fetchCorrelation(incidentId: string): Promise<CorrelationGraph> {
  const result = await fetchJson<{ graph: CorrelationGraph }>(`/api/correlation/${encodeURIComponent(incidentId)}`);
  return result.graph;
}

export async function fetchPlugins(): Promise<PluginManifest[]> {
  const result = await fetchJson<{ plugins: PluginManifest[] }>("/api/plugins");
  return result.plugins;
}

export async function registerPlugin(plugin: PluginManifest): Promise<PluginManifest> {
  const response = await fetch("/api/plugins/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(plugin)
  });
  if (!response.ok) throw new Error("Plugin registration failed");
  const result = (await response.json()) as { plugin: PluginManifest };
  return result.plugin;
}

export async function runPlugin(pluginId: string, options?: { dryRun?: boolean }): Promise<PluginExecutionResult> {
  const response = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dryRun: options?.dryRun === true })
  });
  if (!response.ok) throw new Error("Plugin run failed");
  const result = (await response.json()) as { result: PluginExecutionResult };
  return result.result;
}

export async function createReplayWorkspace(dayKey: string): Promise<ReplayWorkspace> {
  const response = await fetch(`/api/replay-workspaces/${encodeURIComponent(dayKey)}`, { method: "POST" });
  if (!response.ok) throw new Error("Replay workspace creation failed");
  const result = (await response.json()) as { workspace: ReplayWorkspace };
  return result.workspace;
}

export const selectableThemeIds: ThemeId[] = [...themeIds];

async function fetchJson<T>(url: string, options?: { signal?: AbortSignal }): Promise<T> {
  const response = options ? await fetch(url, options) : await fetch(url);
  if (!response.ok) {
    const degraded = response.headers.get("x-openclog-degraded");
    if (degraded === "endpoint_budget") {
      throw new Error("Endpoint budget reached: OpenClog is slowing expensive diagnostics so the local backend stays responsive.");
    }
    throw new Error(`Request failed: ${url}`);
  }
  return (await response.json()) as T;
}
