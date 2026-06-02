export type JournalEntryKind =
  | "session_started"
  | "user_message"
  | "assistant_message"
  | "tool_call"
  | "tool_result"
  | "approval_requested"
  | "approval_resolved"
  | "system_status"
  | "error"
  | "note"
  | "summary";

export type JournalEntrySource = "user" | "openclaw" | "gateway" | "tool" | "system";

export type JournalEntryStatus =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "cancelled"
  | "approved"
  | "declined"
  | "info";

export type JournalSeverity = "info" | "warning" | "error";

export type JournalArtifactType = "file" | "url" | "diff" | "image" | "code" | "json" | "markdown";

export type JournalActionKind = "approve" | "decline" | "abort" | "retry" | "open" | "copy" | "summarize";

export interface JournalArtifact {
  id: string;
  type: JournalArtifactType;
  label: string;
  href?: string;
  preview?: string;
}

export interface JournalAction {
  id: string;
  label: string;
  kind: JournalActionKind;
  danger?: boolean;
}

export type JournalFilterKey = "errors" | "approvals" | "tool_failures" | "session_starts" | "inter_session_messages" | "acks" | "backfilled_openclaw";

export interface JournalFilterPreset {
  dayKey: string;
  filters: JournalFilterKey[];
  focusedEntryId?: string;
  grouped: boolean;
  themeId?: string;
}

export interface PinnedDayContext {
  note?: string;
  summary?: string;
  updatedAt: string;
}

export interface GeneratedSummary {
  summary: string;
  createdAt: string;
  source: "rules";
  lastEntryIncludedAt?: string;
  latestEntryObservedAt?: string;
  freshnessState?: "fresh" | "stale" | "unknown";
  summaryEvidenceCutoffAt?: string;
  newerEvidenceArrived?: boolean;
  newerEvidenceReason?: string;
}

export interface RetentionMetadata {
  keepDays?: number;
  lastAppliedAt?: string;
}

export interface JournalEntry {
  id: string;
  dayKey: string;
  sessionId?: string;
  source: JournalEntrySource;
  sourceLabel?: string;
  kind: JournalEntryKind;
  title: string;
  body?: string;
  timestamp: string;
  status?: JournalEntryStatus;
  severity?: JournalSeverity;
  actorLabel?: string;
  toolName?: string;
  approvalId?: string;
  artifacts?: JournalArtifact[];
  actions?: JournalAction[];
  rawEventHash?: string;
  backfilled?: boolean;
  importedAt?: string;
  redacted: boolean;
}

export interface JournalDayMetrics {
  sessionCount: number;
  messageCount: number;
  toolCallCount: number;
  approvalCount: number;
  errorCount: number;
  estimatedCostUsd?: number;
  tokenCount?: number;
}

export interface EvidenceCompleteness {
  present: number;
  total: number;
  summaryPresent: boolean;
  notesPresent: boolean;
  bundlePresent: boolean;
  incidentPresent: boolean;
  label: string;
}

export interface JournalDay {
  dayKey: string;
  title: string;
  dateLabel: string;
  summary?: string;
  pinnedContext?: PinnedDayContext;
  generatedSummary?: GeneratedSummary;
  retention?: RetentionMetadata;
  incidentIds?: string[];
  evidenceCompleteness?: EvidenceCompleteness;
  recoveredEvidenceBadge?: {
    label: string;
    entryCount: number;
    latestImportedAt?: string;
  };
  routeBudgetRegressions?: RouteBudgetRegression[];
  entries: JournalEntry[];
  metrics: JournalDayMetrics;
}

export interface AgentActivity {
  id: string;
  label: string;
  status: "idle" | "working";
  summary: string;
  sessionKey?: string;
  lastSeenAt?: string;
}

export interface ApprovalView {
  id: string;
  title: string;
  command: string;
  status: string;
  requestedAt?: string;
  sessionKey?: string;
}

export interface PersistableRedactedEvent {
  raw_event_redacted_json: string;
  raw_event_hash: string;
  redaction_report_json: string;
}

export interface GatewayEventLike {
  event: string;
  payload?: unknown;
  seq?: number;
}

export interface GatewayCallPlan {
  method: string;
  params: Record<string, unknown>;
}

export interface JournalSearchResult {
  entryId: string;
  dayKey: string;
  title: string;
  bodyPreview: string;
  matchSnippet?: string;
  matchFieldHints?: string[];
  kind: JournalEntryKind;
  status?: JournalEntryStatus;
  redactionReasons?: string[];
  recoveredEvidenceBadge?: {
    label: string;
    entryCount?: number;
    latestImportedAt?: string;
  };
}

export interface SessionDrilldown {
  sessionKey: string;
  entries: JournalEntry[];
  toolCount: number;
  approvalCount: number;
  reconnectCount: number;
  sanitizedSummary?: string;
  provenance?: {
    backfilled: boolean;
    sourceLabel?: string;
    importedAt?: string;
  };
}

export interface RetentionPolicy {
  keepDays: number;
  includeAudit: boolean;
  includeRedactedEvents: boolean;
  includeSummaries: boolean;
}

export interface RetentionPreview {
  keepDays: number;
  removedDayKeys: string[];
  removedEntryCount: number;
  removedSummaryCount: number;
  removedAuditCount: number;
  removedIncidentCount?: number;
  removedAlertCount?: number;
  removedBundleCount?: number;
}

export interface IntegrityReport {
  ok: boolean;
  checkedEntries: number;
  mismatchedEntryIds: string[];
  missingRedactedHashes: string[];
}

export interface AdapterEvent {
  id: string;
  adapterName: string;
  dayKey: string;
  title: string;
  body: string;
  timestamp: string;
  severity: JournalSeverity;
}

export interface AlertRule {
  id: string;
  kind: "reconnect_storm" | "approval_backlog" | "tool_failure_spike" | "stale_summary" | "unresolved_approval_age" | "repeated_receipt_failure";
  title: string;
  threshold: number;
  enabled: boolean;
}

export interface AlertFinding {
  ruleId: string;
  title: string;
  triggered: boolean;
  detail: string;
}

export interface RunbookSuggestion {
  id: string;
  title: string;
  summary: string;
  reason: string;
}

export interface IncidentSummary {
  id: string;
  title: string;
  summary: string;
  dayKeys: string[];
  entryIds: string[];
  createdAt: string;
  runbookSuggestions: RunbookSuggestion[];
  loopProgress?: IncidentLoopProgress;
  loopStageNotes?: Partial<Record<keyof IncidentLoopProgress, string>>;
  selectedTemplateId?: string;
  handoffPacketIds?: string[];
  investigationNoteCount?: number;
}

export interface InvestigationNote {
  id: string;
  dayKey: string;
  incidentId?: string;
  sessionKey?: string;
  author: string;
  body: string;
  linkedEntryIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchPreset {
  id: string;
  label: string;
  query: string;
}

export type SessionDrilldownTab = "timeline" | "actions" | "deliveries";

export interface SessionDrilldownViewState {
  sessionKey?: string;
  tab: SessionDrilldownTab;
  scrollTop: number;
}

export interface OperatorViewPreset {
  id: string;
  label: string;
  dayKey?: string;
  searchQuery: string;
  activeFilters: JournalFilterKey[];
  grouped: boolean;
  builtIn?: boolean;
  drilldown?: SessionDrilldownViewState;
  hypothesis?: string;
  validationSteps?: string[];
  evidenceCount?: number;
  unresolvedEvidenceCount?: number;
  staleSummaryCount?: number;
  lastSuccessfulSummaryAt?: string;
  exportVersion?: 1;
  redaction?: {
    redacted: true;
    redactedFields: string[];
  };
  persistedAcrossRestarts?: boolean;
  selectedGateId?: VerificationCenterGate["id"];
  lintFindings?: SavedViewLintFinding[];
  handoffSummary?: string;
  rolePreset?: "triage" | "release" | "delivery" | "verification";
}

export interface OpenClogSettings {
  version: 2;
  theme: string;
  showToolCalls: boolean;
  searchPresets: SearchPreset[];
  operatorViews: OperatorViewPreset[];
}

export type SummaryJobStatus = "queued" | "running" | "completed" | "failed";

export interface SummaryJob {
  id: string;
  dayKey: string;
  status: SummaryJobStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progressLabel: string;
  generatedSummary?: GeneratedSummary;
  error?: string;
  correlationId?: string;
  requestedBy?: string;
  reusedExistingJob?: boolean;
}

export interface BackendFingerprint {
  id: string;
  runtimeFingerprint: string;
  pid: number;
  bootedAt: string;
  commitSha: string;
  buildTimestamp: string;
  nodeVersion: string;
}

export type IncidentCauseCategory =
  | "sequence_gap"
  | "reconnect_storm"
  | "stale_summary"
  | "delivery_failure"
  | "integrity_mismatch"
  | "retention_risk"
  | "plugin_boundary"
  | "evidence_incomplete"
  | "unknown";

export interface IncidentLoopDetectState {
  title: string;
  summary: string;
  affectedDayKeys: string[];
  sessionKeys: string[];
  linkedEntryIds: string[];
  evidence: string[];
}

export interface IncidentLoopExplainState {
  category: IncidentCauseCategory;
  title: string;
  summary: string;
  evidence: string[];
  degraded: boolean;
}

export type IncidentRecommendationPriority = "high" | "medium" | "low";

export interface IncidentLoopRecommendation {
  id: string;
  title: string;
  rationale: string;
  priority: IncidentRecommendationPriority;
  actionId?: IncidentActionKind;
}

export type IncidentActionKind =
  | "rebuild_visible_state"
  | "open_raw_logs"
  | "open_replay"
  | "open_correlation"
  | "copy_incident_packet"
  | "deliver_slack"
  | "deliver_generic_webhook"
  | "deliver_email"
  | "create_github_issue"
  | "run_plugin"
  | "refresh_summary"
  | "save_note"
  | "record_closeout";

export type IncidentActionAvailability = "available" | "degraded" | "blocked";
export type IncidentActionConfirmation = "none" | "confirm";
export type IncidentActionStatus = "completed" | "failed";

export interface IncidentLoopAction {
  id: IncidentActionKind;
  label: string;
  description: string;
  availability: IncidentActionAvailability;
  confirmation: IncidentActionConfirmation;
  reason?: string;
  capabilityId?: string;
}

export interface IncidentActionRecord {
  id: string;
  incidentId: string;
  kind: IncidentActionKind;
  title: string;
  status: IncidentActionStatus;
  summary: string;
  createdAt: string;
  receiptId?: string;
  noteId?: string;
  exportId?: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentLoopRecordState {
  noteCount: number;
  latestReceiptIds: string[];
  latestExportId?: string;
  latestCloseoutAt?: string;
  actionRecords: IncidentActionRecord[];
}

export interface IncidentLoop {
  detect: IncidentLoopDetectState;
  explain: IncidentLoopExplainState;
  recommend: IncidentLoopRecommendation[];
  act: IncidentLoopAction[];
  record: IncidentLoopRecordState;
}

export interface IncidentLoopProgress {
  detect: boolean;
  explain: boolean;
  recommend: boolean;
  act: boolean;
  record: boolean;
}

export interface IncidentWorkspace {
  incident: IncidentSummary;
  entries: JournalEntry[];
  alertFindings: AlertFinding[];
  generatedSummary?: GeneratedSummary;
  notes: InvestigationNote[];
  sessionKeys: string[];
  suggestedNextActions: string[];
  loop: IncidentLoop;
}

export interface ReplayBundleDiff {
  changeClass: "unchanged" | "narrative_only" | "metadata_only" | "evidence_shape";
  leftDayKey: string;
  rightDayKey: string;
  addedEntryIds: string[];
  removedEntryIds: string[];
  summaryChanged: boolean;
  markdownChanged: boolean;
  entryCountDelta: number;
  changedManifestFields: string[];
  changedMetadataFields: string[];
}

export interface CloseoutPlan {
  dayKey: string;
  generatedSummaryFresh: boolean;
  retentionPreview: RetentionPreview;
  incidentCount: number;
  noteCount: number;
  exportTargets: string[];
  checklist: string[];
}

export interface CloseoutCompletion {
  id: string;
  dayKey: string;
  completedAt: string;
  blocked: boolean;
  checklist: string[];
  blockers: string[];
  exportTargets: string[];
}

export interface ProfileConfig {
  id: string;
  label: string;
  gatewayUrl?: string;
}

export interface IntegrationPayload {
  target: "github-issue" | "markdown-vault" | "incident-doc" | "slack" | "generic-webhook" | "email";
  title: string;
  body: string;
}

export interface DeliverySecretRef {
  backend: "macos-keychain" | "unsupported";
  key: string;
}

export interface DeliveryRequestOptions {
  incidentId?: string;
  idempotencyKey?: string;
  useNewIdempotencyKey?: boolean;
  dryRun?: boolean;
  secretRef?: DeliverySecretRef;
  forceNewAttempt?: boolean;
}

export type HealthHistoryCategory = "reconnect" | "sequence_gap" | "gateway_error" | "tool_failure" | "approval" | "info";

export interface HealthHistoryEntry {
  id: string;
  entryId: string;
  dayKey: string;
  title: string;
  timestamp: string;
  category: HealthHistoryCategory;
}

export type RetentionClassId =
  | "entries"
  | "alert_state"
  | "incidents"
  | "investigation_notes"
  | "summaries"
  | "bundle_exports"
  | "delivery_receipts"
  | "audit_log"
  | "analytics_integrity_plugin_runs";

export interface RetentionClassPolicy {
  keepDays: number;
  includeRollback: boolean;
}

export interface RetentionClass {
  id: RetentionClassId;
  label: string;
  description: string;
  policy: RetentionClassPolicy;
  updatedAt: string;
}

export interface RetentionClassPreviewImpact {
  beforeCount: number;
  afterCount: number;
  removedCount: number;
  affectedIds: string[];
}

export interface RetentionClassPreview {
  classId: RetentionClassId;
  label: string;
  impact: RetentionClassPreviewImpact;
}

export type DeliveryAdapterTarget = "slack" | "generic-webhook" | "email" | "github-issue";
export type DeliveryReceiptStatus = "delivered" | "failed";

export interface DeliveryAdapterConfig {
  target: DeliveryAdapterTarget;
  enabled: boolean;
  destinationLabel: string;
}

export interface DeliveryReceipt {
  id: string;
  target: DeliveryAdapterTarget;
  dayKey: string;
  incidentId?: string;
  pluginId?: string;
  title: string;
  status: DeliveryReceiptStatus;
  requestedAt: string;
  completedAt: string;
  correlationId: string;
  retryCount: number;
  attemptNumber?: number;
  retryOfReceiptId?: string;
  idempotencyKey?: string;
  dryRun?: boolean;
  secretRef?: DeliverySecretRef;
  requestFingerprint?: string;
  deliveryReference?: string;
  errorCategory?: "missing_config" | "network" | "authentication" | "validation" | "unknown";
  deadLetterReason?: string;
  retryPolicy?: {
    sameKeyRetryRequiresConfirmation: boolean;
    nextAttemptUsesNewIdempotencyKey: boolean;
    schedule?: string[];
    terminalAttemptRule?: string;
  };
  retryBackoffEvents?: DeliveryRetryBackoffEvent[];
}

export interface CapabilityGate {
  id: string;
  label: string;
  requiredScopes: string[];
  haveScopes: string[];
  missingScopes: string[];
  enabled: boolean;
  reason?: string;
}

export interface ControlReceipt {
  id: string;
  incidentId?: string;
  actionId: IncidentActionKind;
  intent: string;
  approvalPath: string[];
  executionResult: "completed" | "failed" | "blocked";
  downstreamAcknowledgement?: string;
  createdAt: string;
}

export interface HealthAggregate {
  createdAt: string;
  reconnectCount: number;
  staleCount: number;
  recoveryCount: number;
  adapterFailureCount: number;
  latestErrorCategory?: string;
}

export interface ServiceHealthTimelineEntry {
  id: string;
  timestamp: string;
  category: "reconnect" | "restart" | "stale" | "adapter_failure" | "recovery" | "integrity";
  title: string;
  detail: string;
  relatedId?: string;
}

export interface LineageRecord {
  entryId: string;
  rawEventHash?: string;
  incidentIds: string[];
  replayIds: string[];
  bundleExportIds: string[];
  deliveryReceiptIds: string[];
}

export interface SummaryCitation {
  entryId: string;
  title: string;
  timestamp: string;
}

export interface SummaryProfile {
  id: "default-operator" | "escalation" | "export";
  label: string;
  audience: string;
  instructions: string;
}

export interface GeneratedProfileSummary {
  profileId: SummaryProfile["id"];
  title: string;
  summary: string;
  citations: SummaryCitation[];
  createdAt: string;
}

export interface IntegrityMonitorReport {
  id: string;
  createdAt: string;
  ok: boolean;
  checks: Array<{
    id:
      | "schema_health"
      | "export_validity"
      | "rollback_viability"
      | "citation_validity"
      | "redaction_invariants"
      | "adapter_contract_validity"
      | "plugin_capability_boundary";
    ok: boolean;
    detail: string;
  }>;
}

export interface AnalyticsSnapshot {
  createdAt: string;
  noisyTools: Array<{ toolName: string; count: number }>;
  reconnectHeavyDays: Array<{ dayKey: string; reconnectCount: number }>;
  approvalHotspots: Array<{ dayKey: string; approvalCount: number }>;
  recurringFailureClasses: Array<{ label: string; count: number }>;
  provisionalMetrics?: boolean;
  cacheStateLabel?: string;
}

export interface ReplayStep {
  id: string;
  kind: "entry" | "approval" | "alert" | "note" | "delivery" | "derived";
  entryIds: string[];
  timestamp: string;
  label: string;
  derived: boolean;
  sourceIds: string[];
}

export interface MissionReplay {
  incidentId: string;
  title: string;
  generatedAt: string;
  steps: ReplayStep[];
}

export interface CorrelationNode {
  id: string;
  type: "session" | "entry" | "approval" | "alert" | "incident" | "note" | "bundle_export" | "delivery_receipt";
  label: string;
}

export interface CorrelationEdge {
  id: string;
  from: string;
  to: string;
  relationship: "includes" | "references" | "belongs_to" | "triggered_by" | "exported_to";
}

export interface CorrelationGraph {
  incidentId: string;
  nodes: CorrelationNode[];
  edges: CorrelationEdge[];
}

export type PluginCapability = "delivery_target" | "read_only_enricher" | "annotation";

export interface PluginManifest {
  id: string;
  label: string;
  version: string;
  capabilities: PluginCapability[];
  readScopes: Array<"entries" | "incidents" | "notes" | "exports">;
  actionIds?: IncidentActionKind[];
  supportsDryRun?: boolean;
  sandbox?: PluginSandboxManifest;
  validationStatus?: "valid" | "blocked";
  validationMessage?: string;
  purpose?: string;
  failureModes?: string[];
  auditProvenance?: string[];
  approvalSignature?: string;
  reviewBy?: string;
  expiresAt?: string;
}

export interface PluginSandboxManifest {
  capabilities: PluginCapability[];
  dryRunWritesOnly: boolean;
  auditedOutputs: boolean;
}

export interface PluginExecutionResult {
  id: string;
  pluginId: string;
  status: "completed" | "failed";
  createdAt: string;
  dryRun?: boolean;
  validated?: boolean;
  receiptId?: string;
  summary: string;
}

export interface BundleSignature {
  algorithm: "sha256";
  digest: string;
}

export interface BundleVerificationResult {
  verified: boolean;
  digest: string;
  reasons: string[];
  signature?: SignedBundleVerification;
}

export interface SignedBundleVerification {
  algorithm: "sha256";
  digest: string;
  signatureVerified: boolean;
  signer: "local-openclog";
}

export type MonitoringSourceKind = "gmail" | "blogwatcher" | "openclaw" | "manual";
export type MonitoringDecisionDisposition = "operator_note" | "incident_handoff";

export interface MonitoringImportProvenance {
  sourceWorkflow: MonitoringSourceKind[];
  sourcePath?: string;
  sourceHash: string;
  importedAt: string;
  lineNumbers: number[];
  redactionCount: number;
  redactedPaths: string[];
}

export interface MonitoringDecision {
  id: string;
  title: string;
  body: string;
  dayKey: string;
  disposition: MonitoringDecisionDisposition;
  source: MonitoringSourceKind;
  tags: string[];
  provenance: MonitoringImportProvenance;
}

export interface IncidentHandoffPacket {
  id: string;
  incidentId?: string;
  dayKey: string;
  title: string;
  summary: string;
  body: string;
  createdAt: string;
  deliveryTargets: DeliveryAdapterTarget[];
  provenance: MonitoringImportProvenance;
}

export interface MonitoringImportInput {
  markdown: string;
  dayKey?: string;
  incidentId?: string;
  importedAt?: string;
  sourcePath?: string;
  sourceWorkflow?: MonitoringSourceKind[];
  defaultDisposition?: MonitoringDecisionDisposition;
  updatePinnedContext?: boolean;
}

export interface MonitoringImportResult {
  batchId: string;
  importedAt: string;
  provenance: MonitoringImportProvenance;
  decisions: MonitoringDecision[];
  notes: InvestigationNote[];
  incidents: IncidentSummary[];
  handoffPackets: IncidentHandoffPacket[];
  pinnedContext?: PinnedDayContext;
}

export type CapabilityKind = "incident_action" | "delivery_target" | "plugin" | "governance_surface";
export type CapabilityManifestSource = "local_manifest" | "plugin_validation" | "derived";
export type CapabilityGateStatus = "available" | "blocked" | "expired" | "review_required";

export interface CapabilityManifest {
  id: string;
  kind: CapabilityKind;
  label: string;
  purpose: string;
  version: string;
  permissions: string[];
  failureModes: string[];
  auditProvenance: string[];
  approvalSignature?: string;
  reviewBy?: string;
  expiresAt?: string;
  source: CapabilityManifestSource;
  actionId?: IncidentActionKind;
  deliveryTarget?: DeliveryAdapterTarget;
  pluginId?: string;
}

export interface CapabilityUseGate {
  capabilityId: string;
  allowed: boolean;
  status: CapabilityGateStatus;
  blockers: string[];
  checkedAt: string;
}

export type CapabilityView = CapabilityManifest & {
  useGate: CapabilityUseGate;
};

export interface ReplayWorkspace {
  id: string;
  sourceDayKey: string;
  createdAt: string;
  entries: JournalEntry[];
  notes: InvestigationNote[];
  incidentIds: string[];
  verification: BundleVerificationResult;
}

export interface IncidentRulePack {
  id: string;
  label: string;
  rules: Array<{
    id: string;
    category: IncidentCauseCategory;
    title: string;
    rationale: string;
    actionId?: IncidentActionKind;
    priority: IncidentRecommendationPriority;
  }>;
}

export interface SloSnapshot {
  createdAt: string;
  gatewayFreshnessOk: boolean;
  staleSummaryCount: number;
  failedDeliveryCount: number;
  retryBacklogCount: number;
  reconnectHeavyDayCount: number;
  baselines?: Array<{ id: string; label: string; current: number; baseline: number; status: "ok" | "watch" | "breach" }>;
}

export interface OperatorRunbookSection {
  title: string;
  items: string[];
}

export interface OperatorRunbook {
  generatedAt: string;
  sections: OperatorRunbookSection[];
}

export interface VerificationReceipt {
  id: string;
  command: "verify" | "verify:gateway" | "verify:desktop-native" | "test:visual" | "test:smoke" | string;
  status: "passed" | "failed" | "unknown";
  startedAt: string;
  completedAt?: string;
  summary: string;
  artifactPath?: string;
  commitSha?: string;
  ageMs?: number;
  ageLabel?: string;
  freshness?: "fresh" | "aging" | "stale" | "unknown";
  durationMs?: number;
  requestFingerprint?: string;
}

export interface InvestigationWorkspace {
  id: string;
  title: string;
  summary: string;
  dayKeys: string[];
  incidentIds: string[];
  createdAt: string;
}

export interface RemoteOpsPolicy {
  enabled: boolean;
  environmentLabel: string;
  allowedOrigins: string[];
  secretAccess: "fail-closed";
}

export type OperationsGateStatus = "passed" | "warning" | "blocked" | "unknown";

export type NativeRunnerCheckStatus = "ok" | "degraded" | "failed" | "unknown";

export interface NativeRunnerCheck {
  id: "api_liveness" | "gateway_readiness" | "launch_agent" | "sqlite_integrity" | "secret_store" | "native_runner_history";
  status: NativeRunnerCheckStatus;
  detail: string;
}

export interface NativeRunnerHistoryItem {
  id: string;
  receiptId: string;
  createdAt: string;
  generatedAt: string;
  observedApiBase: string;
  divergenceSummary: string;
  status: OperationsGateStatus;
  checks: NativeRunnerCheck[];
  source: "desktop";
}

export interface SummaryJobHistoryItem extends SummaryJob {
  queuedForMs: number;
  runningForMs: number;
  totalMs: number;
  medianCompletionMs: number;
  failureReason?: string;
}

export interface SummaryJobDayHistory {
  dayKey: string;
  retries: number;
  failureReasons: string[];
  medianCompletionMs: number;
  queuedCount: number;
  runningCount: number;
  completedCount: number;
  failedCount: number;
}

export interface SummaryJobHistoryPanel {
  jobs: SummaryJobHistoryItem[];
  days: SummaryJobDayHistory[];
  totalJobCount: number;
  totalDayCount: number;
  queueDepth: number;
  oldestWaitingAgeMs?: number;
  oldestWaitingAgeLabel?: string;
  dedupedDayKeys?: string[];
}

export interface DeliveryRetryBackoffEvent {
  receiptId: string;
  attemptNumber: number;
  scheduledAt: string;
  delayLabel: string;
  usedNewIdempotencyKey: boolean;
  remainingRetries: number;
}

export interface AttentionNowDeltaMetric {
  id: "stale_summary" | "failed_receipt" | "blocked_gate" | "reconnect_storm" | "route_budget_breach";
  label: string;
  currentCount: number;
  previousCount: number;
  delta: number;
}

export interface AttentionNowDelta {
  summary: string;
  metrics: AttentionNowDeltaMetric[];
}

export interface VerificationReceiptLineage {
  id: string;
  command: string;
  requestFingerprint: string;
  latestFailedReceiptId?: string;
  latestPassingReceiptId?: string;
  status: "recovered" | "still-failing" | "passing-only";
  receiptIds: string[];
}

export interface RouteBudgetBurnItem {
  route: RoutePerformanceBudget["route"];
  severity: "minor" | "material" | "critical";
  frequency: number;
  deltaMs: number;
  previousDayDeltaMs: number;
  sevenDayBaselineDeltaMs: number;
}

export interface RouteBudgetBurnReport {
  generatedAt: string;
  items: RouteBudgetBurnItem[];
}

export interface SavedViewLintFinding {
  viewId: string;
  severity: "info" | "warning";
  message: string;
}

export interface SavedViewLintReport {
  findings: SavedViewLintFinding[];
}

export interface DeliveryTrendPoint {
  timestamp: string;
  failedCount: number;
  parityDriftCount: number;
  missingConfigCount: number;
}

export interface DeliveryTargetDrilldown {
  target: DeliveryAdapterTarget;
  paritySummary: string;
  retryHistory: DeliveryRetryBackoffEvent[];
  trendPoints: DeliveryTrendPoint[];
  schemaWarnings: string[];
  backoffPosture?: "stable" | "retrying" | "exhausted";
  parityDriftState?: "match" | "drift";
  latestReceiptId?: string;
  latestVerifiedAt?: string;
}

export interface CloseoutPacketPreview {
  summary: string;
  blockerSummaries: string[];
  lastPassingReceiptIds: string[];
  unresolvedEvidenceCount: number;
  redactionStatus: "bounded" | "warning";
  sourceSnapshotId?: string;
  sourceViewLabel?: string;
}

export interface IncidentEvidenceDigest {
  incidentId: string;
  digest: string;
  evidenceCount: number;
}

export interface SignedIncidentBundleManifest {
  incidentId: string;
  digest: string;
  signature: string;
  itemCount: number;
}

export interface MorningBriefArtifact {
  headline: string;
  bullets: string[];
  citations: string[];
}

export interface ReportFreshness {
  status: "newer_than_latest_receipt" | "older_than_latest_receipt" | "no_verification_receipts";
  summary: string;
  reportGeneratedAt: string;
  latestVerificationReceiptCompletedAt?: string;
  latestVerificationReceiptId?: string;
  latestVerificationReceiptCommand?: string;
  latestVerificationReceiptCommitSha?: string;
  freshnessThresholdMs?: number;
  staleByMs?: number;
  thresholdBreached?: boolean;
  latestSuccessfulVerifyPredatesHead?: boolean;
}

export interface ReportAssemblyTimingSection {
  id: string;
  label: string;
  durationMs: number;
}

export interface ReportAssemblyTiming {
  totalDurationMs: number;
  sections: ReportAssemblyTimingSection[];
  slowestSections: ReportAssemblyTimingSection[];
}

export interface HealthzEvidenceSummary {
  reportFreshness: ReportFreshness["status"];
  latestVerificationReceiptCommand?: string;
  freshnessThresholdMs?: number;
  staleByMs?: number;
  thresholdBreached?: boolean;
  latestSmokeCompletedAt?: string;
  queueDepth: number;
  oldestWaitingAgeLabel?: string;
  recoveredEvidenceProvisional: boolean;
  routeBudgetRegressionCount: number;
  closeoutBlockerCount?: number;
  blockedGateIds?: VerificationCenterGate["id"][];
  currentSnapshotId?: string;
  previousSnapshotId?: string;
}

export interface ReportDiff {
  available: boolean;
  summary: string;
  currentSnapshotId?: string;
  previousSnapshotId?: string;
  previousGeneratedAt?: string;
  changedFields: string[];
}

export interface ReportProvenance {
  currentSnapshotId?: string;
  previousSnapshotId?: string;
  sourceVerificationReceiptIds: string[];
  sourceSummaryJobIds: string[];
  sourceDeliveryReceiptIds: string[];
  lineageSummary: string;
}

export interface EvidenceDriftIssue {
  id: "recovered_entry_total" | "session_recovered_total" | "report_header_mismatch";
  severity: "info" | "warning";
  summary: string;
}

export interface EvidenceDriftReport {
  status: "stable" | "drifting" | "unavailable";
  summary: string;
  issues: EvidenceDriftIssue[];
  observationCount: number;
}

export interface SavedViewAuditEvent {
  id: string;
  viewId: string;
  label: string;
  action: "created" | "updated" | "used" | "applied" | "edited" | "deleted" | "exported";
  createdAt: string;
  detail: string;
}

export interface SavedViewAuditReport {
  events: SavedViewAuditEvent[];
  summary: string;
}

export interface PolicyPackSummary {
  environment: string;
  readOnlyBrowserAuthority: true;
  capabilityRuleCount: number;
  deliveryRuleCount: number;
}

export interface RetentionImpactSimulation {
  summary: string;
  removedDayCount: number;
  removedEntryCount: number;
}

export interface CausalityNarrative {
  summary: string;
  citedEvidenceIds: string[];
}

export interface IncidentEvidenceChecklistItem {
  id: "timeline" | "receipts" | "replay" | "correlation" | "notes" | "handoff_packet";
  label: string;
  present: boolean;
  evidenceIds: string[];
}

export interface IncidentEvidenceChecklist {
  incidentId: string;
  ready: boolean;
  items: IncidentEvidenceChecklistItem[];
}

export interface InvestigationBundlePreviewItem {
  id: string;
  label: string;
  kind: "timeline" | "receipt" | "replay" | "correlation" | "note" | "handoff" | "summary";
  redacted: boolean;
  evidenceIds: string[];
}

export interface InvestigationBundlePreview {
  incidentId?: string;
  dayKey: string;
  items: InvestigationBundlePreviewItem[];
  redactionWarnings: string[];
}

export interface ReadinessHistorySparklinePoint {
  timestamp: string;
  backendHealthy: boolean;
  gatewayReady: boolean;
  gatewayStatus: "ready" | "blocked" | "degraded";
  missingScopeCount: number;
  reconnectCount: number;
  backendRestartCount: number;
  reasonCodes: string[];
}

export interface ReadinessHistorySparkline {
  windowHours: 24;
  points: ReadinessHistorySparklinePoint[];
}

export interface DeliveryLedgerItem extends DeliveryReceipt {
  sameKeyRetryRequiresConfirmation: boolean;
}

export interface DeliveryLedger {
  items: DeliveryLedgerItem[];
}

export interface RoutePerformanceBudget {
  route: "/api/summary-jobs" | "/api/incidents" | "/api/health" | "/api/operations/report" | "/api/verification/receipts";
  budgetMs: number;
  observedMs: number;
  status: "ok" | "breach";
}

export interface ChaosTestScenario {
  id: "stale-backend-fingerprint" | "summary-poll-timeout" | "delivery-dead-letter";
  title: string;
  deterministic: true;
  expectedOutcome: string;
}

export interface RecommendationRationale {
  recommendationId: string;
  whyThisRecommendation: string;
  evidenceIds: string[];
  rulePackIds: string[];
}

export interface VerificationCenterGate {
  id:
    | "summary_freshness"
    | "delivery_dry_runs"
    | "replay_integrity"
    | "gateway_readiness"
    | "desktop_self_check"
    | "route_budgets";
  label: string;
  status: OperationsGateStatus;
  detail: string;
  evidenceIds: string[];
  ageMs?: number;
  ageLabel?: string;
  freshness?: VerificationReceipt["freshness"];
  blockingReasons: string[];
  nextSafeActions: string[];
  lastVerifiedAt?: string;
  agingSoon?: boolean;
  blockerSource?: "config" | "stale_evidence" | "capability_gate" | "desktop_unavailable" | "failing_evidence" | "unknown";
  copyableBlockerSummary?: string;
  lineageGroupId?: string;
}

export interface VerificationCenterReport {
  generatedAt: string;
  gates: VerificationCenterGate[];
  firstBlockedGateId?: VerificationCenterGate["id"];
  receipts: VerificationReceipt[];
  latestFailedReceipt?: VerificationReceipt;
  latestPassingReceipt?: VerificationReceipt;
  readinessScore: number;
  readinessLabel: "ready" | "warning" | "blocked";
  lastSuccessfulVerifyAt?: string;
  lastSuccessfulVerifyAgeLabel?: string;
  lastSuccessfulVerifyFreshness?: VerificationReceipt["freshness"];
  lastSuccessfulGatewayVerifyAt?: string;
  lastSuccessfulDesktopVerifyAt?: string;
  lastSuccessfulDocsCheckAt?: string;
  docsCheckedCommitSha?: string;
}

export interface AttentionNowItem {
  id:
    | "stale_summary"
    | "approval_backlog"
    | "repeated_receipt_failure"
    | "reconnect_event"
    | "route_budget_regression"
    | "failed_dry_run_delivery";
  severity: "info" | "warning" | "critical";
  label: string;
  detail: string;
  evidenceIds: string[];
  action: string;
}

export interface ReadinessAggregate {
  windowHours: 24 | 168;
  reconnectCount: number;
  staleCount: number;
  recoveryCount: number;
  failedDeliveryCount: number;
  summaryMedianCompletionMs: number;
  routeBudgetBreachCount: number;
  verificationFreshness: VerificationReceipt["freshness"];
}

export interface RouteBudgetRegression {
  route: RoutePerformanceBudget["route"];
  baselineMs: number;
  observedMs: number;
  deltaMs: number;
  severity: "watch" | "breach";
}

export interface CloseoutReadinessScore {
  score: number;
  label: "ready" | "warning" | "blocked";
  blockers: string[];
  requiredEvidenceFresh: boolean;
}

export interface VerificationReceiptDiff {
  command: string;
  failedReceiptId: string;
  passingReceiptId?: string;
  status: "still-failing" | "recovered";
  failedAt: string;
  passedAt?: string;
  failedCommitSha?: string;
  passingCommitSha?: string;
  commitChanged: boolean;
}

export interface ExportableOperatorView {
  id: string;
  label: string;
  evidenceCount: number;
  unresolvedEvidenceCount: number;
  staleSummaryCount?: number;
  lastSuccessfulSummaryAt?: string;
  redactedJson: string;
  newerEvidenceExists?: boolean;
  newerEvidenceReason?: string;
  persistedAcrossRestarts?: boolean;
  selectedGateId?: VerificationCenterGate["id"];
  lintFindings?: SavedViewLintFinding[];
  handoffSummary?: string;
  redactionSummary?: string;
}

export interface IncidentTemplate {
  id: "missing-scopes" | "reconnect-storm" | "delivery-dead-letter" | "stale-summary" | "route-budget-regression" | "recovered-evidence-changed-after-report-generation";
  title: string;
  summary: string;
  stageNotes: Record<keyof IncidentLoopProgress, string>;
  recommended?: boolean;
  recommendedBecause?: string;
  missingEvidenceKinds?: string[];
}

export interface DeliveryContractPreview {
  target: DeliveryAdapterTarget;
  dryRunSchema: string[];
  liveSchema: string[];
  idempotencyFields: string[];
  exactFieldCountMatch: boolean;
  missingInDryRun: string[];
  missingInLive: string[];
  paritySummary: string;
  schemaWarnings: string[];
  fieldDiffs?: Array<{ field: string; inDryRun: boolean; inLive: boolean }>;
}

export interface ReleaseReadinessGate {
  status: "ready" | "blocked";
  requiredCommands: string[];
  blockers: string[];
  whyBlocking: string[];
  staleAgeThresholdMinutes: number;
  evidenceIds: string[];
  narrative: string;
}

export interface GovernedSdkManifest {
  id: "slack" | "email" | "github" | "plugins";
  permissions: string[];
  expiresAt: string;
  supportsDryRun: boolean;
  failureModes: string[];
}

export interface EvidenceQualityScore {
  incidentId?: string;
  dayKey?: string;
  score: number;
  grade: "excellent" | "good" | "needs-work" | "blocked";
  freshness: number;
  completeness: number;
  provenance: number;
  actionOutcomeCoverage: number;
  reasons: string[];
}

export interface DeliveryTargetHealth {
  target: DeliveryAdapterTarget;
  status: "ok" | "warning" | "blocked";
  detail: string;
  dryRunStatus: "passed" | "failed" | "missing";
  latestReceiptId?: string;
  latestDryRunReceiptId?: string;
  lastVerifiedAt?: string;
  lastDryRunVerifiedAt?: string;
  lastVerifiedAgeLabel?: string;
  lastVerifiedFreshness?: VerificationReceipt["freshness"];
  receiptCount24h: number;
  failedCount24h: number;
  dryRunFailures24h: number;
  trend: "steady" | "degraded" | "improving";
  retryHistory: DeliveryRetryBackoffEvent[];
  nextRetryAt?: string;
  remainingRetries?: number;
  trendPoints?: DeliveryTrendPoint[];
  parityDriftState?: "match" | "drift";
  missingConfigCount7d?: number;
  healthScore?: number;
}

export interface ActiveHypothesis {
  id: string;
  label: string;
  hypothesis: string;
  validationSteps: string[];
  status?: "open" | "validated" | "resolved";
  evidenceIds?: string[];
  resolutionNote?: string;
}

export interface NativeCutoverPlan {
  status: "prep";
  artifactPath: string;
  summary: string;
  nextSteps: string[];
}

export interface IncidentTimelineEvent {
  id: string;
  dayKey: string;
  timestamp: string;
  kind: "incident" | "note" | "delivery_receipt" | "summary_job" | "verification_receipt";
  source: "human" | "gateway" | "summary_job" | "delivery";
  sourceLabel: string;
  label: string;
  relatedId?: string;
  reasonCode?: string;
}

export interface IncidentTimeline {
  startDayKey: string;
  endDayKey: string;
  events: IncidentTimelineEvent[];
  carriesAcrossDays?: boolean;
}

export interface GuidedIncidentCommandStage {
  id: "detect" | "explain" | "recommend" | "act" | "record";
  title: string;
  complete: boolean;
  blocked: boolean;
  detail: string;
}

export interface GuidedIncidentCommand {
  stages: GuidedIncidentCommandStage[];
}

export interface MorningCommandStep {
  id: "attention_now" | "blocked_gates" | "stale_summaries" | "delivery_failures" | "recovered_drift" | "release_gate";
  title: string;
  status: "ready" | "blocked" | "unavailable";
  detail: string;
}

export interface MorningCommandWorkflow {
  headline: string;
  steps: MorningCommandStep[];
}

export interface EscalationPlaybook {
  id: "missing-scopes" | "stale-summary" | "failed-dry-run" | "readiness-blocked";
  title: string;
  steps: string[];
}

export interface RoleAwareIncidentSimulation {
  id: "stale-backend" | "missing-scopes" | "delivery-dead-letter";
  role: "viewer" | "operator" | "admin" | "incident-commander";
  title: string;
  liveSideEffects: false;
  expectedValidationSteps: string[];
}

export interface OperationsLedgerEntry {
  id: string;
  kind: "report_generation" | "verification" | "delivery" | "incident_action" | "summary_job" | "native_runner";
  action: string;
  timestamp: string;
  status: "completed" | "failed" | "blocked" | "unknown";
  actor: "local-operator" | "openclog";
  targetId?: string;
  correlationId?: string;
  evidenceIds: string[];
  summary?: string;
}

export interface OperationsLedgerReport {
  entries: OperationsLedgerEntry[];
  totalEntryCount: number;
  truncated: boolean;
}

export interface NativeTruthMonitorReport {
  status: OperationsGateStatus;
  divergenceSummary?: string;
  latestRunner?: NativeRunnerHistoryItem;
  history?: NativeRunnerHistoryItem[];
  prepOnlyLabel?: string;
  failureTaxonomy?: Array<{
    id: NativeRunnerCheck["id"];
    category: "launch_agent" | "sqlite" | "api" | "secure_store" | "gateway" | "history";
    detail: string;
  }>;
  checks: Array<{
    id: "api_health" | "gateway_readiness" | "launch_agent" | "backend_fingerprint" | "desktop_self_check" | NativeRunnerCheck["id"];
    status: OperationsGateStatus;
    detail: string;
  }>;
}

export interface RouteBudgetHistoryObservation {
  id: string;
  route: RoutePerformanceBudget["route"];
  observedMs: number;
  budgetMs: number;
  recordedAt: string;
  source: "fixture" | "live" | "report";
}

export interface RouteBudgetHistorySummary {
  route: RoutePerformanceBudget["route"];
  baselineObservedMs: number;
  latestObservedMs: number;
  trendDirection: "improving" | "steady" | "regressing" | "new";
  observations: RouteBudgetHistoryObservation[];
}

export interface RecoveredEvidenceSummary {
  sourceLabel: string;
  entryCount: number;
  dayCount: number;
  dayKeys: string[];
  latestImportedAt?: string;
  provisionalMetrics?: boolean;
  cacheStateLabel?: string;
  provisionalReason?: string;
}

export interface PolicyRecommendationPack {
  id: "stale-backend" | "missing-scopes" | "failed-summaries" | "delivery-dead-letters";
  label: string;
  recommendations: RecommendationRationale[];
}

export interface OperationsBacklogReport {
  dayKey: string;
  incidentId?: string;
  generatedAt: string;
  reportFreshness: ReportFreshness;
  reportAssemblyTiming: ReportAssemblyTiming;
  healthzEvidence: HealthzEvidenceSummary;
  reportDiff: ReportDiff;
  reportProvenance: ReportProvenance;
  evidenceDrift: EvidenceDriftReport;
  recoveredEvidenceSummary?: RecoveredEvidenceSummary;
  attentionNow: AttentionNowItem[];
  attentionNowDelta: AttentionNowDelta;
  staleSummaryDayKeys: string[];
  summaryJobHistory: SummaryJobHistoryPanel;
  incidentEvidenceChecklist: IncidentEvidenceChecklist;
  investigationBundlePreview: InvestigationBundlePreview;
  readinessHistory: ReadinessHistorySparkline;
  readinessAggregates: ReadinessAggregate[];
  deliveryLedger: DeliveryLedger;
  deliveryTargetHealth: DeliveryTargetHealth[];
  incidentTimeline: IncidentTimeline;
  routePerformanceBudgets: RoutePerformanceBudget[];
  routeBudgetHistory?: {
    routes: RouteBudgetHistorySummary[];
  };
  routeBudgetRegressions: RouteBudgetRegression[];
  routeBudgetBurnReport: RouteBudgetBurnReport;
  chaosScenarios: ChaosTestScenario[];
  recommendationRationales: RecommendationRationale[];
  verificationCenter: VerificationCenterReport;
  verificationReceiptDiffs: VerificationReceiptDiff[];
  verificationReceiptLineage: VerificationReceiptLineage[];
  governedSdkManifests: GovernedSdkManifest[];
  evidenceQualityScores: EvidenceQualityScore[];
  closeoutReadiness: CloseoutReadinessScore;
  exportableViews: ExportableOperatorView[];
  savedViewLint: SavedViewLintReport;
  incidentTemplates: IncidentTemplate[];
  deliveryContractPreviews: DeliveryContractPreview[];
  deliveryTargetDrilldowns: DeliveryTargetDrilldown[];
  guidedIncidentCommand: GuidedIncidentCommand;
  roleAwareSimulations: RoleAwareIncidentSimulation[];
  causalityGraph: CorrelationGraph;
  causalityNarrative: CausalityNarrative;
  operationsLedger: OperationsLedgerReport;
  closeoutPacketPreview: CloseoutPacketPreview;
  incidentEvidenceDigest?: IncidentEvidenceDigest;
  signedIncidentBundleManifest?: SignedIncidentBundleManifest;
  morningBrief: MorningBriefArtifact;
  savedViewAudit: SavedViewAuditReport;
  morningCommand: MorningCommandWorkflow;
  nativeTruthMonitor: NativeTruthMonitorReport;
  policyRecommendationPacks: PolicyRecommendationPack[];
  policyPackSummary: PolicyPackSummary;
  escalationPlaybooks: EscalationPlaybook[];
  retentionImpact: RetentionPreview;
  retentionImpactSimulation: RetentionImpactSimulation;
  activeHypotheses: ActiveHypothesis[];
  nativeCutoverPlan: NativeCutoverPlan;
  releaseReadinessGate: ReleaseReadinessGate;
}
