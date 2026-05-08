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
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
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
  const routeFilters = normalizeRouteFilters((params.get("filters") ?? "").split(","));
  return {
    selectedDayKey: params.get("day")?.trim() || defaultDayKey,
    grouped: params.get("view") !== "raw",
    activeFilters: routeFilters,
    focusedEntryId: params.get("entry")?.trim() || null,
    searchQuery: params.get("q")?.trim() ?? ""
  };
}

export function buildRouteParams(state: JournalRouteState): URLSearchParams {
  const params = new URLSearchParams();
  const selectedDayKey = state.selectedDayKey.trim();
  if (selectedDayKey) params.set("day", selectedDayKey);
  params.set("view", state.grouped ? "grouped" : "raw");
  const activeFilters = normalizeRouteFilters(state.activeFilters);
  if (activeFilters.length > 0) params.set("filters", activeFilters.join(","));
  const focusedEntryId = state.focusedEntryId?.trim();
  if (focusedEntryId) params.set("entry", focusedEntryId);
  const searchQuery = state.searchQuery.trim();
  if (searchQuery) params.set("q", searchQuery);
  return params;
}

function normalizeRouteFilters(values: string[]): JournalFilterKey[] {
  const seen = new Set<JournalFilterKey>();
  const normalized: JournalFilterKey[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!filterKeys.has(trimmed as JournalFilterKey)) continue;
    const filter = trimmed as JournalFilterKey;
    if (seen.has(filter)) continue;
    seen.add(filter);
    normalized.push(filter);
  }
  return normalized;
}
