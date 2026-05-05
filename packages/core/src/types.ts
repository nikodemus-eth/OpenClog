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
  kind: "reconnect_storm" | "approval_backlog" | "tool_failure_spike";
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

export interface OperatorViewPreset {
  id: string;
  label: string;
  dayKey?: string;
  searchQuery: string;
  activeFilters: JournalFilterKey[];
  grouped: boolean;
}

export interface OpenClogSettings {
  version: 2;
  theme: string;
  showToolCalls: boolean;
  searchPresets: SearchPreset[];
  operatorViews: OperatorViewPreset[];
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
  deliveryReference?: string;
  errorCategory?: "missing_config" | "network" | "authentication" | "validation" | "unknown";
  deadLetterReason?: string;
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
}

export interface PluginExecutionResult {
  id: string;
  pluginId: string;
  status: "completed" | "failed";
  createdAt: string;
  summary: string;
}
