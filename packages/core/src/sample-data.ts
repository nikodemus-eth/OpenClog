import type { JournalDay } from "./types.js";

export const sampleJournalDay: JournalDay = {
  dayKey: "2026-05-02",
  title: "OpenClaw Journal",
  dateLabel: "Saturday, May 2, 2026",
  summary: "OpenClog is watching local activity in degraded mode until Gateway scopes are available.",
  entries: [
    {
      id: "entry-1",
      dayKey: "2026-05-02",
      source: "gateway",
      kind: "system_status",
      title: "Gateway degraded",
      body: "Missing operator.approvals scope.",
      timestamp: "2026-05-02T12:00:00.000Z",
      status: "failed",
      severity: "warning",
      redacted: true
    },
    {
      id: "entry-2",
      dayKey: "2026-05-02",
      source: "tool",
      kind: "tool_result",
      title: "Tool call",
      body: "Called get_repository_status.",
      timestamp: "2026-05-02T12:02:00.000Z",
      status: "success",
      toolName: "get_repository_status",
      redacted: true
    }
  ],
  metrics: {
    sessionCount: 1,
    messageCount: 2,
    toolCallCount: 1,
    approvalCount: 1,
    errorCount: 1
  }
};

