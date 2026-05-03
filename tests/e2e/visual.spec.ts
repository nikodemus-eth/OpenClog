import { expect, test } from "@playwright/test";
import { themeIds } from "@openclog/core";
import { installApiFixtures } from "./support/api-fixtures.js";

const themes = themeIds;

for (const theme of themes) {
  test(`visual snapshot for ${theme}`, async ({ page }, testInfo) => {
    const viewportName = testInfo.project.name === "mobile" ? "mobile" : "desktop";
    await installApiFixtures(page);
    await page.goto("/");
    await page.getByLabel("Theme").selectOption(theme);
    await expect(page.getByRole("main")).toHaveAttribute("data-theme", theme);
    await expect(page).toHaveScreenshot(`${theme}-${viewportName}.png`, {
      fullPage: true,
      maxDiffPixels: 800
    });
  });
}
