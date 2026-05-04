import { useEffect, useMemo, useState } from "react";
import type { JournalFilterKey } from "@openclog/core";

export interface JournalRouteState {
  activeFilters: JournalFilterKey[];
  focusedEntryId: string | null;
  grouped: boolean;
  searchQuery: string;
  selectedDayKey: string;
}

const filterKeys = new Set<JournalFilterKey>(["errors", "approvals", "tool_failures", "session_starts", "inter_session_messages", "acks"]);

export function useJournalRouting(defaultDayKey: string) {
  const initial = useMemo(() => readRoute(defaultDayKey), [defaultDayKey]);
  const [selectedDayKey, setSelectedDayKey] = useState(initial.selectedDayKey);
  const [grouped, setGrouped] = useState(initial.grouped);
  const [activeFilters, setActiveFilters] = useState<JournalFilterKey[]>(initial.activeFilters);
  const [focusedEntryId, setFocusedEntryId] = useState<string | null>(initial.focusedEntryId);
  const [searchQuery, setSearchQuery] = useState(initial.searchQuery);

  useEffect(() => {
    const params = buildRouteParams({ activeFilters, focusedEntryId, grouped, searchQuery, selectedDayKey });
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", nextUrl);
  }, [activeFilters, focusedEntryId, grouped, searchQuery, selectedDayKey]);

  return {
    activeFilters,
    focusedEntryId,
    grouped,
    searchQuery,
    selectedDayKey,
    setActiveFilters,
    setFocusedEntryId,
    setGrouped,
    setSearchQuery,
    setSelectedDayKey,
    resetToHome(next: JournalRouteState) {
      setSelectedDayKey(next.selectedDayKey);
      setGrouped(next.grouped);
      setActiveFilters(next.activeFilters);
      setFocusedEntryId(next.focusedEntryId);
      setSearchQuery(next.searchQuery);
    }
  };
}

function readRoute(defaultDayKey: string): JournalRouteState {
  const params = new URLSearchParams(window.location.search);
  return readRouteFromParams(params, defaultDayKey);
}

export function readRouteFromParams(params: URLSearchParams, defaultDayKey: string): JournalRouteState {
  const routeFilters = (params.get("filters") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is JournalFilterKey => filterKeys.has(value as JournalFilterKey));
  return {
    selectedDayKey: params.get("day") ?? defaultDayKey,
    grouped: params.get("view") !== "raw",
    activeFilters: routeFilters,
    focusedEntryId: params.get("entry"),
    searchQuery: params.get("q") ?? ""
  };
}

export function buildRouteParams(state: JournalRouteState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("day", state.selectedDayKey);
  params.set("view", state.grouped ? "grouped" : "raw");
  if (state.activeFilters.length > 0) params.set("filters", state.activeFilters.join(","));
  if (state.focusedEntryId) params.set("entry", state.focusedEntryId);
  if (state.searchQuery.trim()) params.set("q", state.searchQuery.trim());
  return params;
}
