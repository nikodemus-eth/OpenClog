import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const journalDays = sqliteTable("journal_days", {
  dayKey: text("day_key").primaryKey(),
  title: text("title").notNull(),
  dateLabel: text("date_label").notNull(),
  summary: text("summary"),
  metricsJson: text("metrics_json").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const journalEntries = sqliteTable("journal_entries", {
  id: text("id").primaryKey(),
  dayKey: text("day_key").notNull(),
  sessionId: text("session_id"),
  source: text("source").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  timestamp: text("timestamp").notNull(),
  status: text("status"),
  severity: text("severity"),
  actorLabel: text("actor_label"),
  toolName: text("tool_name"),
  approvalId: text("approval_id"),
  rawEventRedactedJson: text("raw_event_redacted_json"),
  rawEventHash: text("raw_event_hash"),
  redactionReportJson: text("redaction_report_json"),
  redacted: integer("redacted").notNull().default(1),
  entryJson: text("entry_json").notNull()
});

export const journalEntryArtifacts = sqliteTable("journal_entry_artifacts", {
  id: text("id").primaryKey(),
  entryId: text("entry_id").notNull(),
  artifactJson: text("artifact_json").notNull()
});

export const journalSessions = sqliteTable("journal_sessions", {
  id: text("id").primaryKey(),
  sessionKey: text("session_key").notNull(),
  dayKey: text("day_key").notNull(),
  sessionJson: text("session_json").notNull()
});

export const journalApprovals = sqliteTable("journal_approvals", {
  id: text("id").primaryKey(),
  entryId: text("entry_id"),
  status: text("status").notNull(),
  requestedAt: text("requested_at").notNull(),
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by"),
  requestJson: text("request_json"),
  resultJson: text("result_json")
});

export const journalDailySummaries = sqliteTable("journal_daily_summaries", {
  dayKey: text("day_key").primaryKey(),
  summary: text("summary").notNull(),
  createdAt: text("created_at").notNull()
});

export const journalPinnedContext = sqliteTable("journal_pinned_context", {
  dayKey: text("day_key").primaryKey(),
  contextJson: text("context_json").notNull()
});

export const journalIncidents = sqliteTable("journal_incidents", {
  id: text("id").primaryKey(),
  incidentJson: text("incident_json").notNull()
});

export const journalInvestigationNotes = sqliteTable("journal_investigation_notes", {
  id: text("id").primaryKey(),
  dayKey: text("day_key").notNull(),
  incidentId: text("incident_id"),
  updatedAt: text("updated_at").notNull(),
  noteJson: text("note_json").notNull()
});

export const journalAlertRules = sqliteTable("journal_alert_rules", {
  id: text("id").primaryKey(),
  ruleJson: text("rule_json").notNull()
});

export const journalAdapterEvents = sqliteTable("journal_adapter_events", {
  id: text("id").primaryKey(),
  adapterEventJson: text("adapter_event_json").notNull()
});

export const journalProfiles = sqliteTable("journal_profiles", {
  id: text("id").primaryKey(),
  profileJson: text("profile_json").notNull()
});

export const journalRetentionSnapshots = sqliteTable("journal_retention_snapshots", {
  id: text("id").primaryKey(),
  snapshotJson: text("snapshot_json").notNull()
});

export const journalAlertStates = sqliteTable("journal_alert_states", {
  id: text("id").primaryKey(),
  stateJson: text("state_json").notNull()
});

export const journalSettings = sqliteTable("journal_settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull()
});

export const journalDeliveryReceipts = sqliteTable("journal_delivery_receipts", {
  id: text("id").primaryKey(),
  requestedAt: text("requested_at"),
  dayKey: text("day_key"),
  incidentId: text("incident_id"),
  target: text("target"),
  receiptJson: text("receipt_json").notNull()
});

export const journalLineage = sqliteTable("journal_lineage", {
  entryId: text("entry_id").primaryKey(),
  lineageJson: text("lineage_json").notNull()
});

export const journalRetentionClasses = sqliteTable("journal_retention_classes", {
  id: text("id").primaryKey(),
  retentionClassJson: text("retention_class_json").notNull()
});

export const journalSummaryProfiles = sqliteTable("journal_summary_profiles", {
  id: text("id").primaryKey(),
  profileId: text("profile_id"),
  dayKey: text("day_key"),
  summaryJson: text("summary_json").notNull()
});

export const journalIntegrityReports = sqliteTable("journal_integrity_reports", {
  id: text("id").primaryKey(),
  reportJson: text("report_json").notNull()
});

export const journalAnalyticsSnapshots = sqliteTable("journal_analytics_snapshots", {
  id: text("id").primaryKey(),
  snapshotJson: text("snapshot_json").notNull()
});

export const journalCorrelationGraph = sqliteTable("journal_correlation_graph", {
  id: text("id").primaryKey(),
  graphJson: text("graph_json").notNull()
});

export const journalPlugins = sqliteTable("journal_plugins", {
  id: text("id").primaryKey(),
  pluginJson: text("plugin_json").notNull()
});

export const journalPluginRuns = sqliteTable("journal_plugin_runs", {
  id: text("id").primaryKey(),
  pluginId: text("plugin_id"),
  runJson: text("run_json").notNull()
});

export const journalBundleExports = sqliteTable("journal_bundle_exports", {
  id: text("id").primaryKey(),
  exportJson: text("export_json").notNull()
});

export const journalBackendFingerprints = sqliteTable("journal_backend_fingerprints", {
  id: text("id").primaryKey(),
  runtimeFingerprint: text("runtime_fingerprint").notNull(),
  bootedAt: text("booted_at").notNull(),
  fingerprintJson: text("fingerprint_json").notNull()
});

export const journalCloseoutCompletions = sqliteTable("journal_closeout_completions", {
  id: text("id").primaryKey(),
  dayKey: text("day_key").notNull(),
  completedAt: text("completed_at").notNull(),
  completionJson: text("completion_json").notNull()
});

export const journalVerificationReceipts = sqliteTable("journal_verification_receipts", {
  id: text("id").primaryKey(),
  command: text("command").notNull(),
  status: text("status").notNull(),
  completedAt: text("completed_at").notNull(),
  receiptJson: text("receipt_json").notNull()
});

export const journalNativeRunnerHistory = sqliteTable("journal_native_runner_history", {
  id: text("id").primaryKey(),
  createdAt: text("created_at").notNull(),
  runnerJson: text("runner_json").notNull()
});

export const journalInvestigationWorkspaces = sqliteTable("journal_investigation_workspaces", {
  id: text("id").primaryKey(),
  workspaceJson: text("workspace_json").notNull()
});

export const journalSummaryJobs = sqliteTable("journal_summary_jobs", {
  id: text("id").primaryKey(),
  dayKey: text("day_key").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  jobJson: text("job_json").notNull()
});

export const journalReplayWorkspaces = sqliteTable("journal_replay_workspaces", {
  id: text("id").primaryKey(),
  dayKey: text("day_key").notNull(),
  workspaceJson: text("workspace_json").notNull()
});

export const journalIncidentActionRecords = sqliteTable("journal_incident_action_records", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull(),
  createdAt: text("created_at").notNull(),
  recordJson: text("record_json").notNull()
});

export const journalCapabilities = sqliteTable("journal_capabilities", {
  id: text("id").primaryKey(),
  capabilityJson: text("capability_json").notNull()
});

export const journalIncidentHandoffPackets = sqliteTable("journal_incident_handoff_packets", {
  id: text("id").primaryKey(),
  dayKey: text("day_key").notNull(),
  incidentId: text("incident_id"),
  createdAt: text("created_at").notNull(),
  packetJson: text("packet_json").notNull()
});

export const journalAuditLog = sqliteTable("journal_audit_log", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  actor: text("actor").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  timestamp: text("timestamp").notNull(),
  metadataJson: text("metadata_json")
});

export const journalTableNames = [
  "journal_adapter_events",
  "journal_alert_rules",
  "journal_alert_states",
  "journal_analytics_snapshots",
  "journal_approvals",
  "journal_audit_log",
  "journal_backend_fingerprints",
  "journal_bundle_exports",
  "journal_capabilities",
  "journal_closeout_completions",
  "journal_correlation_graph",
  "journal_daily_summaries",
  "journal_days",
  "journal_delivery_receipts",
  "journal_entries",
  "journal_entry_artifacts",
  "journal_evidence_drift_observations",
  "journal_incident_action_records",
  "journal_incident_handoff_packets",
  "journal_incident_templates",
  "journal_incidents",
  "journal_integrity_reports",
  "journal_investigation_notes",
  "journal_investigation_workspaces",
  "journal_lineage",
  "journal_native_runner_history",
  "journal_operations_report_snapshots",
  "journal_pinned_context",
  "journal_plugin_runs",
  "journal_plugins",
  "journal_profiles",
  "journal_readiness_snapshots",
  "journal_replay_workspaces",
  "journal_retention_classes",
  "journal_retention_snapshots",
  "journal_route_budget_observations",
  "journal_saved_view_audit_events",
  "journal_sessions",
  "journal_settings",
  "journal_settings_history",
  "journal_signed_bundle_manifests",
  "journal_summary_jobs",
  "journal_summary_profiles",
  "journal_verification_receipts"
] as const;
