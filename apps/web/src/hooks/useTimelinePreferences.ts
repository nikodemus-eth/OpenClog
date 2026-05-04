import { useEffect, useMemo, useState } from "react";
import type { JournalFilterKey } from "@openclog/core";

interface StoredPreferences {
  [key: string]: {
    filters: JournalFilterKey[];
    grouped: boolean;
  };
}

const storageKey = "openclog.timeline.preferences";

export function useTimelinePreferences(dayKey: string, themeId: string, routeGrouped: boolean, routeFilters: JournalFilterKey[]) {
  const key = `${dayKey}:${themeId}`;
  const stored = useMemo(() => readStoredPreferences()[key], [key]);
  const [grouped, setGrouped] = useState(routeFilters.length === 0 && stored ? stored.grouped : routeGrouped);
  const [activeFilters, setActiveFilters] = useState<JournalFilterKey[]>(routeFilters.length === 0 && stored ? stored.filters : routeFilters);

  useEffect(() => {
    const all = readStoredPreferences();
    all[key] = { grouped, filters: activeFilters };
    window.localStorage.setItem(storageKey, JSON.stringify(all));
  }, [activeFilters, grouped, key]);

  useEffect(() => {
    const next = readStoredPreferences()[key];
    if (routeFilters.length > 0) setActiveFilters(routeFilters);
    else setActiveFilters(next?.filters ?? []);
    setGrouped(routeGrouped ?? next?.grouped ?? true);
  }, [key, routeFilters, routeGrouped]);

  return { activeFilters, grouped, setActiveFilters, setGrouped };
}

function readStoredPreferences(): StoredPreferences {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as StoredPreferences) : {};
  } catch {
    return {};
  }
}
