import type { Page } from "@playwright/test";
import type { AgentActivity, JournalDay, JournalEntry } from "@openclog/core";

export interface ApiFixtureOptions {
  agents?: AgentActivity[];
  approvalCount?: number;
  gatewayStatus?: "ready" | "blocked" | "degraded";
  streamEntry?: JournalEntry;
}

export async function installApiFixtures(page: Page, options: ApiFixtureOptions = {}): Promise<{ resolvedApprovals: Array<{ decision: string; id: string }> }> {
  const gatewayStatus = options.gatewayStatus ?? "degraded";
  const approvalCount = options.approvalCount ?? 0;
  const missingScopes = gatewayStatus === "ready" ? [] : ["operator.approvals"];
  const resolvedApprovals: Array<{ decision: string; id: string }> = [];
  let showToolCalls = true;
  const dayTwo = buildDay({
    dayKey: "2026-05-02",
    dateLabel: "Saturday, May 2, 2026",
    summary: "OpenClog is watching local activity in degraded mode until Gateway scopes are available.",
    approvalCount,
    gatewayStatus
  });
  const dayThree = buildDay({
    dayKey: "2026-05-03",
    dateLabel: "2026-05-03",
    summary: "May 3 log entries from OpenClaw are available.",
    approvalCount,
    gatewayStatus
  });
  if (options.streamEntry) dayThree.entries.push(options.streamEntry);
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        gateway: {
          status: gatewayStatus,
          role: "operator",
          scopes: gatewayStatus === "ready" ? ["operator.read", "operator.write", "operator.approvals"] : ["operator.read", "operator.write"],
          missingScopes,
          stale: gatewayStatus !== "ready"
        }
      }
    });
  });
  await page.route("**/api/stream", async (route) => {
    const eventBody = options.streamEntry
      ? `retry: 30000\nevent: journal\ndata: ${JSON.stringify({ entry: options.streamEntry, day: dayThree })}\n\n`
      : "";
    await route.fulfill({
      headers: {
        "cache-control": "no-cache",
        "content-type": "text/event-stream"
      },
      body: `: fixture stream available\n\n${eventBody}`
    });
  });
  await page.route("**/api/settings", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as { showToolCalls?: boolean };
      if (typeof body.showToolCalls === "boolean") showToolCalls = body.showToolCalls;
      await route.fulfill({ json: { ok: true, settings: { theme: "default", showToolCalls } } });
      return;
    }
    await route.fulfill({ json: { settings: { theme: "default", showToolCalls, gateway: { status: gatewayStatus } } } });
  });
  await page.route("**/api/sessions?**", async (route) => {
    await route.fulfill({
      json: {
        agents: options.agents ?? [
          { id: "agent:hugin:main", label: "Hugin", status: "working", summary: "Answering the current prompt", sessionKey: "agent:hugin:main", lastSeenAt: "2026-05-02T12:05:00.000Z" },
          { id: "agent:munin:main", label: "Munin", status: "idle", summary: "Standing by", sessionKey: "agent:munin:main" }
        ]
      }
    });
  });
  await page.route("**/api/approvals", async (route) => {
    await route.fulfill({
      json: {
        approvals: [
          { id: "approval-1", title: "Approval requested", command: "npm test", status: "pending", requestedAt: "2026-05-02T12:03:00.000Z", sessionKey: "agent:hugin:main" },
          { id: "approval-2", title: "Approval requested", command: "git status", status: "pending", requestedAt: "2026-05-02T12:04:00.000Z", sessionKey: "agent:munin:main" },
          { id: "approval-3", title: "Approval requested", command: "defer me", status: "pending", requestedAt: "2026-05-02T12:05:00.000Z" }
        ].slice(0, approvalCount)
      }
    });
  });
  await page.route("**/api/approvals/*/resolve", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").at(-2) ?? "";
    const body = route.request().postDataJSON() as { decision: string };
    resolvedApprovals.push({ id, decision: body.decision });
    await route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/days", async (route) => {
    await route.fulfill({
      json: {
        days: [summaryFor(dayThree), summaryFor(dayTwo)]
      }
    });
  });
  await page.route("**/api/days/2026-05-02", async (route) => {
    await route.fulfill({ json: { day: dayTwo } });
  });
  await page.route("**/api/days/2026-05-03", async (route) => {
    await route.fulfill({ json: { day: dayThree } });
  });
  await page.route("**/api/composer", async (route) => {
    const body = route.request().postDataJSON() as { text: string };
    if (body.text.startsWith("/config")) {
      await route.fulfill({ status: 403, json: { error: "composer_command_blocked", message: "Command blocked" } });
      return;
    }
    await route.fulfill({ json: { mode: "note", body: body.text.replace("/note ", "") } });
  });
  await page.route("**/api/days/2026-05-02/export?format=markdown", async (route) => {
    await route.fulfill({
      headers: { "content-type": "text/markdown", "content-disposition": "attachment; filename=openclog-2026-05-02.md" },
      body: "# OpenClog Journal\n"
    });
  });
  return { resolvedApprovals };
}

function buildDay(options: {
  approvalCount: number;
  dateLabel: string;
  dayKey: string;
  gatewayStatus: "ready" | "blocked" | "degraded";
  summary: string;
}): JournalDay {
  return {
    dayKey: options.dayKey,
    title: "OpenClog Journal",
    dateLabel: options.dateLabel,
    summary: options.summary,
    entries: [
      {
        id: `${options.dayKey}-entry-1`,
        dayKey: options.dayKey,
        source: "gateway",
        kind: "system_status",
        title: options.gatewayStatus === "ready" ? "Gateway ready" : "Gateway degraded",
        body: options.gatewayStatus === "ready" ? "OpenClaw Gateway scopes are negotiated." : "Missing operator.approvals scope.",
        timestamp: `${options.dayKey}T12:00:00.000Z`,
        status: options.gatewayStatus === "ready" ? "success" : "failed",
        severity: options.gatewayStatus === "ready" ? "info" : "warning",
        redacted: true
      },
      {
        id: `${options.dayKey}-entry-2`,
        dayKey: options.dayKey,
        source: "tool",
        kind: "tool_result",
        title: "Tool call",
        body: `Called get_repository_status for ${options.dayKey}.`,
        timestamp: `${options.dayKey}T12:02:00.000Z`,
        status: "success",
        toolName: "get_repository_status",
        redacted: true
      }
    ],
    metrics: { sessionCount: 2, messageCount: 2, toolCallCount: 1, approvalCount: options.approvalCount, errorCount: options.gatewayStatus === "ready" ? 0 : 1 }
  };
}

function summaryFor(day: JournalDay): Omit<JournalDay, "entries"> {
  return {
    dayKey: day.dayKey,
    title: day.title,
    dateLabel: day.dateLabel,
    summary: day.summary,
    metrics: day.metrics
  };
}
