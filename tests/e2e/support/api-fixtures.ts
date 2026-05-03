import type { Page } from "@playwright/test";

export async function installApiFixtures(page: Page): Promise<void> {
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        gateway: {
          status: "degraded",
          role: "operator",
          scopes: ["operator.read", "operator.write"],
          missingScopes: ["operator.approvals"],
          stale: true
        }
      }
    });
  });
  await page.route("**/api/days", async (route) => {
    await route.fulfill({
      json: {
        days: [
          {
            dayKey: "2026-05-02",
            title: "OpenClaw Journal",
            dateLabel: "Saturday, May 2, 2026",
            summary: "OpenClog is watching local activity in degraded mode until Gateway scopes are available.",
            metrics: { sessionCount: 1, messageCount: 2, toolCallCount: 1, approvalCount: 1, errorCount: 1 }
          }
        ]
      }
    });
  });
  await page.route("**/api/days/2026-05-02", async (route) => {
    await route.fulfill({
      json: {
        day: {
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
          metrics: { sessionCount: 1, messageCount: 2, toolCallCount: 1, approvalCount: 1, errorCount: 1 }
        }
      }
    });
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
      body: "# OpenClaw Journal\n"
    });
  });
}

