import { expect, test } from "@playwright/test";
import { themeIds } from "@openclog/core";
import { installApiFixtures } from "./support/api-fixtures.js";

const themes = themeIds;

async function waitForStableFullPageHeight(page: Parameters<typeof test>[0]["page"]): Promise<void> {
  await page.waitForFunction(() => {
    const key = "__openclogVisualHeight";
    const state = (window as Record<string, { height: number; stableTicks: number }>)[key] ?? {
      height: 0,
      stableTicks: 0
    };
    const height = document.documentElement.scrollHeight;
    if (state.height === height) state.stableTicks += 1;
    else {
      state.height = height;
      state.stableTicks = 0;
    }
    (window as Record<string, { height: number; stableTicks: number }>)[key] = state;
    return state.stableTicks >= 4;
  }, { polling: 100, timeout: 5_000 });
}

for (const theme of themes) {
  test(`visual snapshot for ${theme}`, async ({ page }, testInfo) => {
    const viewportName = testInfo.project.name === "mobile" ? "mobile" : "desktop";
    await page.addInitScript(({ nowMs }) => {
      const OriginalDate = Date;
      const originalSetInterval = window.setInterval.bind(window);
      class FixedDate extends OriginalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(nowMs);
            return;
          }
          super(...(args as ConstructorParameters<typeof Date>));
        }

        static now(): number {
          return nowMs;
        }

        static parse(value: string): number {
          return OriginalDate.parse(value);
        }

        static UTC(...args: Parameters<typeof Date.UTC>): number {
          return OriginalDate.UTC(...args);
        }
      }
      Object.defineProperty(window, "Date", {
        configurable: true,
        writable: true,
        value: FixedDate
      });
      Object.defineProperty(window, "setInterval", {
        configurable: true,
        writable: true,
        value: ((handler: TimerHandler, _timeout?: number, ...args: unknown[]) =>
          originalSetInterval(handler, 60_000_000, ...args)) as typeof window.setInterval
      });
      Object.defineProperty(performance, "now", { configurable: true, value: () => 24 });
    }, { nowMs: Date.parse("2026-05-04T12:20:00.000Z") });
    await installApiFixtures(page, { settingsTheme: theme });
    await page.goto("/");
    await expect(page.getByRole("main")).toHaveAttribute("data-theme", theme);
    await expect(page.getByText("Verification receipts: 2 published.")).toBeVisible();
    await waitForStableFullPageHeight(page);
    await expect(page).toHaveScreenshot(`${theme}-${viewportName}.png`, {
      fullPage: true,
      maxDiffPixels: 2500
    });
  });
}
