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

export type JournalFilterKey = "errors" | "approvals" | "tool_failures" | "session_starts" | "inter_session_messages" | "acks";

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
}

export interface SessionDrilldown {
  sessionKey: string;
  entries: JournalEntry[];
  toolCount: number;
  approvalCount: number;
  reconnectCount: number;
  sanitizedSummary?: string;
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
  handoffPacketIds?: string[];
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
  command: "verify" | "verify:gateway" | "verify:desktop-native" | "test:visual" | string;
  status: "passed" | "failed" | "unknown";
  startedAt: string;
  completedAt?: string;
  summary: string;
  artifactPath?: string;
  commitSha?: string;
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
}

export interface SummaryJobHistoryPanel {
  jobs: SummaryJobHistoryItem[];
  days: SummaryJobDayHistory[];
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
  gatewayReady: boolean;
  missingScopeCount: number;
  reconnectCount: number;
  backendRestartCount: number;
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
  route: "/api/summary-jobs" | "/api/incidents" | "/api/health";
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
}

export interface VerificationCenterReport {
  generatedAt: string;
  gates: VerificationCenterGate[];
  lastSuccessfulVerifyAt?: string;
  lastSuccessfulGatewayVerifyAt?: string;
  lastSuccessfulDesktopVerifyAt?: string;
  lastSuccessfulDocsCheckAt?: string;
  docsCheckedCommitSha?: string;
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
}

export interface DeliveryTargetHealth {
  target: DeliveryAdapterTarget;
  status: "ok" | "warning" | "blocked";
  detail: string;
  dryRunStatus: "passed" | "failed" | "missing";
  latestReceiptId?: string;
}

export interface IncidentTimelineEvent {
  id: string;
  dayKey: string;
  timestamp: string;
  kind: "incident" | "note" | "delivery_receipt" | "summary_job" | "verification_receipt";
  label: string;
  relatedId?: string;
}

export interface IncidentTimeline {
  startDayKey: string;
  endDayKey: string;
  events: IncidentTimelineEvent[];
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

export interface EscalationPlaybook {
  id: "missing-scopes" | "stale-summary" | "failed-dry-run" | "readiness-blocked";
  title: string;
  steps: string[];
}

export interface RoleAwareIncidentSimulation {
  id: "stale-backend" | "missing-scopes" | "delivery-dead-letter";
  role: "operator" | "incident-commander";
  title: string;
  liveSideEffects: false;
  expectedValidationSteps: string[];
}

export interface OperationsLedgerEntry {
  id: string;
  action: string;
  timestamp: string;
  status: "completed" | "failed" | "blocked" | "unknown";
  actor: "local-operator" | "openclog";
  targetId?: string;
  correlationId?: string;
  evidenceIds: string[];
}

export interface NativeTruthMonitorReport {
  status: OperationsGateStatus;
  checks: Array<{
    id: "api_health" | "gateway_readiness" | "launch_agent" | "backend_fingerprint" | "desktop_self_check";
    status: OperationsGateStatus;
    detail: string;
  }>;
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
  summaryJobHistory: SummaryJobHistoryPanel;
  incidentEvidenceChecklist: IncidentEvidenceChecklist;
  investigationBundlePreview: InvestigationBundlePreview;
  readinessHistory: ReadinessHistorySparkline;
  deliveryLedger: DeliveryLedger;
  deliveryTargetHealth: DeliveryTargetHealth[];
  incidentTimeline: IncidentTimeline;
  routePerformanceBudgets: RoutePerformanceBudget[];
  chaosScenarios: ChaosTestScenario[];
  recommendationRationales: RecommendationRationale[];
  verificationCenter: VerificationCenterReport;
  governedSdkManifests: GovernedSdkManifest[];
  evidenceQualityScores: EvidenceQualityScore[];
  guidedIncidentCommand: GuidedIncidentCommand;
  roleAwareSimulations: RoleAwareIncidentSimulation[];
  causalityGraph: CorrelationGraph;
  operationsLedger: { entries: OperationsLedgerEntry[] };
  nativeTruthMonitor: NativeTruthMonitorReport;
  policyRecommendationPacks: PolicyRecommendationPack[];
  escalationPlaybooks: EscalationPlaybook[];
}
