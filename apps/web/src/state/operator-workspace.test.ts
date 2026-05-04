import { describe, expect, test } from "vitest";
import type { JournalEntry, JournalFilterKey } from "@openclog/core";
import {
  applyEntryFilters,
  buildArchiveView,
  createHomeRouteState,
  findDayByCalendarValue,
  getInitialDiagnosticsCollapsedState,
  mergeDiagnosticsCollapsedState,
  isEntryMatchingFilter
} from "./operator-workspace.js";

function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: "entry-1",
    dayKey: "2026-05-03",
    source: "system",
    kind: "system_status",
    title: "System status",
    body: "System status body",
    timestamp: "2026-05-03T12:00:00.000Z",
    status: "info",
    severity: "info",
    redacted: true,
    ...overrides
  };
}

describe("archive helpers", () => {
  test("buildArchiveView exposes the newest seven logs and selected older day separately", () => {
    const days = Array.from({ length: 9 }, (_, index) => ({
      dayKey: `2026-05-0${9 - index}`,
      title: `Day ${9 - index}`,
      dateLabel: `2026-05-0${9 - index}`,
      summary: `Summary ${9 - index}`,
      metrics: { sessionCount: 1, messageCount: 1, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
    }));

    const view = buildArchiveView(days, "2026-05-01");

    expect(view.recentDays).toHaveLength(7);
    expect(view.recentDays.map((day) => day.dayKey)).toEqual([
      "2026-05-09",
      "2026-05-08",
      "2026-05-07",
      "2026-05-06",
      "2026-05-05",
      "2026-05-04",
      "2026-05-03"
    ]);
    expect(view.selectedOlderDay?.dayKey).toBe("2026-05-01");
  });

  test("findDayByCalendarValue returns an exact matching day key only", () => {
    const days = [
      { dayKey: "2026-05-03", title: "OpenClog Journal", dateLabel: "2026-05-03", summary: "", metrics: { sessionCount: 1, messageCount: 1, toolCallCount: 0, approvalCount: 0, errorCount: 0 } }
    ];

    expect(findDayByCalendarValue(days, "2026-05-03")?.dayKey).toBe("2026-05-03");
    expect(findDayByCalendarValue(days, "2026-05-04")).toBeNull();
  });

  test("buildArchiveView omits selectedOlderDay when the selection is already recent", () => {
    const days = [
      { dayKey: "2026-05-03", title: "OpenClog Journal", dateLabel: "2026-05-03", summary: "", metrics: { sessionCount: 1, messageCount: 1, toolCallCount: 0, approvalCount: 0, errorCount: 0 } },
      { dayKey: "2026-05-02", title: "OpenClog Journal", dateLabel: "2026-05-02", summary: "", metrics: { sessionCount: 1, messageCount: 1, toolCallCount: 0, approvalCount: 0, errorCount: 0 } }
    ];

    expect(buildArchiveView(days, "2026-05-03").selectedOlderDay).toBeNull();
  });

  test("buildArchiveView returns null when the selected day does not exist", () => {
    const days = [
      { dayKey: "2026-05-03", title: "OpenClog Journal", dateLabel: "2026-05-03", summary: "", metrics: { sessionCount: 1, messageCount: 1, toolCallCount: 0, approvalCount: 0, errorCount: 0 } }
    ];

    expect(buildArchiveView(days, "2026-04-30").selectedOlderDay).toBeNull();
  });
});

describe("timeline filtering", () => {
  const entries = [
    makeEntry({ id: "error", severity: "error", status: "failed", title: "Gateway degraded" }),
    makeEntry({ id: "approval", kind: "approval_requested", title: "Approval requested" }),
    makeEntry({ id: "tool-failure", source: "tool", kind: "tool_result", severity: "error", status: "failed", toolName: "run_diagnostics", title: "Tool failed" }),
    makeEntry({ id: "session-start", kind: "session_started", title: "Session started" }),
    makeEntry({ id: "inter-session", source: "system", kind: "note", title: "Inter-session handoff", body: "Inter-session message for the next operator." }),
    makeEntry({ id: "ack", source: "gateway", kind: "assistant_message", title: "ACK", body: "Acknowledged by Gateway.", status: "success" }),
    makeEntry({ id: "tool-call", source: "tool", kind: "tool_call", title: "Tool call", body: "Called get_repository_status." })
  ];

  test("active filters hide matching categories", () => {
    const filtered = applyEntryFilters(entries, ["errors", "acks"], true);
    expect(filtered.map((entry) => entry.id)).toEqual(["approval", "session-start", "inter-session", "tool-call"]);
  });

  test("no hidden categories shows all entries except hidden tool calls", () => {
    const filtered = applyEntryFilters(entries, [], false);
    expect(filtered.map((entry) => entry.id)).toEqual(["error", "approval", "session-start", "inter-session", "ack"]);
  });

  test("all categories hidden removes all timeline entries", () => {
    const allFilters: JournalFilterKey[] = ["errors", "approvals", "tool_failures", "session_starts", "inter_session_messages", "acks"];
    const filtered = applyEntryFilters(entries, allFilters, false);
    expect(filtered.map((entry) => entry.id)).toEqual([]);
  });

  test("tool failure filter hides failed tool results even when raw tool calls are already hidden", () => {
    const filtered = applyEntryFilters(entries, ["tool_failures"], false);
    expect(filtered.map((entry) => entry.id)).toEqual(["error", "approval", "session-start", "inter-session", "ack"]);
  });

  test("inter-session and ack matchers use existing entry metadata", () => {
    expect(isEntryMatchingFilter(entries[4], "inter_session_messages")).toBe(true);
    expect(isEntryMatchingFilter(entries[5], "acks")).toBe(true);
    expect(isEntryMatchingFilter(entries[0], "acks")).toBe(false);
  });

  test("approval and session-start matchers cover alternate matching branches", () => {
    expect(isEntryMatchingFilter(makeEntry({ kind: "approval_resolved", title: "Approval resolved" }), "approvals")).toBe(true);
    expect(isEntryMatchingFilter(makeEntry({ kind: "session_started", title: "Session started" }), "session_starts")).toBe(true);
    expect(isEntryMatchingFilter(makeEntry({ source: "system", kind: "note", title: "Shift handoff", body: undefined }), "inter_session_messages")).toBe(true);
    expect(isEntryMatchingFilter(makeEntry({ title: "Acknowledged", body: undefined }), "acks")).toBe(true);
  });
});

describe("route and diagnostics helpers", () => {
  test("home route resets to newest day and clears day-specific focus state", () => {
    expect(
      createHomeRouteState("2026-05-03", {
        activeFilters: ["errors", "acks"],
        focusedEntryId: "entry-7",
        grouped: false,
        searchQuery: "gateway",
        selectedDayKey: "2026-05-02"
      })
    ).toEqual({
      activeFilters: [],
      focusedEntryId: null,
      grouped: false,
      searchQuery: "",
      selectedDayKey: "2026-05-03"
    });
  });

  test("diagnostics collapse defaults prioritize approvals and gateway", () => {
    expect(getInitialDiagnosticsCollapsedState(2).pendingApprovals).toBe(false);
    expect(getInitialDiagnosticsCollapsedState(0).pendingApprovals).toBe(false);
    expect(getInitialDiagnosticsCollapsedState(0).gateway).toBe(false);
    expect(getInitialDiagnosticsCollapsedState(0).agentActivity).toBe(false);
    expect(getInitialDiagnosticsCollapsedState(0).todayAtGlance).toBe(false);
    expect(getInitialDiagnosticsCollapsedState(0).timelineFilters).toBe(false);
  });

  test("diagnostics collapse persistence merges stored booleans without losing defaults", () => {
    expect(
      mergeDiagnosticsCollapsedState(getInitialDiagnosticsCollapsedState(0), {
        gateway: true,
        customCard: false,
        invalid: "yes"
      })
    ).toEqual({
      pendingApprovals: false,
      gateway: true,
      agentActivity: false,
      recentTools: false,
      todayAtGlance: false,
      timelineFilters: false,
      customCard: false
    });
  });

  test("diagnostics collapse persistence falls back to defaults when no stored state exists", () => {
    expect(mergeDiagnosticsCollapsedState(getInitialDiagnosticsCollapsedState(0), null)).toEqual({
      pendingApprovals: false,
      gateway: false,
      agentActivity: false,
      recentTools: false,
      todayAtGlance: false,
      timelineFilters: false
    });
  });
});
