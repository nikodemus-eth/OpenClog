import { expect, test } from "@playwright/test";
import { installApiFixtures } from "./support/api-fixtures.js";

test("journal quick wins and advanced workbench stay usable together", async ({ page }) => {
  await installApiFixtures(page, {
    gatewayStatus: "ready",
    approvalCount: 1,
    gatewayDetails: {
      lastErrorCategory: "challenge_timeout",
      recentHistory: [
        { id: "health-1", entryId: "2026-05-03-entry-reconnect", category: "reconnect", title: "Gateway reconnected", timestamp: "2026-05-03T12:05:00.000Z" },
        { id: "health-2", entryId: "2026-05-03-entry-gap", category: "sequence_gap", title: "Sequence gap detected", timestamp: "2026-05-03T12:04:30.000Z" }
      ]
    },
    searchResults: [
      {
        entryId: "2026-05-03-entry-2",
        dayKey: "2026-05-03",
        title: "Tool call",
        bodyPreview: "Called get_repository_status for 2026-05-03.",
        matchSnippet: "Matched in toolName and body: get_repository_status timed out.",
        matchFieldHints: ["toolName", "body"],
        kind: "tool_result",
        status: "success"
      }
    ],
    extraEntries: [
      {
        id: "2026-05-03-entry-error",
        dayKey: "2026-05-03",
        source: "tool",
        kind: "tool_result",
        title: "Tool failed",
        body: "Timed out",
        timestamp: "2026-05-03T12:04:00.000Z",
        status: "failed",
        severity: "error",
        toolName: "get_repository_status",
        redacted: true
      }
    ]
  });
  await page.goto("/?day=2026-05-03&view=raw&entry=2026-05-03-entry-1");

  await expect(page.getByLabel("Daily page")).toContainText("OpenClog Journal");
  await expect(page.getByLabel("OpenClog operator shell")).toContainText("PID 4321");
  await expect(page.getByLabel("OpenClog operator shell")).toContainText("abc1234");
  await expect(page.getByLabel("Gateway readiness: ready")).toBeVisible();
  await expect(page.getByText(/Have scopes: operator\.read, operator\.write, operator\.approvals/i)).toBeVisible();
  await expect(page.getByText(/Missing scopes: none/i)).toBeVisible();
  await expect(page.getByLabel("Saved filters").getByLabel("Errors")).toBeChecked();
  await expect(page.getByLabel("Saved filters").getByLabel("Tool failures")).toBeChecked();
  await expect(page.getByRole("button", { name: "Raw timeline" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel(/Timeline entry 1:/)).toBeVisible();

  await expect(page.getByRole("region", { name: "Today at a glance" })).toContainText("Reconnects");
  await expect(page.getByText(/Reconnect trend:/i)).toBeVisible();
  await expect(page.getByText(/Last successful sync/i)).toBeVisible();
  await page.getByRole("button", { name: "Expand" }).first().click();
  await page.getByLabel("Pinned note").fill("Pinned note for operators");
  await page.getByLabel("Pinned summary").fill("Pinned summary for operators");
  await page.getByRole("button", { name: "Save pinned context" }).click();

  await page.getByLabel("Journal search input").fill("timeout");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: "Save search preset" }).click();
  await page.getByRole("button", { name: "Save operator view" }).click();
  await expect(page.getByRole("button", { name: "timeout", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "2026-05-03 timeout", exact: true })).toBeVisible();
  await expect(page.getByLabel("Saved operator views").getByRole("button", { name: "Stale summaries", exact: true })).toBeVisible();
  await expect(page.getByLabel("Saved operator views").getByRole("button", { name: "Failed receipts", exact: true })).toBeVisible();
  await expect(page.getByLabel("Saved operator views").getByRole("button", { name: "Scope missing", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Tool call Called/i })).toContainText("Called get_repository_status for 2026-05-03.");
  await expect(page.getByText(/Matched in toolName and body/i)).toBeVisible();
  await expect(page).toHaveURL(/q=timeout/);
  await page.getByLabel("Saved filters").getByLabel("Errors").uncheck();
  await page.getByLabel("Saved filters").getByLabel("Tool failures").uncheck();
  await expect(page.getByLabel("Saved filters").getByLabel("Errors")).not.toBeChecked();
  await expect(page.getByLabel("Saved filters").getByLabel("Tool failures")).not.toBeChecked();
  await expect(page.getByText("Tool failed")).toBeHidden();

  await page.getByLabel("Saved filters").getByLabel("Errors").check();
  await page.getByLabel("Saved filters").getByLabel("Tool failures").check();
  await expect(page.getByLabel("Saved filters").getByLabel("Errors")).toBeChecked();
  await expect(page.getByLabel("Saved filters").getByLabel("Tool failures")).toBeChecked();

  await page.getByRole("button", { name: "Run integrity check" }).click();
  await expect(page.getByText(/entries checked/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Apply retention" })).toBeDisabled();
  await page.getByRole("button", { name: "Preview retention" }).click();
  await expect(page.getByText(/Retention would remove 1 day/)).toBeVisible();
  await expect(page.getByText(/2 entries/)).toBeVisible();
  await expect(page.getByText(/before\/after impact/i)).toBeVisible();
  await page.getByRole("button", { name: "Apply retention" }).click();
  await expect(page.getByText(/Applied retention snapshot retention-fixture-1/i)).toBeVisible();
  await expect(page.getByText(/removed 1 day\(s\), 2 entries, 1 summaries, 1 audit rows, 1 incidents, 1 alerts, and 1 bundles/i)).toBeVisible();
  await page.getByRole("button", { name: "Rollback retention snapshot" }).click();
  await expect(page.getByText(/Retention rollback restored 2 day\(s\)/i)).toBeVisible();
  await page.getByRole("button", { name: "Refresh current summary" }).click();
  await expect(page.getByLabel("Operational workbench").getByText(/Summary job completed: Summary generated from current journal evidence/i)).toBeVisible();
  await expect(page.getByText(/Generated summary refreshed by job summary-job-fixture/i)).toBeVisible();
  await expect(page.getByText(/Last summary completion 2026-05-04T12:02:02.000Z/i)).toBeVisible();

  await page.getByRole("button", { name: "Capture incident", exact: true }).click();
  await expect(page.getByText(/Incident snapshot captured/i)).toBeVisible();
  await page.getByRole("button", { name: "Save alert rule" }).click();
  await expect(page.getByText(/incidents, 1 active alert finding\(s\), 0 snoozed\./i)).toBeVisible();
  await expect(page.getByText(/Reconnect storm triggered for 2026-05-03/i)).toBeVisible();
  await page.getByRole("button", { name: "Acknowledge Reconnect storm" }).click();
  await expect(page.getByText(/Active, acknowledged at/i)).toBeVisible();
  await page.getByRole("button", { name: "Snooze Reconnect storm for 30 minutes" }).click();
  await expect(page.getByText(/Snoozed until/i)).toBeVisible();
  await page.getByLabel("Incident workspace selector").selectOption("incident-1");
  await expect(page.getByRole("heading", { name: "Detect", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Explain", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recommend", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Act", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Record", exact: true })).toBeVisible();
  await expect(page.getByLabel("Incident loop progress").first()).toContainText("Detect");
  await page.getByRole("button", { name: "Copy incident id incident-1" }).click();
  await expect(page.getByText(/Incident id copied/i)).toBeVisible();
  await page.getByLabel("Investigation note").fill("Operator captured the reconnect sequence.");
  await page.getByRole("button", { name: "Save investigation note" }).click();
  await expect(page.getByText(/Investigation note recorded/i)).toBeVisible();

  await page.getByRole("button", { name: "Preview bundle manifest" }).click();
  await expect(page.getByText(/Bundle contains 3 entries/i)).toBeVisible();
  await page.getByRole("button", { name: "Copy bundle digest" }).click();
  await expect(page.getByText(/Bundle digest copied/i)).toBeVisible();
  await page.getByRole("button", { name: "Copy incident packet digest" }).click();
  await expect(page.getByText(/Bundle digest copied/i)).toBeVisible();
  await page.getByRole("button", { name: "Open offline review bundle" }).click();
  await expect(page.getByText(/Offline bundle loaded/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy incident bundle JSON" })).toBeVisible();
  await page.getByRole("button", { name: "Compare previous day bundle" }).click();
  await expect(page.getByText(/Bundle diff 2026-05-02 -> 2026-05-03/i)).toBeVisible();
  await page.getByRole("button", { name: "Copy sanitized session summary" }).click();
  await expect(page.getByText(/Sanitized session summary copied/i)).toBeVisible();
  await page.getByRole("button", { name: "Build GitHub issue payload" }).click();
  await page.getByRole("button", { name: "Prepare end-of-day closeout" }).click();
  await expect(page.getByText(/Closeout for 2026-05-03/i)).toBeVisible();
  await expect(page.getByText(/Regenerate the day summary before closing out/i)).toBeVisible();
  await expect(page.getByText(/OpenClog Journal/).last()).toBeVisible();
  await page.getByRole("button", { name: "Copy governance API example" }).click();
  await expect(page.getByText(/API example copied for POST \/api\/integrations\/slack\/deliver/i)).toBeVisible();
  await page.getByRole("button", { name: "Verify Slack dry run" }).click();
  await expect(page.getByLabel("Delivery target verification").getByText(/slack dry-run verification failed/i)).toBeVisible();
  await expect(page.getByLabel("Delivery target verification").getByText(/Delivery reference dry-run/i)).toBeVisible();
  await expect(page.getByText(/Dry-run verification failed for Slack; jump to the delivery target card/i)).toBeVisible();
  await page.getByRole("button", { name: "Copy replay API example" }).click();
  await expect(page.getByText(/API example copied for GET \/api\/correlation/i)).toBeVisible();
  await expect(page.getByText(/Mission replay generated at 2026-05-04T12:10:00.000Z/i)).toBeVisible();
  await expect(page.getByText(/Causality graph/i)).toBeVisible();
  await expect(page.getByText(/Step 1: entry at 2026-05-03T12:01:00.000Z - Session started - entries 2026-05-03-entry-1 - sources 2026-05-03-entry-1\./i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Open entry 2026-05-03-entry-1" }).first()).toBeVisible();
  await expect(page.getByText(/incident-1: Operational instability narrative \(incident\)/i)).toBeVisible();
  await expect(page.getByText(/edge-1: incident-1 includes 2026-05-03-entry-1/i)).toBeVisible();
  await page.getByRole("button", { name: "Copy plugin API example" }).click();
  await expect(page.getByText(/API example copied for POST \/api\/plugins\/register/i)).toBeVisible();

  await page.getByLabel("Profile selector").selectOption("night-ops");
  await page.getByRole("button", { name: "Create Night Ops profile" }).click();
  await expect(page.getByLabel("Profile selector")).toHaveValue("night-ops");
  await expect(page.getByText("ws://127.0.0.1:18789")).toBeVisible();
  await expect(page.getByText(/Loopback-safe/i)).toBeVisible();
  await expect(page.getByText(/challenge_timeout/i).first()).toBeVisible();
  await expect(page.getByText(/Gateway reconnected/i)).toBeVisible();
  await expect(page.getByText(/Last entry included/i)).toBeVisible();
  await expect(page.getByText(/Latest entry observed/i)).toBeVisible();
  await expect(page.getByText(/characters remaining/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Backend mismatch" }).click();
  await expect(page.getByText(/Built-in view: Backend mismatch/i)).toBeVisible();
  await expect(page.getByLabel("Saved operator views").getByRole("button", { name: "Only unresolved incidents", exact: true })).toBeVisible();
  await expect(page.getByLabel("Verification Center")).toContainText("Last successful verify:gateway 2026-05-04T12:18:00.000Z");
  await expect(page.getByLabel("Operations backlog surfaces")).toContainText("Evidence checklist");
  await expect(page.getByLabel("Operations backlog surfaces")).toContainText("same-key retry requires confirmation");
  await expect(page.getByLabel("Operations backlog surfaces")).toContainText("Role-aware simulations");
  await expect(page.getByText(/Evidence [0-4]\/4/i).first()).toBeVisible();
  await expect(page.getByText(/Theme and background settings are decorative only/i)).toBeVisible();
  await expect(page.getByText(/Health poll .* last success/i)).toBeVisible();
  await page.getByRole("button", { name: "Retry receipt receipt-1" }).click();
  await expect(page.getByLabel("Operational workbench").getByText(/Retry failed delivery receipt-1 with the same idempotency key incident-1:slack/i)).toBeVisible();
  await page.getByRole("button", { name: "Retry receipt receipt-1" }).click();
  await expect(page.getByLabel("Operational workbench").getByText(/receipt-1 retry failed/i)).toBeVisible();
  await expect(page.getByText(/retries 0|retries 1/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Copy receipt id receipt-1", exact: true }).click();
  await expect(page.getByText(/Receipt id copied/i)).toBeVisible();
  await expect(page.getByText(/Verification receipts/i)).toBeVisible();
});

test("shows backend mismatch when stale health still has a reachable Gateway target", async ({ page }) => {
  await installApiFixtures(page, {
    gatewayStatus: "blocked",
    approvalCount: 0,
    gatewayDetails: {
      stale: true,
      targetReachable: true,
      scopes: ["operator.read", "operator.write"],
      missingScopes: ["operator.approvals"]
    }
  });
  await page.goto("/?day=2026-05-03");

  await expect(page.getByRole("status", { name: "Backend mismatch" })).toContainText("Gateway target is reachable");
});

test("keyboard shortcuts jump to operational entries and the composer", async ({ page }) => {
  await installApiFixtures(page, {
    gatewayStatus: "ready",
    approvalCount: 1,
    extraEntries: [
      {
        id: "2026-05-03-entry-approval",
        dayKey: "2026-05-03",
        source: "system",
        kind: "approval_requested",
        title: "Approval requested",
        body: "Needs operator approval",
        timestamp: "2026-05-03T12:03:00.000Z",
        status: "pending",
        severity: "warning",
        approvalId: "approval-1",
        redacted: true
      },
      {
        id: "2026-05-03-entry-error",
        dayKey: "2026-05-03",
        source: "tool",
        kind: "tool_result",
        title: "Tool failed",
        body: "Timed out",
        timestamp: "2026-05-03T12:04:00.000Z",
        status: "failed",
        severity: "error",
        toolName: "get_repository_status",
        redacted: true
      }
    ]
  });
  await page.goto("/?day=2026-05-03");

  await page.keyboard.press("Alt+e");
  await expect(page.getByRole("button", { name: /Timeline entry .*Tool failed/ })).toBeVisible();
  await page.keyboard.press("Alt+a");
  await expect(page.getByRole("button", { name: /Timeline entry .*Approval requested/ })).toBeVisible();
  await page.keyboard.press("Alt+t");
  await expect(page.getByRole("button", { name: /Timeline entry .*Tool call/ })).toBeVisible();
  await page.keyboard.press("Alt+c");
  await expect(page.getByLabel("Composer input")).toBeFocused();
  await page.keyboard.press("Alt+s");
  await expect(page.getByLabel("Journal search input")).toBeFocused();
});

test("shows validation and empty-state guidance for operator panels", async ({ page }) => {
  await installApiFixtures(page, { gatewayStatus: "degraded", approvalCount: 0, emptyAdvancedState: true, searchResults: [] });
  await page.goto("/?day=2026-05-03");

  await page.getByRole("button", { name: "Expand" }).first().click();
  await page.getByLabel("Pinned summary").fill("   ");
  await expect(page.getByText("Pinned summary cannot be empty.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save pinned context" })).toBeDisabled();

  await page.getByLabel("Journal search input").fill("nothing");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText(/No journal matches for “nothing”/)).toBeVisible();

  await expect(page.getByText("No incidents captured yet.")).toBeVisible();
  await expect(page.getByText("No active alert findings right now.")).toBeVisible();
  await expect(page.getByText("No adapter events recorded yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Capture incident from this day" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create reconnect alert rule" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview bundle manifest" })).toBeVisible();
  await expect(page.getByText("Mission replay unavailable until an incident is selected.")).toBeVisible();
  await expect(page.getByText("Correlation graph unavailable until an incident is selected.")).toBeVisible();
  await page.getByRole("button", { name: "Prepare end-of-day closeout" }).click();
  await expect(page.getByText(/Closeout for 2026-05-03/i)).toBeVisible();
});

test("fails closed when replay and correlation endpoints are unavailable", async ({ page }) => {
  await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 0, failReplayCorrelation: true });
  await page.goto("/?day=2026-05-03");

  await expect(page.getByLabel("Incident workspace selector")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Mission replay unavailable: local replay endpoint failed closed.")).toBeVisible();
  await expect(page.getByText("Correlation graph unavailable: local correlation endpoint failed closed.")).toBeVisible();
});
