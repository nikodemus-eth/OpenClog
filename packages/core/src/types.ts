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

export interface JournalDay {
  dayKey: string;
  title: string;
  dateLabel: string;
  summary?: string;
  entries: JournalEntry[];
  metrics: JournalDayMetrics;
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

