import { expect, test } from "@playwright/test";
import { installApiFixtures } from "./support/api-fixtures.js";

test("journal workflow supports note, theme switch, export, and blocked command", async ({ page }) => {
  await installApiFixtures(page);
  await page.goto("/");

  await expect(page.getByLabel("Daily page").getByRole("heading", { name: "OpenClog Journal" })).toBeVisible();
  await page.getByLabel("Composer input").fill("/note waiting on Ben's review");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("waiting on Ben's review")).toBeVisible();
  await page.getByLabel("Theme", { exact: true }).selectOption("captains-log");
  await expect(page.getByRole("main")).toHaveAttribute("data-theme", "captains-log");

  await expect(page.getByText("Agent Activity")).toBeVisible();
  await expect(page.getByText("Recent Tools")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pending approvals" })).toBeVisible();

  await page.getByLabel("Composer input").fill("/config set auth.token secret");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByLabel("Daily page").getByText("Command blocked")).toBeVisible();
  await expect(page.getByTitle(/Gateway actions are blocked because required scopes are missing: operator\.approvals/i)).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export day" }).click();
  expect((await downloadPromise).suggestedFilename()).toContain("openclog-");
});
