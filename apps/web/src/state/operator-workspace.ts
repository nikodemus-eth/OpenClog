import type { BundleExport, SearchPreset } from "../api.js";
import type { CloseoutPlan, GeneratedSummary, JournalDay, JournalEntry, JournalFilterKey, ReplayBundleDiff, RetentionPreview } from "@openclog/core";
import type { JournalRouteState } from "../hooks/useJournalRouting.js";

export const DEFAULT_SEARCH_PRESETS: SearchPreset[] = [
  { id: "tool-failures", label: "Tool failures", query: "status:failed tool" },
  { id: "pending-approvals", label: "Pending approvals", query: "approval pending" },
  { id: "gateway-reconnects", label: "Gateway reconnects", query: "gateway reconnect" },
  { id: "sequence-gaps", label: "Sequence gaps", query: "sequence gap" },
  { id: "adapter-failures", label: "Adapter failures", query: "adapter failed" },
  { id: "stale-summaries", label: "Stale summaries", query: "summary stale" },
  { id: "delivery-receipts", label: "Delivery receipts", query: "delivery receipt" },
  { id: "plugin-runs", label: "Plugin runs", query: "plugin run" }
];

export interface GatewayUrlSafety {
  kind: "unset" | "invalid" | "loopback" | "lan" | "remote";
  label: string;
  detail: string;
}

export interface ArchiveView {
  recentDays: Array<Omit<JournalDay, "entries">>;
  selectedOlderDay: Omit<JournalDay, "entries"> | null;
}

export interface DiagnosticsCollapsedState {
  [key: string]: boolean;
  agentActivity: boolean;
  gateway: boolean;
  pendingApprovals: boolean;
  recentTools: boolean;
}

export function validatePinnedSummary(summary: string, maxLength = 280): string | null {
  const trimmed = summary.trim();
  if (trimmed.length === 0) return "Pinned summary cannot be empty.";
  if (trimmed.length > maxLength) return `Pinned summary must be ${String(maxLength)} characters or fewer.`;
  return null;
}

export function isGeneratedSummaryStale(generatedSummary: GeneratedSummary | undefined, entries: JournalEntry[]): boolean {
  return describeGeneratedSummaryFreshness(generatedSummary, entries).isStale;
}

export function describeGeneratedSummaryFreshness(
  generatedSummary: GeneratedSummary | undefined,
  entries: JournalEntry[]
): { isStale: boolean; lastEntryIncludedAt?: string; latestEntryObservedAt?: string } {
  if (!generatedSummary) return { isStale: false };
  const generatedAt = Date.parse(generatedSummary.createdAt);
  if (!Number.isFinite(generatedAt)) return { isStale: false };
  const entryTimes = entries
    .map((entry) => ({ entry, entryTime: Date.parse(entry.timestamp) }))
    .filter((item) => Number.isFinite(item.entryTime));
  const latestIncluded = entryTimes.filter((item) => item.entryTime <= generatedAt).sort((left, right) => right.entryTime - left.entryTime)[0];
  const latestObserved = entryTimes.sort((left, right) => right.entryTime - left.entryTime)[0];
  return {
    isStale: entryTimes.some((item) => item.entryTime > generatedAt),
    ...(latestIncluded ? { lastEntryIncludedAt: latestIncluded.entry.timestamp } : {}),
    ...(latestObserved ? { latestEntryObservedAt: latestObserved.entry.timestamp } : {})
  };
}

export function classifyGatewayUrl(url: string | undefined): GatewayUrlSafety {
  if (!url) return { kind: "unset", label: "Gateway URL unavailable", detail: "This profile does not declare an explicit Gateway target." };
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "::1" || host.startsWith("127.")) {
      return { kind: "loopback", label: "Loopback-safe", detail: "Profile targets the local machine only." };
    }
    if (isPrivateIpv4(host)) {
      return { kind: "lan", label: "LAN-local", detail: "Profile points at a private-network Gateway target." };
    }
    return { kind: "remote", label: "Remote target", detail: "Profile points outside the local machine and private LAN." };
  } catch {
    return { kind: "invalid", label: "Invalid Gateway URL", detail: "Profile Gateway URL could not be parsed." };
  }
}

export function buildReconnectTrendText(reconnectCount: number): string {
  if (reconnectCount <= 0) return "Reconnect trend: stable, no reconnects observed.";
  if (reconnectCount === 1) return "Reconnect trend: one reconnect observed, watch for recurrence.";
  if (reconnectCount <= 3) return `Reconnect trend: elevated, ${String(reconnectCount)} reconnects observed.`;
  return `Reconnect trend: noisy, ${String(reconnectCount)} reconnects observed.`;
}

export function formatRetentionPreview(preview: RetentionPreview | null): string | null {
  if (!preview) return null;
  return `Retention would remove ${String(preview.removedDayKeys.length)} day(s), ${String(preview.removedEntryCount)} entries, ${String(preview.removedSummaryCount)} summaries, and ${String(preview.removedAuditCount)} audit rows; before/after impact includes ${String(preview.removedIncidentCount ?? 0)} incidents, ${String(preview.removedAlertCount ?? 0)} alerts, and ${String(preview.removedBundleCount ?? 0)} bundles.`;
}

export function searchEmptyState(query: string, resultCount: number): string | null {
  const trimmed = query.trim();
  if (!trimmed || resultCount > 0) return null;
  return `No journal matches for “${trimmed}”. Try a tool name, status, or session key.`;
}

export function classifyGatewayErrorCategory(reason: string | undefined): string {
  const normalized = reason?.toLocaleLowerCase() ?? "";
  if (normalized.includes("device identity")) return "device_identity";
  if (normalized.includes("token")) return "token";
  if (normalized.includes("challenge") && normalized.includes("timeout")) return "challenge_timeout";
  if (normalized.includes("scope")) return "scope";
  if (normalized.includes("pair")) return "pairing";
  return "unknown";
}

export function formatBundleManifestPreview(bundle: Pick<BundleExport, "manifest" | "day">): string {
  const entryCount = bundle.day.entries.length;
  return `Bundle contains ${String(entryCount)} entries for ${bundle.manifest.dayKey}, exported at ${bundle.manifest.exportedAt}, version ${bundle.manifest.version}.`;
}

export function formatReplayBundleDiff(diff: ReplayBundleDiff | null): string | null {
  if (!diff) return null;
  const changedFields = [...diff.changedManifestFields, ...diff.changedMetadataFields];
  return `Bundle diff ${diff.leftDayKey} -> ${diff.rightDayKey}: ${diff.changeClass.replaceAll("_", " ")}, +${String(diff.addedEntryIds.length)} / -${String(diff.removedEntryIds.length)} entries, delta ${String(diff.entryCountDelta)}, summary ${diff.summaryChanged ? "changed" : "unchanged"}, markdown ${diff.markdownChanged ? "changed" : "unchanged"}${changedFields.length > 0 ? `, fields: ${changedFields.join(", ")}` : ""}.`;
}

export function validateInvestigationNote(body: string, maxLength = 1000): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Investigation note cannot be empty.";
  if (trimmed.length > maxLength) return `Investigation note must be ${String(maxLength)} characters or fewer.`;
  return null;
}

export function formatCloseoutPlan(plan: CloseoutPlan | null): string | null {
  if (!plan) return null;
  return `Closeout for ${plan.dayKey}: ${plan.generatedSummaryFresh ? "summary current" : "summary needs refresh"}, ${String(plan.incidentCount)} incidents, ${String(plan.noteCount)} notes, ${String(plan.retentionPreview.removedDayKeys.length)} day(s) in retention impact, exports ${plan.exportTargets.join(", ") || "not selected"}.`;
}

export function addSearchPreset(current: SearchPreset[], query: string): SearchPreset[] {
  const trimmed = query.trim();
  if (!trimmed) return current;
  const next: SearchPreset = {
    id: trimmed.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "preset",
    label: trimmed,
    query: trimmed
  };
  return [next, ...current.filter((preset) => preset.query.toLocaleLowerCase() !== trimmed.toLocaleLowerCase())].slice(0, 8);
}

export function mergeSearchPresets(stored: SearchPreset[]): SearchPreset[] {
  const seen = new Set<string>();
  return [...stored, ...DEFAULT_SEARCH_PRESETS].filter((preset) => {
    const key = preset.query.trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

export function buildArchiveView(days: Array<Omit<JournalDay, "entries">>, selectedDayKey: string, recentCount = 7): ArchiveView {
  const recentDays = days.slice(0, recentCount);
  const selectedOlderDay = recentDays.some((day) => day.dayKey === selectedDayKey) ? null : days.find((day) => day.dayKey === selectedDayKey) ?? null;
  return { recentDays, selectedOlderDay };
}

export function findDayByCalendarValue(days: Array<Omit<JournalDay, "entries">>, value: string): Omit<JournalDay, "entries"> | null {
  return days.find((day) => day.dayKey === value) ?? null;
}

export function createHomeRouteState(newestDayKey: string, current: JournalRouteState): JournalRouteState {
  return {
    activeFilters: [],
    focusedEntryId: null,
    grouped: current.grouped,
    searchQuery: "",
    selectedDayKey: newestDayKey
  };
}

export function getInitialDiagnosticsCollapsedState(_pendingApprovalCount: number): DiagnosticsCollapsedState {
  return {
    pendingApprovals: false,
    gateway: false,
    agentActivity: false,
    recentTools: false,
    todayAtGlance: false,
    timelineFilters: false
  };
}

export function mergeDiagnosticsCollapsedState(
  base: DiagnosticsCollapsedState,
  stored: Record<string, unknown> | null | undefined
): DiagnosticsCollapsedState {
  if (!stored) return base;
  const merged: DiagnosticsCollapsedState = { ...base };
  for (const [key, value] of Object.entries(stored)) {
    if (typeof value === "boolean") merged[key] = value;
  }
  return merged;
}

export function isEntryMatchingFilter(entry: JournalEntry, filter: JournalFilterKey): boolean {
  if (filter === "errors") return entry.severity === "error" || entry.status === "failed";
  if (filter === "approvals") return entry.kind === "approval_requested" || entry.kind === "approval_resolved";
  if (filter === "tool_failures") return (entry.kind === "tool_call" || entry.kind === "tool_result") && (entry.severity === "error" || entry.status === "failed");
  if (filter === "session_starts") return entry.kind === "session_started";
  if (filter === "inter_session_messages") {
    const title = `${entry.title} ${entry.body ?? ""}`.toLocaleLowerCase();
    return entry.source === "system" && (title.includes("inter-session") || title.includes("handoff"));
  }
  const title = `${entry.title} ${entry.body ?? ""}`.toLocaleLowerCase();
  return title.includes("ack") || title.includes("acknowledg");
}

export function applyEntryFilters(entries: JournalEntry[], activeFilters: JournalFilterKey[], showToolCalls: boolean): JournalEntry[] {
  const shouldHideAnyCategories = activeFilters.length > 0;
  const filtered = shouldHideAnyCategories ? entries.filter((entry) => !activeFilters.some((filter) => isEntryMatchingFilter(entry, filter))) : entries;
  if (showToolCalls) return filtered;
  return filtered.filter((entry) => entry.kind !== "tool_call" && entry.kind !== "tool_result");
}

function isPrivateIpv4(host: string): boolean {
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  const match = /^172\.(\d{1,3})\./.exec(host);
  if (!match) return false;
  const second = Number(match[1]);
  return second >= 16 && second <= 31;
}
