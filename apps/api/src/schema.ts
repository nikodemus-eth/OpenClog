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

export const journalSettings = sqliteTable("journal_settings", {
  key: text("key").primaryKey(),
  valueJson: text("value_json").notNull()
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
  "journal_approvals",
  "journal_audit_log",
  "journal_daily_summaries",
  "journal_days",
  "journal_entries",
  "journal_entry_artifacts",
  "journal_sessions",
  "journal_settings"
] as const;
