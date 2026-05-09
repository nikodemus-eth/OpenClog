import type { BundleExport, SearchPreset } from "../api.js";
import {
  browserVisibleEntryText,
  describeGeneratedSummaryFreshness as describeGeneratedSummaryFreshnessFromCore,
  type AlertFinding,
  type CapabilityView,
  type CloseoutPlan,
  type CorrelationEdge,
  type CorrelationNode,
  type DeliveryReceipt,
  type GeneratedSummary,
  type JournalDay,
  type JournalEntry,
  type JournalFilterKey,
  type MonitoringImportResult,
  type OperatorViewPreset,
  type ReplayBundleDiff,
  type ReplayStep,
  type RetentionPreview,
  type SummaryJob
} from "@openclog/core";
import type { JournalRouteState } from "../hooks/useJournalRouting.js";

export const PINNED_SUMMARY_MAX_LENGTH = 280;

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

export function buildNamedOperatorViews(dayKey: string, sessionKey?: string): OperatorViewPreset[] {
  return [
    {
      id: "reconnect-triage",
      label: "Reconnect triage",
      dayKey,
      searchQuery: "gateway reconnect",
      activeFilters: ["errors"],
      grouped: true,
      builtIn: true,
      drilldown: { sessionKey, tab: "timeline", scrollTop: 0 }
    },
    {
      id: "pending-approvals",
      label: "Pending approvals",
      dayKey,
      searchQuery: "approval pending",
      activeFilters: ["approvals"],
      grouped: true,
      builtIn: true,
      drilldown: { sessionKey, tab: "actions", scrollTop: 0 }
    },
    {
      id: "delivery-failures",
      label: "Delivery failures",
      dayKey,
      searchQuery: "delivery receipt",
      activeFilters: ["errors"],
      grouped: false,
      builtIn: true,
      drilldown: { sessionKey, tab: "deliveries", scrollTop: 0 }
    },
    {
      id: "stale-summaries",
      label: "Stale summaries",
      dayKey,
      searchQuery: "summary stale",
      activeFilters: [],
      grouped: false,
      builtIn: true,
      drilldown: { sessionKey, tab: "timeline", scrollTop: 0 }
    },
    {
      id: "failed-receipts",
      label: "Failed receipts",
      dayKey,
      searchQuery: "delivery receipt failed",
      activeFilters: ["errors"],
      grouped: false,
      builtIn: true,
      drilldown: { sessionKey, tab: "deliveries", scrollTop: 0 }
    },
    {
      id: "stale-backend-fingerprint",
      label: "Backend mismatch",
      dayKey,
      searchQuery: "stale backend fingerprint",
      activeFilters: ["errors"],
      grouped: true,
      builtIn: true,
      drilldown: { sessionKey, tab: "timeline", scrollTop: 0 }
    },
    {
      id: "only-unresolved-incidents",
      label: "Only unresolved incidents",
      dayKey,
      searchQuery: "open alert failed action stale summary unresolved",
      activeFilters: ["errors", "approvals"],
      grouped: true,
      builtIn: true,
      hypothesis: "Unresolved incidents combine open alerts, failed actions, and stale summaries.",
      validationSteps: ["Review active alerts.", "Retry or record failed actions.", "Refresh stale summaries before handoff."],
      drilldown: { sessionKey, tab: "actions", scrollTop: 0 }
    },
    {
      id: "scope-missing",
      label: "Scope missing",
      dayKey,
      searchQuery: "scope missing",
      activeFilters: ["errors"],
      grouped: true,
      builtIn: true,
      drilldown: { sessionKey, tab: "actions", scrollTop: 0 }
    }
  ];
}

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

export interface RetentionSnapshotView {
  id: string;
  createdAt: string;
  preview: RetentionPreview;
}

export type AlertFindingView = AlertFinding & {
  acknowledgedAt?: string;
  snoozedUntil?: string;
};

export interface AlertFindingStateDescription {
  active: boolean;
  detail: string;
  label: string;
  snoozed: boolean;
  status: "active" | "active_acknowledged" | "inactive" | "snoozed";
}

export function validatePinnedSummary(summary: string, maxLength = 280): string | null {
  const trimmed = summary.trim();
  if (trimmed.length === 0) return "Pinned summary cannot be empty.";
  if (trimmed.length > maxLength) return `Pinned summary must be ${String(maxLength)} characters or fewer.`;
  return null;
}

export function remainingPinnedSummaryCharacters(summary: string, maxLength = PINNED_SUMMARY_MAX_LENGTH): number {
  return maxLength - summary.length;
}

export function diagnosticsCollapsedStorageKey(viewId: string | undefined, deviceClass: "desktop" | "mobile" = "desktop", builtIn = false): string {
  const scope = builtIn ? "builtin" : "user";
  return viewId ? `openclog.diagnostics.collapsed.${scope}.${deviceClass}.${viewId}` : `openclog.diagnostics.collapsed.${scope}.${deviceClass}.default`;
}

export function describeActiveOperatorView(
  route: Pick<JournalRouteState, "searchQuery" | "selectedDayKey" | "grouped" | "activeFilters">,
  operatorViews: OperatorViewPreset[]
): OperatorViewPreset | null {
  return (
    operatorViews.find(
      (view) =>
        view.searchQuery === route.searchQuery &&
        (view.dayKey ?? route.selectedDayKey) === route.selectedDayKey &&
        view.grouped === route.grouped &&
        JSON.stringify([...view.activeFilters].sort()) === JSON.stringify([...route.activeFilters].sort())
    ) ?? null
  );
}

export function describeOperatorViewSource(view: OperatorViewPreset | null): string | null {
  if (!view) return null;
  return view.builtIn ? `Built-in view: ${view.label} (${view.searchQuery})` : `Saved view: ${view.label} (${view.searchQuery})`;
}

export function describeComposerConnectivity(profileUrl: string | undefined, gatewayReady: boolean): { label: "Local only" | "Live Gateway"; detail: string } {
  const safety = classifyGatewayUrl(profileUrl);
  if (gatewayReady && (safety.kind === "loopback" || safety.kind === "lan" || safety.kind === "remote")) {
    return { label: "Live Gateway", detail: safety.detail };
  }
  return { label: "Local only", detail: `Composer will preserve the note locally until a live Gateway path is ready. ${safety.label}: ${safety.detail}` };
}

export function describeSummaryJobState(summaryJob: { status: string } | null, generatedSummary: GeneratedSummary | undefined): string {
  if (summaryJob) {
    const job = summaryJob as { error?: string; progressLabel?: string; status: string };
    const progress = job.progressLabel?.trim();
    let text = `Summary job ${job.status}${progress ? `: ${safeWorkbenchCopy(progress)}` : "."}`;
    if (job.error) {
      if (!text.endsWith(".")) text += ".";
      text += ` Error: ${safeWorkbenchCopy(job.error)}.`;
    }
    return text;
  }
  if (generatedSummary?.summary) return "Generated summary available.";
  return "Summary never generated for this day yet.";
}

export function formatSummaryJobDurations(summaryJob: Pick<SummaryJob, "createdAt" | "startedAt" | "completedAt">): {
  queuedFor: string;
  runningFor: string;
  lastCompleted: string | null;
  total: string;
} {
  return {
    queuedFor: formatDuration(durationMs(summaryJob.createdAt, summaryJob.startedAt ?? summaryJob.completedAt)),
    runningFor: formatDuration(durationMs(summaryJob.startedAt, summaryJob.completedAt)),
    lastCompleted: summaryJob.completedAt ?? null,
    total: formatDuration(durationMs(summaryJob.createdAt, summaryJob.completedAt))
  };
}

export function buildRetryReceiptConfirmation(receipt: DeliveryReceipt): string {
  return `Retry failed delivery ${safeWorkbenchCopy(receipt.id)} with the same idempotency key ${safeWorkbenchCopy(receipt.idempotencyKey ?? "unavailable")}. Confirm before resending this handoff.`;
}

export function buildRetryWithNewKeyReceiptConfirmation(receipt: DeliveryReceipt): string {
  return `Retry failed delivery ${safeWorkbenchCopy(receipt.id)} with a new idempotency key to bypass dedupe on the next handoff attempt.`;
}

export function buildGatewayScopeButtonLabel(label: string, missingScopes: string[]): string {
  if (missingScopes.length === 0) return label;
  return `${label} blocked: missing ${missingScopes.map(safeWorkbenchCopy).join(", ")}`;
}

export function formatCorrelationBadge(correlationId: string | undefined): { copyText: string; label: string } | null {
  if (!correlationId) return null;
  const safe = safeWorkbenchCopy(correlationId);
  return { copyText: safe, label: `correlationId ${safe}` };
}

export function describeStaleSummaryWarning(freshness: { lastEntryIncludedAt?: string; latestEntryObservedAt?: string }): string | null {
  if (!freshness.lastEntryIncludedAt || !freshness.latestEntryObservedAt) return null;
  if (Date.parse(freshness.latestEntryObservedAt) <= Date.parse(freshness.lastEntryIncludedAt)) return null;
  return `Summary may exclude latest entries: latest entry ${safeWorkbenchCopy(freshness.latestEntryObservedAt)} is newer than included entry ${safeWorkbenchCopy(freshness.lastEntryIncludedAt)}.`;
}

export function describeStaleSummaryInterval(freshness: { lastEntryIncludedAt?: string; latestEntryObservedAt?: string }): string | null {
  if (!freshness.lastEntryIncludedAt || !freshness.latestEntryObservedAt) return null;
  const start = Date.parse(freshness.lastEntryIncludedAt);
  const end = Date.parse(freshness.latestEntryObservedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return `Stale because the summary is missing ${formatDuration(end - start)} of journal activity between ${safeWorkbenchCopy(freshness.lastEntryIncludedAt)} and ${safeWorkbenchCopy(freshness.latestEntryObservedAt)}.`;
}

export function buildDryRunFailureJumpNotice(receipt: DeliveryReceipt): { href: string; label: string; message: string } | null {
  if (receipt.status !== "failed" || receipt.dryRun !== true) return null;
  const targetLabel = deliveryTargetLabel(receipt.target);
  return {
    href: `#delivery-target-${receipt.target}`,
    label: `Open ${targetLabel} delivery target`,
    message: `Dry-run verification failed for ${targetLabel}; jump to the delivery target card.`
  };
}

export function applyOperatorViewTimelinePreference(view: OperatorViewPreset, grouped: boolean): OperatorViewPreset {
  return { ...view, grouped };
}

export function mergeOperatorViewsForDay(dayKey: string, selectedSessionKey: string | undefined, persistedViews: OperatorViewPreset[] = []): OperatorViewPreset[] {
  const builtIns = buildNamedOperatorViews(dayKey, selectedSessionKey).map((view) => {
    const persisted = persistedViews.find((candidate) => candidate.builtIn === true && candidate.id === view.id);
    return persisted ? { ...view, grouped: persisted.grouped } : view;
  });
  const savedViews = persistedViews.filter((view) => view.builtIn !== true);
  return [...builtIns, ...savedViews];
}

export function isSummaryJobActive(summaryJob: { status: string } | null | undefined): boolean {
  return summaryJob?.status === "queued" || summaryJob?.status === "running";
}

export function getLastSuccessfulSummaryJobCompletionAt(
  summaryJob: { completedAt?: string; generatedSummary?: GeneratedSummary; status: string } | null | undefined,
  generatedSummary: GeneratedSummary | undefined
): string | undefined {
  if (summaryJob?.status === "completed") return summaryJob.completedAt ?? summaryJob.generatedSummary?.createdAt;
  return generatedSummary?.createdAt;
}

export function isGeneratedSummaryStale(generatedSummary: GeneratedSummary | undefined, entries: JournalEntry[]): boolean {
  return describeGeneratedSummaryFreshness(generatedSummary, entries).isStale;
}

export function describeGeneratedSummaryFreshness(
  generatedSummary: GeneratedSummary | undefined,
  entries: JournalEntry[]
): { isStale: boolean; lastEntryIncludedAt?: string; latestEntryObservedAt?: string } {
  return describeGeneratedSummaryFreshnessFromCore(generatedSummary, entries);
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

export function hasRetentionImpact(preview: RetentionPreview | null | undefined): boolean {
  if (!preview) return false;
  return retentionImpactCounts(preview).reduce((total, count) => total + count, 0) > 0;
}

export function formatRetentionSnapshotImpact(snapshot: RetentionSnapshotView | null): string | null {
  if (!snapshot) return null;
  const counts = retentionImpactLabels(snapshot.preview);
  return `Applied retention snapshot ${safeWorkbenchCopy(snapshot.id)} at ${safeWorkbenchCopy(snapshot.createdAt)}: removed ${counts.join(", ").replace(/, ([^,]*)$/, ", and $1")}.`;
}

export function thirtyMinuteSnoozeUntil(now = new Date()): string {
  return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
}

export function describeAlertFindingState(finding: AlertFindingView, now = new Date()): AlertFindingStateDescription {
  if (isFindingSnoozed(finding, now)) {
    return {
      active: false,
      detail: `${safeWorkbenchCopy(finding.title)} is snoozed but still preserved in local alert state.`,
      label: `Snoozed until ${safeWorkbenchCopy(finding.snoozedUntil!)}`,
      snoozed: true,
      status: "snoozed"
    };
  }
  if (finding.triggered && finding.acknowledgedAt) {
    return {
      active: true,
      detail: safeWorkbenchCopy(finding.detail),
      label: `Active, acknowledged at ${safeWorkbenchCopy(finding.acknowledgedAt)}`,
      snoozed: false,
      status: "active_acknowledged"
    };
  }
  if (finding.triggered) {
    return {
      active: true,
      detail: safeWorkbenchCopy(finding.detail),
      label: "Active",
      snoozed: false,
      status: "active"
    };
  }
  return {
    active: false,
    detail: safeWorkbenchCopy(finding.detail),
    label: "Inactive",
    snoozed: false,
    status: "inactive"
  };
}

export function summarizeAlertFindings(findings: AlertFindingView[], now = new Date()): { activeCount: number; acknowledgedCount: number; snoozedCount: number } {
  return findings.reduce(
    (summary, finding) => {
      const state = describeAlertFindingState(finding, now);
      if (state.active) summary.activeCount += 1;
      if (finding.acknowledgedAt) summary.acknowledgedCount += 1;
      if (state.snoozed) summary.snoozedCount += 1;
      return summary;
    },
    { activeCount: 0, acknowledgedCount: 0, snoozedCount: 0 }
  );
}

export function formatMissionReplayStep(step: ReplayStep, index: number): string {
  const entryText = step.entryIds.length > 0 ? step.entryIds.map(safeWorkbenchCopy).join(", ") : "none";
  const sourceText = step.sourceIds.length > 0 ? step.sourceIds.map(safeWorkbenchCopy).join(", ") : "none";
  return `Step ${String(index + 1)}: ${step.kind.replaceAll("_", " ")} at ${safeWorkbenchCopy(step.timestamp)} - ${safeWorkbenchCopy(step.label)} - entries ${entryText} - sources ${sourceText}.`;
}

export function formatCorrelationNode(node: CorrelationNode): string {
  return `${safeWorkbenchCopy(node.id)}: ${safeWorkbenchCopy(node.label)} (${node.type.replaceAll("_", " ")})`;
}

export function formatCorrelationEdge(edge: CorrelationEdge): string {
  return `${safeWorkbenchCopy(edge.id)}: ${safeWorkbenchCopy(edge.from)} ${correlationRelationshipLabel(edge.relationship)} ${safeWorkbenchCopy(edge.to)}`;
}

export function searchEmptyState(query: string, resultCount: number): string | null {
  const trimmed = query.trim();
  if (!trimmed || resultCount > 0) return null;
  return `No journal matches for “${trimmed}”. Try a tool name, status, or session key.`;
}

export function dedupeLiveActionNotice(current: string[], next: string, maxItems = 3): string[] {
  const normalized = next.trim();
  if (!normalized) return current;
  return [normalized, ...current.filter((item) => item !== normalized)].slice(0, maxItems);
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
  const digest = "signature" in bundle.manifest && bundle.manifest.signature ? (bundle.manifest.signature as { digest?: string }).digest : undefined;
  const signature = "signature" in bundle.manifest && bundle.manifest.signature ? ` Digest ${digest ? safeWorkbenchCopy(String(digest)) : "unavailable"}.` : "";
  return `Bundle contains ${String(entryCount)} entries for ${bundle.manifest.dayKey}, exported at ${bundle.manifest.exportedAt}, version ${bundle.manifest.version}.${signature}`;
}

export function formatReceiptDetails(receipt: DeliveryReceipt): string {
  return [
    `Receipt ${safeWorkbenchCopy(receipt.id)} ${safeWorkbenchCopy(receipt.status)} for ${safeWorkbenchCopy(receipt.target)}.`,
    `Request fingerprint ${safeWorkbenchCopy(receipt.requestFingerprint ?? "unavailable")}.`,
    `Idempotency key ${safeWorkbenchCopy(receipt.idempotencyKey ?? "unavailable")}.`,
    `Correlation ${safeWorkbenchCopy(receipt.correlationId ?? "unavailable")}.`,
    receipt.retryOfReceiptId ? `Retry of ${safeWorkbenchCopy(receipt.retryOfReceiptId)} attempt ${String(receipt.attemptNumber ?? 1)}.` : `Attempt ${String(receipt.attemptNumber ?? 1)}.`,
    receipt.secretRef ? `Secret ref ${safeWorkbenchCopy(`${receipt.secretRef.backend}:${receipt.secretRef.key}`)}.` : "Secret ref unavailable.",
    receipt.deadLetterReason ? `Dead letter ${safeWorkbenchCopy(receipt.deadLetterReason)}.` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

export function formatIntegrationVerificationReceipt(receipt: DeliveryReceipt): string {
  return [
    `${safeWorkbenchCopy(receipt.target)} dry-run verification ${safeWorkbenchCopy(receipt.status)}.`,
    `Delivery reference ${safeWorkbenchCopy(receipt.deliveryReference ?? "unavailable")}.`,
    `Receipt ${safeWorkbenchCopy(receipt.id)}.`,
    receipt.deadLetterReason ? safeWorkbenchCopy(receipt.deadLetterReason) : ""
  ]
    .filter(Boolean)
    .join(" ");
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

export function formatMonitoringImportSummary(result: MonitoringImportResult | null): string | null {
  if (!result) return null;
  const path = result.provenance.sourcePath ? safeWorkbenchCopy(result.provenance.sourcePath) : "local explicit paste";
  return `Monitoring import ${safeWorkbenchCopy(result.batchId)}: ${String(result.notes.length)} operator note(s), ${String(result.handoffPackets.length)} handoff packet(s), workflow ${result.provenance.sourceWorkflow.join(", ")}, source ${path}, redactions ${String(result.provenance.redactionCount)}.`;
}

export function formatCapabilitySummary(capability: CapabilityView): string {
  const gate = capability.useGate.allowed ? "available" : `${capability.useGate.status}: ${capability.useGate.blockers.join(", ") || "blocked"}`;
  const purpose = safeWorkbenchCopy(capability.purpose);
  return [
    `${safeWorkbenchCopy(capability.label)} ${safeWorkbenchCopy(capability.version)} ${gate}.`,
    `Purpose: ${purpose}${/[.!?]$/.test(purpose) ? "" : "."}`,
    `Permissions: ${capability.permissions.map(safeWorkbenchCopy).join(", ") || "none"}.`,
    `Failure modes: ${capability.failureModes.map(safeWorkbenchCopy).join(", ") || "none"}.`,
    `Audit: ${capability.auditProvenance.map(safeWorkbenchCopy).join(", ") || "none"}.`,
    `Approval: ${safeWorkbenchCopy(capability.approvalSignature ?? "missing")}.`,
    `Review/expiry: ${safeWorkbenchCopy(capability.reviewBy ?? capability.expiresAt ?? "missing")}.`
  ].join(" ");
}

export function capabilityGateAllows(capabilities: CapabilityView[], capabilityId: string): boolean {
  return capabilities.find((capability) => capability.id === capabilityId)?.useGate.allowed === true;
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

function retentionImpactCounts(preview: RetentionPreview): number[] {
  return [
    preview.removedDayKeys.length,
    preview.removedEntryCount,
    preview.removedSummaryCount,
    preview.removedAuditCount,
    preview.removedIncidentCount ?? 0,
    preview.removedAlertCount ?? 0,
    preview.removedBundleCount ?? 0
  ];
}

function retentionImpactLabels(preview: RetentionPreview): string[] {
  return [
    `${String(preview.removedDayKeys.length)} day(s)`,
    `${String(preview.removedEntryCount)} entries`,
    `${String(preview.removedSummaryCount)} summaries`,
    `${String(preview.removedAuditCount)} audit rows`,
    `${String(preview.removedIncidentCount ?? 0)} incidents`,
    `${String(preview.removedAlertCount ?? 0)} alerts`,
    `${String(preview.removedBundleCount ?? 0)} bundles`
  ];
}

function isFindingSnoozed(finding: AlertFindingView, now: Date): boolean {
  if (!finding.snoozedUntil) return false;
  const snoozedUntilMs = Date.parse(finding.snoozedUntil);
  return Number.isFinite(snoozedUntilMs) && snoozedUntilMs > now.getTime();
}

function correlationRelationshipLabel(relationship: CorrelationEdge["relationship"]): string {
  if (relationship === "belongs_to") return "belongs to";
  if (relationship === "triggered_by") return "triggered by";
  if (relationship === "exported_to") return "exported to";
  return relationship;
}

function durationMs(start: string | undefined, end: string | undefined): number {
  if (!start || !end) return 0;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, endMs - startMs);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${String(ms)}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${String(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${String(minutes)}m` : `${String(minutes)}m ${String(remainder)}s`;
}

function deliveryTargetLabel(target: DeliveryReceipt["target"]): string {
  if (target === "generic-webhook") return "Generic webhook";
  if (target === "github-issue") return "GitHub issue";
  return target[0].toUpperCase() + target.slice(1);
}

function safeWorkbenchCopy(value: string): string {
  return browserVisibleEntryText(
    {
      id: "operator-workspace-copy",
      dayKey: "operator-workspace",
      source: "system",
      kind: "system_status",
      title: "Operator workspace copy",
      body: value,
      timestamp: "1970-01-01T00:00:00.000Z",
      redacted: true
    },
    { expanded: true }
  ).body;
}
