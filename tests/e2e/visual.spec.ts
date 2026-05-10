import { expect, test } from "@playwright/test";
import { themeIds } from "@openclog/core";
import { installApiFixtures } from "./support/api-fixtures.js";

const themes = themeIds;

for (const theme of themes) {
  test(`visual snapshot for ${theme}`, async ({ page }, testInfo) => {
    const viewportName = testInfo.project.name === "mobile" ? "mobile" : "desktop";
    await page.addInitScript(() => {
      Object.defineProperty(performance, "now", { configurable: true, value: () => 24 });
    });
    await installApiFixtures(page, { settingsTheme: theme });
    await page.goto("/");
    await expect(page.getByRole("main")).toHaveAttribute("data-theme", theme);
    await expect(page.getByText("Verification receipts: 2 published.")).toBeVisible();
    await expect(page).toHaveScreenshot(`${theme}-${viewportName}.png`, {
      fullPage: true,
      maxDiffPixels: 2500
    });
  });
}
