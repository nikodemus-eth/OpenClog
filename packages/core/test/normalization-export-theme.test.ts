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
    expect(
      normalizeGatewayEvent({
        event: "exec.approval.requested",
        payload: { id: "a2", sessionKey: "agent:hugin:main", request: { command: "pwd" }, createdAtMs: 3 }
      })
    ).toMatchObject({
      approvalId: "a2",
      sessionId: "agent:hugin:main"
    });
    expect(normalizeGatewayEvent({ event: "sequence.gap", payload: { expected: 1, received: 3, ts: 4 } })).toMatchObject({
      kind: "system_status",
      severity: "warning"
    });
    expect(normalizeGatewayEvent({ event: "session.message", payload: { key: "s1", role: "assistant", text: "hi", ts: 5 } })).toMatchObject({
      kind: "assistant_message",
      source: "openclaw"
    });
    expect(
      normalizeGatewayEvent({
        event: "session.message",
        payload: {
          sessionKey: "agent:hugin:dashboard:1",
          message: { role: "assistant", content: [{ type: "text", text: "pong token=abc" }], timestamp: "2026-05-02T13:00:00.000Z" },
          messageSeq: 2
        }
      })
    ).toMatchObject({
      kind: "assistant_message",
      source: "openclaw",
      sessionId: "agent:hugin:dashboard:1",
      body: "pong token=[REDACTED_SECRET]",
      timestamp: "2026-05-02T13:00:00.000Z"
    });
    expect(
      normalizeGatewayEvent({
        event: "chat",
        payload: {
          sessionKey: "agent:hugin:dashboard:1",
          message: { role: "assistant", content: "streamed hello", timestamp: "2026-05-02T13:01:00.000Z" },
          seq: 1
        }
      })
    ).toMatchObject({ kind: "assistant_message", body: "streamed hello" });
    expect(
      normalizeGatewayEvent({
        event: "session.message",
        payload: {
          sessionKey: "agent:hugin:dashboard:2",
          message: { role: "assistant", content: [{ type: "text", content: "fallback content" }] }
        }
      })
    ).toMatchObject({ body: "fallback content" });
    expect(
      normalizeGatewayEvent({
        event: "session.message",
        payload: { sessionKey: "agent:hugin:dashboard:3", message: { role: "user", content: "ping" }, messageSeq: 1 }
      }).id
    ).toBe(
      normalizeGatewayEvent({
        event: "session.message",
        payload: { sessionKey: "agent:hugin:dashboard:3", message: { role: "user", content: "ping" }, messageSeq: 1, messageId: "later-id" }
      }).id
    );
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { key: "s1", toolName: "repo", status: "failed", body: "nope", ts: 6 } })).toMatchObject({
      status: "failed",
      severity: "error",
      body: "nope"
    });
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { sessionKey: "s2", data: { name: "shell", text: "started", phase: "running" }, ts: 6 } })).toMatchObject({
      sessionId: "s2",
      toolName: "shell",
      status: "running",
      body: "started"
    });
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { sessionKey: "s3", data: { name: "shell", result: "token=abc", phase: "error" }, ts: 6 } })).toMatchObject({
      status: "info",
      severity: "error",
      body: "token=[REDACTED_SECRET]"
    });
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { key: "s1", toolName: "repo", status: "running", ts: 6 } })).toMatchObject({
      status: "running",
      body: "Called repo."
    });
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { sessionKey: "s4", data: { name: "search" }, ts: 6 } })).toMatchObject({
      toolName: "search",
      body: "Called search."
    });
    expect(normalizeGatewayEvent({ event: "session.tool", payload: { key: "s1", toolName: "repo", status: "surprise", ts: 6 } })).toMatchObject({
      status: "info"
    });
    expect(normalizeGatewayEvent({ event: "exec.approval.resolved", payload: { id: "a1", decision: "deny", createdAtMs: 7 } })).toMatchObject({
      kind: "approval_resolved",
      status: "declined"
    });
    expect(normalizeGatewayEvent({ event: "exec.approval.resolved", payload: { id: "a2", decision: "allow-once", sessionKey: "agent:hugin:main", createdAtMs: 8 } })).toMatchObject({
      sessionId: "agent:hugin:main",
      status: "approved"
    });
    expect(normalizeGatewayEvent({ event: "exec.approval.resolved", payload: { id: "a3", decision: "allow-once", createdAtMs: 8 } })).toMatchObject({
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

    expect(markdown).toContain("# OpenClog Journal");
    expect(markdown).toContain("Journal ready");
    expect(markdown).not.toContain("raw_event");
    expect(html).toContain("<article");
    expect(html).toContain("OpenClog Journal");
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

  test("collapses textless structured OpenClaw responses in exports", () => {
    const day = {
      dayKey: "2026-05-03",
      title: "OpenClog Journal",
      dateLabel: "Sunday, May 3, 2026",
      entries: [
        {
          id: "assistant-1",
          dayKey: "2026-05-03",
          source: "openclaw" as const,
          kind: "assistant_message" as const,
          title: "OpenClaw response",
          body: "",
          timestamp: "2026-05-03T10:00:00.000Z",
          status: "info" as const,
          severity: "info" as const,
          redacted: true
        },
        {
          id: "assistant-2",
          dayKey: "2026-05-03",
          source: "openclaw" as const,
          kind: "assistant_message" as const,
          title: "OpenClaw response",
          body: "   ",
          timestamp: "2026-05-03T10:00:01.000Z",
          status: "info" as const,
          severity: "info" as const,
          redacted: true
        },
        {
          id: "assistant-3",
          dayKey: "2026-05-03",
          source: "openclaw" as const,
          kind: "assistant_message" as const,
          title: "OpenClaw response",
          body: "Visible answer",
          timestamp: "2026-05-03T10:01:00.000Z",
          status: "info" as const,
          severity: "info" as const,
          redacted: true
        }
      ],
      metrics: { sessionCount: 1, messageCount: 3, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
    };

    const markdown = exportDayAsMarkdown(day);
    const html = exportDayAsHtml(day);

    expect(markdown).toContain("2 structured OpenClaw responses omitted from export");
    expect(markdown).toContain("Visible answer");
    expect(markdown).not.toContain("- 2026-05-03T10:00:01.000Z - OpenClaw response");
    expect(html).toContain("2 structured OpenClaw responses omitted from export");
  });

  test("collapses a single textless structured OpenClaw response in exports", () => {
    const day = {
      dayKey: "2026-05-03",
      title: "OpenClog Journal",
      dateLabel: "Sunday, May 3, 2026",
      entries: [
        {
          id: "assistant-1",
          dayKey: "2026-05-03",
          source: "openclaw" as const,
          kind: "assistant_message" as const,
          title: "OpenClaw response",
          body: "",
          timestamp: "2026-05-03T10:00:00.000Z",
          status: "info" as const,
          severity: "info" as const,
          redacted: true
        }
      ],
      metrics: { sessionCount: 1, messageCount: 1, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
    };

    const markdown = exportDayAsMarkdown(day);

    expect(markdown).toContain("Structured OpenClaw response omitted from export because it carried no browser-visible text body.");
  });

  test("treats undefined structured OpenClaw bodies as export-omittable", () => {
    const day = {
      dayKey: "2026-05-03",
      title: "OpenClog Journal",
      dateLabel: "Sunday, May 3, 2026",
      entries: [
        {
          id: "assistant-1",
          dayKey: "2026-05-03",
          source: "openclaw" as const,
          kind: "assistant_message" as const,
          title: "OpenClaw response",
          timestamp: "2026-05-03T10:00:00.000Z",
          status: "info" as const,
          severity: "info" as const,
          redacted: true
        }
      ],
      metrics: { sessionCount: 1, messageCount: 1, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
    };

    expect(exportDayAsMarkdown(day)).toContain("Structured OpenClaw response omitted from export");
  });

  test("all themes preserve required safety surfaces", () => {
    expect(themeIds).toContain("openclog-journal");
    expect(themeIds).toContain("keyboard-first");
    expect(getThemes()).toHaveLength(27);
    for (const themeId of themeIds) {
      const theme = getTheme(themeId);
      expect(theme.safety.alwaysShow).toEqual([
        "errors",
        "pending_approvals",
        "stale_gateway_state",
        "blocked_auth",
        "degraded_connectivity",
        "security_warnings"
      ]);
      expect(theme.labels.productTitle).toBe("OpenClog");
      expect(theme.status.danger).toMatch(/^#/);
    }
  });
});
