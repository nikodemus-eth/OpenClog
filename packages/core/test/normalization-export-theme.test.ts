import { describe, expect, test } from "vitest";
import {
  exportDayAsHtml,
  exportDayAsMarkdown,
  getTheme,
  getThemes,
  normalizeGatewayEvent,
  sampleJournalDay,
  themeIds
} from "../src/index.js";

describe("normalization, exports, and themes", () => {
  test("normalizes session, approval, tool, and gap events into journal entries", () => {
    expect(normalizeGatewayEvent({ event: "session.message", payload: { key: "s1", role: "user", text: "hello", ts: 1 } })).toMatchObject({
      kind: "user_message",
      source: "user",
      title: "User message",
      sessionId: "s1"
    });
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { key: "s1", toolName: "repo", status: "success", ts: 2 } })).toMatchObject({
      kind: "tool_result",
      toolName: "repo",
      status: "success"
    });
    expect(normalizeGatewayEvent({ event: "exec.approval.requested", payload: { id: "a1", request: { command: "ls" }, createdAtMs: 3 } })).toMatchObject({
      kind: "approval_requested",
      approvalId: "a1",
      status: "pending"
    });
    expect(normalizeGatewayEvent({ event: "sequence.gap", payload: { expected: 1, received: 3, ts: 4 } })).toMatchObject({
      kind: "system_status",
      severity: "warning"
    });
    expect(normalizeGatewayEvent({ event: "session.message", payload: { key: "s1", role: "assistant", text: "hi", ts: 5 } })).toMatchObject({
      kind: "assistant_message",
      source: "openclaw"
    });
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { key: "s1", toolName: "repo", status: "failed", body: "nope", ts: 6 } })).toMatchObject({
      status: "failed",
      severity: "error",
      body: "nope"
    });
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { key: "s1", toolName: "repo", status: "running", ts: 6 } })).toMatchObject({
      status: "running",
      body: "Called repo."
    });
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { key: "s1", toolName: "repo", status: "surprise", ts: 6 } })).toMatchObject({
      status: "info"
    });
    expect(normalizeGatewayEvent({ event: "exec.approval.resolved", payload: { id: "a1", decision: "deny", createdAtMs: 7 } })).toMatchObject({
      kind: "approval_resolved",
      status: "declined"
    });
    expect(normalizeGatewayEvent({ event: "exec.approval.resolved", payload: { id: "a2", decision: "allow-once", createdAtMs: 8 } })).toMatchObject({
      status: "approved"
    });
    expect(normalizeGatewayEvent({ event: "unknown.event", payload: "not-object" })).toMatchObject({
      kind: "system_status",
      body: "{}"
    });
  });

  test("exports day as Markdown and HTML without raw payload fields", () => {
    const markdown = exportDayAsMarkdown(sampleJournalDay);
    const html = exportDayAsHtml(sampleJournalDay);

    expect(markdown).toContain("# OpenClaw Journal");
    expect(markdown).toContain("Journal ready");
    expect(markdown).not.toContain("raw_event");
    expect(html).toContain("<article");
    expect(html).toContain("OpenClaw Journal");
    expect(html).not.toContain("raw_event");
  });

  test("exports sparse days with escaped HTML and without phantom status text", () => {
    const sparseDay = {
      dayKey: "2026-05-03",
      title: "A <careful> day",
      dateLabel: "Sunday, May 3, 2026",
      entries: [
        {
          id: "entry-1",
          dayKey: "2026-05-03",
          source: "system" as const,
          kind: "summary" as const,
          title: "Summary & closeout",
          timestamp: "2026-05-03T10:00:00.000Z",
          redacted: true
        }
      ],
      metrics: { sessionCount: 0, messageCount: 0, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
    };

    const markdown = exportDayAsMarkdown(sparseDay);
    const html = exportDayAsHtml(sparseDay);

    expect(markdown).toContain("- 2026-05-03T10:00:00.000Z - Summary & closeout\n");
    expect(markdown).not.toContain("(undefined)");
    expect(html).toContain("A &lt;careful&gt; day");
    expect(html).toContain("Summary &amp; closeout");
  });

  test("all themes preserve required safety surfaces", () => {
    expect(themeIds).toEqual(["default", "captains-log", "hearty-tale", "blackbeards-log"]);
    expect(getThemes()).toHaveLength(4);
    for (const themeId of themeIds) {
      const theme = getTheme(themeId);
      expect(theme.safety.alwaysShow).toEqual([
        "errors",
        "pending_approvals",
        "stale_gateway_state",
        "blocked_auth",
        "degraded_connectivity"
      ]);
      expect(theme.labels.appTitle.length).toBeGreaterThan(0);
      expect(theme.palette.danger).toMatch(/^#/);
    }
  });
});
