import type { OpenClogSettings, OperatorViewPreset } from "@openclog/core";
import type { SettingsRepository, UpdateSettingsInput } from "./contracts.js";
import { requireMethod } from "./utils.js";

export const defaultOperatorViews: OperatorViewPreset[] = [
  {
    id: "reconnect-triage",
    label: "Reconnect triage",
    searchQuery: "gateway reconnect",
    activeFilters: ["errors"],
    grouped: true,
    builtIn: true,
    drilldown: { tab: "timeline", scrollTop: 0 }
  },
  {
    id: "pending-approvals",
    label: "Pending approvals",
    searchQuery: "approval pending",
    activeFilters: ["approvals"],
    grouped: true,
    builtIn: true,
    drilldown: { tab: "actions", scrollTop: 0 }
  },
  {
    id: "delivery-failures",
    label: "Delivery failures",
    searchQuery: "delivery receipt",
    activeFilters: ["errors"],
    grouped: false,
    builtIn: true,
    drilldown: { tab: "deliveries", scrollTop: 0 }
  }
];

const defaultSettings: OpenClogSettings = {
  version: 2,
  theme: "default",
  showToolCalls: true,
  searchPresets: [],
  operatorViews: defaultOperatorViews
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
    operatorViews: mergeOperatorViews(value.operatorViews)
  };
}

function mergeOperatorViews(value: OpenClogSettings["operatorViews"] | unknown): OperatorViewPreset[] {
  const stored: OperatorViewPreset[] = Array.isArray(value)
    ? value
        .filter(
          (preset) =>
            typeof preset?.id === "string" &&
            typeof preset?.label === "string" &&
            typeof preset?.searchQuery === "string" &&
            Array.isArray(preset?.activeFilters) &&
            typeof preset?.grouped === "boolean"
        )
        .map((preset): OperatorViewPreset => ({
          id: preset.id,
          label: preset.label,
          dayKey: typeof preset.dayKey === "string" ? preset.dayKey : undefined,
          searchQuery: preset.searchQuery,
          activeFilters: preset.activeFilters,
          grouped: preset.grouped,
          builtIn: preset.builtIn === true,
          drilldown: {
            sessionKey: typeof preset.drilldown?.sessionKey === "string" ? preset.drilldown.sessionKey : undefined,
            tab:
              preset.drilldown?.tab === "actions" || preset.drilldown?.tab === "deliveries"
                ? preset.drilldown.tab
                : "timeline",
            scrollTop: typeof preset.drilldown?.scrollTop === "number" ? preset.drilldown.scrollTop : 0
          }
        }))
    : [];
  const merged = [...stored];
  for (const builtIn of defaultOperatorViews) {
    if (!merged.some((view) => view.id === builtIn.id)) merged.push(builtIn);
  }
  return merged.slice(0, 12);
}
