import type { OpenClogSettings } from "@openclog/core";
import type { SettingsRepository, UpdateSettingsInput } from "./contracts.js";
import { requireMethod } from "./utils.js";

const defaultSettings: OpenClogSettings = {
  version: 2,
  theme: "default",
  showToolCalls: true,
  searchPresets: [],
  operatorViews: []
};

export function getSettings(repo: Partial<SettingsRepository>): OpenClogSettings {
  const getSetting = requireMethod(repo.getSetting, "getSetting");
  const versioned = getSetting("settings.v2", null as OpenClogSettings | null);
  if (versioned && versioned.version === 2) return normalizeSettings(versioned);
  return normalizeSettings({
    version: 2,
    theme: getSetting("theme", defaultSettings.theme),
    showToolCalls: getSetting("showToolCalls", defaultSettings.showToolCalls),
    searchPresets: getSetting("searchPresets", defaultSettings.searchPresets),
    operatorViews: getSetting("operatorViews", defaultSettings.operatorViews)
  });
}

export function updateSettings(repo: Partial<SettingsRepository>, input: UpdateSettingsInput): OpenClogSettings {
  const getSetting = requireMethod(repo.getSetting, "getSetting");
  const setSetting = requireMethod(repo.setSetting, "setSetting");
  const current = getSettings(repo);
  const next = normalizeSettings({
    version: 2,
    theme: input.theme ?? current.theme ?? getSetting("theme", defaultSettings.theme),
    showToolCalls: input.showToolCalls ?? current.showToolCalls ?? getSetting("showToolCalls", defaultSettings.showToolCalls),
    searchPresets: input.searchPresets ?? current.searchPresets ?? getSetting("searchPresets", defaultSettings.searchPresets),
    operatorViews: input.operatorViews ?? current.operatorViews ?? getSetting("operatorViews", defaultSettings.operatorViews)
  });
  setSetting("theme", next.theme);
  setSetting("showToolCalls", next.showToolCalls);
  setSetting("searchPresets", next.searchPresets);
  setSetting("operatorViews", next.operatorViews);
  setSetting("settings.v2", next);
  return next;
}

function normalizeSettings(value: OpenClogSettings): OpenClogSettings {
  return {
    version: 2,
    theme: typeof value.theme === "string" && value.theme.trim() ? value.theme : defaultSettings.theme,
    showToolCalls: value.showToolCalls !== false,
    searchPresets: Array.isArray(value.searchPresets)
      ? value.searchPresets.filter((preset) => typeof preset?.id === "string" && typeof preset?.label === "string" && typeof preset?.query === "string")
      : [],
    operatorViews: Array.isArray(value.operatorViews)
      ? value.operatorViews.filter(
          (preset) =>
            typeof preset?.id === "string" &&
            typeof preset?.label === "string" &&
            typeof preset?.searchQuery === "string" &&
            Array.isArray(preset?.activeFilters) &&
            typeof preset?.grouped === "boolean"
        )
      : []
  };
}
