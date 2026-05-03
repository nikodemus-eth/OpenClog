import type { JournalDay } from "./types.js";

export const sampleJournalDay: JournalDay = {
  dayKey: "2026-05-02",
  title: "OpenClaw Journal",
  dateLabel: "Saturday, May 2, 2026",
  summary: "OpenClog is watching local OpenClaw activity. Live Gateway readiness appears in diagnostics after the backend handshake.",
  entries: [
    {
      id: "entry-1",
      dayKey: "2026-05-02",
      source: "system",
      kind: "system_status",
      title: "Journal ready",
      body: "Local persistence, redaction, and export paths are active.",
      timestamp: "2026-05-02T12:00:00.000Z",
      status: "success",
      severity: "info",
      redacted: true
    },
    {
      id: "entry-2",
      dayKey: "2026-05-02",
      source: "system",
      kind: "system_status",
      title: "Gateway boundary",
      body: "The browser receives only public API state; Gateway tokens stay server-side.",
      timestamp: "2026-05-02T12:02:00.000Z",
      status: "info",
      severity: "info",
      redacted: true
    }
  ],
  metrics: {
    sessionCount: 0,
    messageCount: 0,
    toolCallCount: 0,
    approvalCount: 0,
    errorCount: 0
  }
};
