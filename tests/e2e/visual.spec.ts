import { expect, test } from "@playwright/test";
import { installApiFixtures } from "./support/api-fixtures.js";

for (const theme of ["default", "captains-log", "hearty-tale", "blackbeards-log"] as const) {
  test(`visual snapshot for ${theme}`, async ({ page }) => {
    await installApiFixtures(page);
    await page.goto("/");
    await page.getByLabel("Theme").selectOption(theme);
    await expect(page.getByRole("main")).toHaveAttribute("data-theme", theme);
    await expect(page).toHaveScreenshot(`${theme}.png`, {
      fullPage: true,
      maxDiffPixels: 400
    });
  });
}
