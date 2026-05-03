import { expect, test } from "@playwright/test";
import { installApiFixtures } from "./support/api-fixtures.js";

test("Blackbeard's Log keeps timeline content out of the diagnostics rail", async ({ page }) => {
  await page.setViewportSize({ width: 1172, height: 1224 });
  await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 4 });
  await page.goto("/");
  await page.getByLabel("Theme").selectOption("blackbeards-log");

  const rightRail = await page.locator(".right-rail").boundingBox();
  const entryBoxes = await page.locator(".entry-card").evaluateAll((entries) => entries.map((entry) => entry.getBoundingClientRect().right));

  expect(rightRail).not.toBeNull();
  expect(Math.max(...entryBoxes)).toBeLessThanOrEqual((rightRail?.x ?? 0) - 1);
});

test("Show Tool Calls hides timeline tools, persists, and survives theme switching", async ({ page }) => {
  await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 0 });
  await page.goto("/");

  await expect(page.getByText("Called get_repository_status for 2026-05-03.")).toBeVisible();
  await page.getByLabel("Show Tool Calls").uncheck();
  await expect(page.getByText("Called get_repository_status for 2026-05-03.")).toBeHidden();

  await page.reload();
  await expect(page.getByLabel("Show Tool Calls")).not.toBeChecked();
  await expect(page.getByText("Called get_repository_status for 2026-05-03.")).toBeHidden();

  await page.getByLabel("Theme").selectOption("blackbeards-log");
  await expect(page.getByLabel("Show Tool Calls")).not.toBeChecked();
  await expect(page.getByText("Called get_repository_status for 2026-05-03.")).toBeHidden();

  await page.getByLabel("Show Tool Calls").check();
  await expect(page.getByText("Called get_repository_status for 2026-05-03.")).toBeVisible();
});

test("Agent Activity lists named agents with visible idle and working statuses", async ({ page }) => {
  await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 0 });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Agent Activity" })).toBeVisible();
  await expect(page.getByText("Hugin")).toBeVisible();
  await expect(page.getByText("Status: working")).toBeVisible();
  await expect(page.getByText("Munin")).toBeVisible();
  await expect(page.getByText("Status: idle")).toBeVisible();
});

test("Agent Activity shows idle duration and orders active before recent idle agents", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-05-02T12:20:00.000Z"));
  await installApiFixtures(page, {
    gatewayStatus: "ready",
    approvalCount: 0,
    agents: [
      { id: "agent:odin:idle-old", label: "Odin", status: "idle", summary: "Resting", sessionKey: "agent:odin:idle-old", lastSeenAt: "2026-05-02T11:00:00.000Z" },
      { id: "agent:hugin:active", label: "Hugin", status: "working", summary: "Answering the current prompt", sessionKey: "agent:hugin:active", lastSeenAt: "2026-05-02T10:00:00.000Z" },
      { id: "agent:munin:idle-new", label: "Munin", status: "idle", summary: "Standing by", sessionKey: "agent:munin:idle-new", lastSeenAt: "2026-05-02T12:05:00.000Z" }
    ]
  });
  await page.goto("/");

  const agents = page.locator(".agent-list li");
  await expect(agents.nth(0)).toContainText("Hugin");
  await expect(agents.nth(1)).toContainText("Munin");
  await expect(agents.nth(1)).toContainText("Inactive for 15m");
  await expect(agents.nth(2)).toContainText("Odin");
  await expect(agents.nth(2)).toContainText("Inactive for 1h 20m");
});

test("timeline renders newest entries first", async ({ page }) => {
  await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 0 });
  await page.goto("/");

  await expect(page.locator(".entry-card").first()).toContainText("Tool call");
  await expect(page.locator(".entry-card").first()).toContainText("Called get_repository_status for 2026-05-03.");
  await expect(page.locator(".entry-card").nth(1)).toContainText("Gateway ready");
});

test("Pending approvals popover submits approve and disapprove while deferring locally", async ({ page }) => {
  const fixture = await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 3 });
  await page.goto("/");

  await expect(page.getByRole("button", { name: "Review approvals" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Jump to first pending approval" })).toBeVisible();
  await page.getByRole("button", { name: "Review approvals" }).click();
  await expect(page.getByRole("region", { name: "Pending approvals review" })).toBeVisible();
  await page.getByRole("radio", { name: "Approve approval-1", exact: true }).check();
  await page.getByRole("radio", { name: "Disapprove approval-2", exact: true }).check();
  await page.getByRole("radio", { name: "Defer approval-3", exact: true }).check();
  await page.getByRole("button", { name: "Submit approval decisions" }).click();

  await expect(page.getByRole("region", { name: "Pending approvals review" })).toBeHidden();
  expect(fixture.resolvedApprovals).toEqual([
    { id: "approval-1", decision: "allow-once" },
    { id: "approval-2", decision: "deny" }
  ]);
});

test("product-facing archive copy normalizes historical source titles", async ({ page }) => {
  const historicalTitle = ["OpenClaw", "Journal"].join(" ");
  await installApiFixtures(page, { dayTitle: historicalTitle, gatewayStatus: "ready", approvalCount: 0 });
  await page.goto("/");

  await expect(page.locator(".day-row[aria-current='date']")).toContainText("OpenClog Journal");
  await expect(page.locator(".day-row[aria-current='date']")).not.toContainText(historicalTitle);
});

test("timeline groups repeated low-value OpenClaw responses and keeps raw view redacted", async ({ page }) => {
  await installApiFixtures(page, {
    gatewayStatus: "ready",
    approvalCount: 0,
    extraEntries: repeatedResponses()
  });
  await page.goto("/");

  await expect(page.getByText(/3 similar OpenClaw responses between/)).toBeVisible();
  await expect(page.getByText(/display-only/)).toBeVisible();
  await page.getByRole("button", { name: /Expand grouped events/ }).click();
  await expect(page.locator("[data-entry-id='repeat-1']")).toBeVisible();
  await expect(page.locator("[data-entry-id='repeat-2']")).toBeVisible();
  await expect(page.locator("[data-entry-id='repeat-3']")).toBeVisible();

  await page.getByRole("button", { name: "Raw timeline" }).click();
  await expect(page.getByText(/3 similar OpenClaw responses between/)).toBeHidden();
  await expect(page.locator("[data-entry-id='repeat-1']")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/Bearer raw-secret/i);
});

test("clicking a live event inside a group expands the group and focuses the target entry", async ({ page }) => {
  await installApiFixtures(page, {
    gatewayStatus: "ready",
    approvalCount: 0,
    extraEntries: repeatedResponses().slice(0, 2),
    streamEntry: {
      id: "repeat-live",
      dayKey: "2026-05-03",
      source: "openclaw",
      kind: "assistant_message",
      title: "OpenClaw response",
      body: "pong Authorization: Bearer grouped-secret",
      timestamp: "2026-05-03T12:19:00.000Z",
      status: "info",
      severity: "info",
      redacted: true
    }
  });
  await page.goto("/");

  await page.getByRole("button", { name: /Live OpenClaw event received/ }).click();

  await expect(page.locator("[data-entry-id='repeat-live']")).toBeFocused();
  await expect(page.locator("[data-entry-id='repeat-live']")).not.toContainText("grouped-secret");
});

test("day archive selection changes the center log", async ({ page }) => {
  await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 0 });
  await page.goto("/");

  await page.getByRole("button", { name: /Saturday, May 2, 2026/ }).click();

  await expect(page.getByLabel("Daily page").getByText("Saturday, May 2, 2026")).toBeVisible();
  await expect(page.getByText("Called get_repository_status for 2026-05-02.")).toBeVisible();
});

test("live event toasts expire after 10 seconds", async ({ page }) => {
  test.setTimeout(20000);
  await installApiFixtures(page, {
    gatewayStatus: "ready",
    approvalCount: 0,
    streamEntry: {
      id: "live-entry-1",
      dayKey: "2026-05-03",
      source: "openclaw",
      kind: "assistant_message",
      title: "OpenClaw response",
      body: "Live toast pong",
      timestamp: "2026-05-03T12:06:00.000Z",
      status: "info",
      severity: "info",
      redacted: true
    }
  });
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Live OpenClaw event received/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Live OpenClaw event received/ })).toBeHidden({ timeout: 12000 });
});

test("clicking a live tool-call toast reveals the hidden tool entry and navigates to it", async ({ page }) => {
  await installApiFixtures(page, {
    gatewayStatus: "ready",
    approvalCount: 0,
    streamEntry: {
      id: "live-tool-entry",
      dayKey: "2026-05-03",
      source: "tool",
      kind: "tool_result",
      title: "Tool call",
      body: "Called live_tool.",
      timestamp: "2026-05-03T12:06:00.000Z",
      status: "success",
      severity: "info",
      toolName: "live_tool",
      redacted: true
    }
  });
  await page.goto("/");
  await page.getByLabel("Show Tool Calls").uncheck();
  await expect(page.getByText("Called live_tool.")).toBeHidden();

  await page.getByRole("button", { name: /Live OpenClaw event received/ }).click();

  await expect(page.getByLabel("Show Tool Calls")).toBeChecked();
  await expect(page.getByText("Called live_tool.")).toBeVisible();
  await expect(page.locator("[data-entry-id='live-tool-entry']")).toBeFocused();
  await expect(page.getByText("Entry details")).toBeVisible();
});

function repeatedResponses() {
  return [
    {
      id: "repeat-1",
      dayKey: "2026-05-03",
      source: "openclaw" as const,
      kind: "assistant_message" as const,
      title: "OpenClaw response",
      body: "pong Authorization: Bearer raw-secret",
      timestamp: "2026-05-03T12:18:00.000Z",
      status: "info" as const,
      severity: "info" as const,
      redacted: true
    },
    {
      id: "repeat-2",
      dayKey: "2026-05-03",
      source: "openclaw" as const,
      kind: "assistant_message" as const,
      title: "OpenClaw response",
      body: "pong",
      timestamp: "2026-05-03T12:18:30.000Z",
      status: "info" as const,
      severity: "info" as const,
      redacted: true
    },
    {
      id: "repeat-3",
      dayKey: "2026-05-03",
      source: "openclaw" as const,
      kind: "assistant_message" as const,
      title: "OpenClaw response",
      body: "pong",
      timestamp: "2026-05-03T12:19:00.000Z",
      status: "info" as const,
      severity: "info" as const,
      redacted: true
    }
  ];
}
