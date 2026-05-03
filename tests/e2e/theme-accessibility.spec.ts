import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { themeGroups, themeIds } from "@openclog/core";
import { installApiFixtures } from "./support/api-fixtures.js";

const themes = themeIds;
const accessibilityThemes = ["accessibility", "accessibility-dark", "low-stimulus", "large-print", "dyslexia-friendly", "keyboard-first"] as const;
const familySmokeThemes = themeGroups.map((group) => group.themeIds[0]);

test.describe("theme surfaces", () => {
  for (const theme of themes) {
    test(`${theme} renders operational surfaces without leaking secrets`, async ({ page }) => {
      await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 0 });
      await page.goto("/");
      await page.getByLabel("Theme").selectOption(theme);

      await expect(page.getByRole("main")).toHaveAttribute("data-theme", theme);
      await expect(page.getByText(/Gateway ready/i).first()).toBeVisible();
      await expect(page.getByText("Agent Activity")).toBeVisible();
      await expect(page.getByText("Recent Tools")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Pending approvals" })).toBeVisible();
      await expect(page.getByText("0 pending approvals")).toBeVisible();
      await expect(page.getByText(/Status:/).first()).toBeVisible();
      await expect(page.locator("body")).not.toContainText(/Bearer|OPENCLAW_GATEWAY_TOKEN|oc_token|sk-secret|session-secret/i);
    });

    test(`${theme} keeps degraded state visible`, async ({ page }) => {
      await installApiFixtures(page, { gatewayStatus: "degraded", approvalCount: 0 });
      await page.goto("/");
      await page.getByLabel("Theme").selectOption(theme);

      await expect(page.getByText(/Gateway degraded/i).first()).toBeVisible();
      await expect(page.getByText(/Missing scopes:/)).toBeVisible();
      await expect(page.getByRole("heading", { name: "Pending approvals" })).toBeVisible();
    });
  }
});

test("browser-visible event text hides credentials and raw Gateway-looking payloads in every theme", async ({ page }) => {
  await installApiFixtures(page, {
    gatewayStatus: "ready",
    streamEntry: {
      id: "secret-entry",
      dayKey: "2026-05-03",
      source: "gateway",
      kind: "assistant_message",
      title: "OpenClaw response",
      body: [
        "Authorization: Bearer live-secret-token",
        "OPENCLAW_GATEWAY_TOKEN=oc_token_123456",
        "cookie: session=raw-cookie",
        '{"raw_event_redacted_json":{"headers":{"authorization":"Bearer nope"}}}',
        "/Users/m4/OpenClog/private/token-file.txt",
        "Operator-facing summary remains."
      ].join("\n"),
      timestamp: "2026-05-03T12:05:00.000Z",
      status: "info",
      severity: "info",
      redacted: true
    }
  });
  await page.goto("/");

  for (const theme of themes) {
    await page.getByLabel("Theme").selectOption(theme);
    await expect(page.getByText("Operator-facing summary remains.")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/live-secret-token|oc_token_123456|raw-cookie|token-file|authorization":"Bearer/i);
  }
});

test("theme switching is presentation-only", async ({ page }) => {
  await installApiFixtures(page, { gatewayStatus: "degraded", approvalCount: 2 });
  await page.goto("/");
  await page.getByLabel("Composer input").fill("keep this composer text");
  const selectedDay = page.locator(".day-row[aria-current='date']");
  const selectedDate = await selectedDay.locator("span").first().textContent();
  const selectedTitle = await selectedDay.locator("strong").textContent();
  await page.getByLabel("Theme").selectOption("blackbeards-log");

  await expect(page.getByLabel("Composer input")).toHaveValue("keep this composer text");
  await expect(page.locator(".day-row[aria-current='date']")).toContainText(selectedDate ?? "");
  await expect(page.locator(".day-row[aria-current='date']")).toContainText(selectedTitle ?? "");
  await expect(page.getByText(/Gateway degraded/i).first()).toBeVisible();
  await expect(page.getByText("Agent Activity")).toBeVisible();
  await expect(page.getByText("Recent Tools")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pending approvals" })).toBeVisible();
  await expect(page.getByText("2 pending approvals")).toBeVisible();
});

test("keyboard and accessibility affordances work", async ({ page }) => {
  await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 0 });
  await page.goto("/");

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Daily page")).toBeFocused();

  await page.keyboard.press("/");
  await expect(page.getByLabel("Composer input")).toBeFocused();
  await page.keyboard.type("typed safely");
  await page.keyboard.press("/");
  await expect(page.getByLabel("Composer input")).toHaveValue("typed safely/");

  await page.keyboard.press("Escape");
  await page.getByLabel("Daily page").focus();
  await page.keyboard.press("?");
  await expect(page.getByRole("region", { name: "Keyboard shortcuts" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Keyboard shortcuts" })).toBeHidden();

  await page.getByLabel("Theme").focus();
  await expect(page.getByLabel("Theme")).toBeFocused();
  await page.getByLabel("Theme").selectOption("accessibility");
  await expect(page.getByRole("main")).toHaveAttribute("data-theme", "accessibility");

  const sendBox = await page.getByRole("button", { name: "Send" }).boundingBox();
  expect(sendBox?.height).toBeGreaterThanOrEqual(44);

  await page.getByLabel("Timeline entries").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel(/Timeline entry 1:/)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel(/Timeline entry 2:/)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Entry details")).toBeVisible();

  await page.getByLabel(/Diagnostics card: Gateway/).focus();
  await expect(page.getByLabel(/Diagnostics card: Gateway/)).toBeFocused();
  const focusOutline = await page.getByLabel(/Diagnostics card: Gateway/).evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(focusOutline).not.toBe("none");

  const results = await new AxeBuilder({ page }).include("main").analyze();
  expect(results.violations).toEqual([]);
});

for (const theme of accessibilityThemes) {
  test(`${theme} keeps keyboard and hit-target accessibility guarantees`, async ({ page }) => {
    await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 0 });
    await page.goto("/");
    await page.getByLabel("Theme").selectOption(theme);

    await page.getByLabel("Theme").focus();
    await expect(page.getByLabel("Theme")).toBeFocused();
    await page.getByLabel("Timeline entries").focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByLabel(/Timeline entry 1:/)).toBeFocused();
    const sendBox = await page.getByRole("button", { name: "Send" }).boundingBox();
    const focusOutline = await page.getByLabel(/Timeline entry 1:/).evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(sendBox?.height).toBeGreaterThanOrEqual(44);
    expect(focusOutline).not.toBe("none");
    await expect(page.getByText(/Status:/).first()).toBeVisible();
  });
}

for (const theme of familySmokeThemes) {
  test(`${theme} remains usable at 200 percent text zoom`, async ({ page }) => {
    await installApiFixtures(page, { gatewayStatus: "ready", approvalCount: 0 });
    await page.goto("/");
    await page.getByLabel("Theme").selectOption(theme);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });

    await expect(page.getByLabel("Composer input")).toBeVisible();
    await expect(page.getByText("Agent Activity")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pending approvals" })).toBeVisible();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(horizontalOverflow).toBe(false);
  });
}
