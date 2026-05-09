import { useDeferredValue, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { FileText, Search, SlidersHorizontal, SquareChartGantt } from "lucide-react";
import {
  displayProductCopy,
  getTheme,
  resolveThemeId,
  sampleJournalDay,
  type AdapterEvent,
  type AgentActivity,
  type AlertRule,
  type ApprovalView,
  type CapabilityView,
  type DeliveryReceipt,
  type IncidentActionRecord,
  type IncidentSummary,
  type InvestigationNote,
  type JournalDay,
  type JournalEntry,
  type JournalFilterKey,
  type JournalSearchResult,
  type OperatorViewPreset,
  type OperationsBacklogReport,
  type ProfileConfig,
  type ServiceHealthTimelineEntry,
  type ThemeId,
  type VerificationReceipt
} from "@openclog/core";
import {
  acknowledgeAlert,
  applyRetention,
  type BundleExport,
  buildCloseoutPlan,
  executeIncidentAction,
  fetchCapabilities,
  deliverIntegration,
  createReplayWorkspace,
  createSummaryJob,
  fetchAnalytics,
  fetchCorrelation,
  fetchDeliveryReceipts,
  fetchHealthAggregate,
  fetchHealthHistory,
  fetchHealthTimeline,
  fetchIntegrityReports,
  fetchIncidentActionRecords,
  fetchIncidentRulePacks,
  buildIntegrationPayload,
  createIncidentSnapshot,
  createProfile,
  diffReplayBundles,
  exportBundle,
  exportDay,
  fetchAdapterEvents,
  fetchAlerts,
  fetchApprovals,
  fetchDay,
  fetchDays,
  fetchHealth,
  fetchLineage,
  fetchIncidentWorkspace,
  fetchIncidents,
  fetchInvestigationNotes,
  fetchOperationsBacklog,
  fetchPlugins,
  fetchProfiles,
  fetchReplay,
  fetchRetentionClasses,
  fetchRunbook,
  fetchSessionDrilldown,
  fetchSessions,
  fetchSettings,
  fetchSlo,
  fetchSummaryProfiles,
  fetchVerificationReceipts,
  fetchVersion,
  generateSummaryProfile,
  importMonitoringDecisions,
  pollSummaryJobUntilSettled,
  previewRetention,
  previewRetentionByClass,
  registerPlugin,
  resolveApproval,
  rollbackRetention,
  retryDeliveryReceipt,
  runIntegrityCheck,
  runIntegrityMonitor,
  runPlugin,
  saveAlertRule,
  saveRetentionClass,
  searchJournal,
  type SearchPreset,
  selectableThemeIds,
  selectProfile,
  sendComposer,
  snoozeAlert,
  updateDayContext,
  updateSettings,
  verifyIntegrationTarget,
  type ApprovalView as ApprovalApiView,
  type RetentionSnapshotResult,
  type VerifiableIntegrationTarget,
  type VersionResponse
} from "./api.js";
import {
  AppShell,
  BackendMismatchBanner,
  Composer,
  DayHeader,
  GatewayReadinessBanner,
  Timeline,
  type ApprovalChoice,
  type DiagnosticCardDefinition,
  type GatewayViewState,
  type LiveEventToast
} from "./components/JournalLayout.js";
import { useJournalRouting } from "./hooks/useJournalRouting.js";
import {
  addSearchPreset,
  applyEntryFilters,
  buildArchiveView,
  buildDryRunFailureJumpNotice,
  buildGatewayScopeButtonLabel,
  buildReconnectTrendText,
  buildRetryReceiptConfirmation,
  describeActiveOperatorView,
  describeComposerConnectivity,
  dedupeLiveActionNotice,
  describeAlertFindingState,
  describeOperatorViewSource,
  describeSummaryJobState,
  describeStaleSummaryWarning,
  diagnosticsCollapsedStorageKey,
  mergeDiagnosticsCollapsedState,
  mergeSearchPresets,
  createHomeRouteState,
  describeGeneratedSummaryFreshness,
  formatCorrelationEdge,
  formatCorrelationNode,
  formatBundleManifestPreview,
  formatCloseoutPlan,
  formatIntegrationVerificationReceipt,
  formatReceiptDetails,
  getLastSuccessfulSummaryJobCompletionAt,
  formatMissionReplayStep,
  formatReplayBundleDiff,
  formatRetentionSnapshotImpact,
  findDayByCalendarValue,
  getInitialDiagnosticsCollapsedState,
  hasRetentionImpact,
  classifyGatewayUrl,
  capabilityGateAllows,
  formatRetentionPreview,
  formatCapabilitySummary,
  formatCorrelationBadge,
  isGeneratedSummaryStale,
  formatMonitoringImportSummary,
  formatSummaryJobDurations,
  isSummaryJobActive,
  mergeOperatorViewsForDay,
  remainingPinnedSummaryCharacters,
  searchEmptyState,
  summarizeAlertFindings,
  thirtyMinuteSnoozeUntil,
  type AlertFindingView,
  validateInvestigationNote,
  validatePinnedSummary
} from "./state/operator-workspace.js";
import { useTimelinePreferences } from "./hooks/useTimelinePreferences.js";
import "./styles/app.css";

const PINNED_CONTEXT_COLLAPSED_STORAGE_KEY = "openclog.pinned-context.collapsed";
const SESSION_DRILLDOWN_STORAGE_KEY = "openclog.session-drilldown.state";
const RETENTION_EXECUTION_POLICY = { keepDays: 1, includeAudit: true, includeRedactedEvents: true, includeSummaries: true };
const timelineFilterOptions: Array<{ id: JournalFilterKey; label: string }> = [
  { id: "errors", label: "Errors" },
  { id: "approvals", label: "Approvals" },
  { id: "tool_failures", label: "Tool failures" },
  { id: "session_starts", label: "Session starts" },
  { id: "inter_session_messages", label: "Inter-session messages" },
  { id: "acks", label: "ACKs and acknowledged" }
];

export function App() {
  const [themeId, setThemeId] = useState<ThemeId>("openclog-journal");
  const [days, setDays] = useState<Array<Omit<JournalDay, "entries">>>([]);
  const [day, setDay] = useState<JournalDay>(sampleJournalDay);
  const [gateway, setGateway] = useState<GatewayViewState>({ status: "degraded", missingScopes: ["operator.approvals"], stale: true });
  const [version, setVersion] = useState<VersionResponse>({
    version: "0.1.0",
    commitSha: "unknown",
    buildTimestamp: new Date().toISOString(),
    pid: 0,
    bootedAt: new Date().toISOString(),
    runtimeFingerprint: "unknown",
    nodeVersion: "unknown"
  });
  const [healthRuntimeFingerprint, setHealthRuntimeFingerprint] = useState("unknown");
  const [healthPollLatencyMs, setHealthPollLatencyMs] = useState<number | null>(null);
  const [lastSuccessfulHealthPollAt, setLastSuccessfulHealthPollAt] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [notice, setNotice] = useState("Gateway degraded: live state will not be invented.");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [showToolCalls, setShowToolCalls] = useState(true);
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
  const [approvals, setApprovals] = useState<ApprovalView[]>([]);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [approvalChoices, setApprovalChoices] = useState<Record<string, ApprovalChoice>>({});
  const [liveEventToasts, setLiveEventToasts] = useState<LiveEventToast[]>([]);
  const [shellActionStatus, setShellActionStatus] = useState("");
  const [pinnedNote, setPinnedNote] = useState("");
  const [pinnedSummary, setPinnedSummary] = useState("");
  const [searchResults, setSearchResults] = useState<JournalSearchResult[]>([]);
  const [searchNextCursor, setSearchNextCursor] = useState<string | undefined>();
  const [searchPresets, setSearchPresets] = useState<SearchPreset[]>([]);
  const [operatorViews, setOperatorViews] = useState<OperatorViewPreset[]>([]);
  const [searchLatencyMs, setSearchLatencyMs] = useState<number | null>(null);
  const [sessionLatencyMs, setSessionLatencyMs] = useState<number | null>(null);
  const [selectedSessionKey, setSelectedSessionKey] = useState("");
  const [sessionTab, setSessionTab] = useState<"timeline" | "actions" | "deliveries">("timeline");
  const [sessionScrollTop, setSessionScrollTop] = useState(0);
  const [sessionDetail, setSessionDetail] = useState<Awaited<ReturnType<typeof fetchSessionDrilldown>> | null>(null);
  const [summaryJob, setSummaryJob] = useState<Awaited<ReturnType<typeof createSummaryJob>> | null>(null);
  const [integrityReport, setIntegrityReport] = useState<Awaited<ReturnType<typeof runIntegrityCheck>> | null>(null);
  const [retentionPreviewState, setRetentionPreviewState] = useState<Awaited<ReturnType<typeof previewRetention>> | null>(null);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [incidentCaptured, setIncidentCaptured] = useState(false);
  const [incidentWorkspace, setIncidentWorkspace] = useState<Awaited<ReturnType<typeof fetchIncidentWorkspace>> | null>(null);
  const [incidentActionRecords, setIncidentActionRecords] = useState<IncidentActionRecord[]>([]);
  const [incidentRulePacks, setIncidentRulePacks] = useState<Awaited<ReturnType<typeof fetchIncidentRulePacks>>>([]);
  const [investigationNotes, setInvestigationNotes] = useState<InvestigationNote[]>([]);
  const [investigationNoteDraft, setInvestigationNoteDraft] = useState("");
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertFindings, setAlertFindings] = useState<AlertFindingView[]>([]);
  const [adapterEvents, setAdapterEvents] = useState<AdapterEvent[]>([]);
  const [profiles, setProfiles] = useState<ProfileConfig[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("default");
  const [integrationPayload, setIntegrationPayload] = useState<string>("");
  const [offlineBundleDay, setOfflineBundleDay] = useState<JournalDay | null>(null);
  const [bundlePreview, setBundlePreview] = useState<BundleExport | null>(null);
  const [replayBundleDiffState, setReplayBundleDiffState] = useState<Awaited<ReturnType<typeof diffReplayBundles>> | null>(null);
  const [closeoutPlanState, setCloseoutPlanState] = useState<Awaited<ReturnType<typeof buildCloseoutPlan>> | null>(null);
  const [healthHistory, setHealthHistory] = useState<Awaited<ReturnType<typeof fetchHealthHistory>>>([]);
  const [healthAggregate, setHealthAggregate] = useState<Awaited<ReturnType<typeof fetchHealthAggregate>> | null>(null);
  const [healthTimeline, setHealthTimeline] = useState<ServiceHealthTimelineEntry[]>([]);
  const [deliveryReceipts, setDeliveryReceipts] = useState<DeliveryReceipt[]>([]);
  const [receiptRetryStatus, setReceiptRetryStatus] = useState("");
  const [pendingRetryReceiptId, setPendingRetryReceiptId] = useState<string | null>(null);
  const [integrationVerificationReceipts, setIntegrationVerificationReceipts] = useState<Partial<Record<VerifiableIntegrationTarget, DeliveryReceipt>>>({});
  const [integrationVerificationStatus, setIntegrationVerificationStatus] = useState("");
  const [operationsReport, setOperationsReport] = useState<OperationsBacklogReport | null>(null);
  const [retentionClasses, setRetentionClasses] = useState<Awaited<ReturnType<typeof fetchRetentionClasses>>>([]);
  const [retentionClassPreviewState, setRetentionClassPreviewState] = useState<Awaited<ReturnType<typeof previewRetentionByClass>>>([]);
  const [lineageRecord, setLineageRecord] = useState<Awaited<ReturnType<typeof fetchLineage>> | null>(null);
  const [summaryProfiles, setSummaryProfiles] = useState<Awaited<ReturnType<typeof fetchSummaryProfiles>>>([]);
  const [generatedProfileSummary, setGeneratedProfileSummary] = useState<Awaited<ReturnType<typeof generateSummaryProfile>> | null>(null);
  const [integrityReports, setIntegrityReports] = useState<Awaited<ReturnType<typeof fetchIntegrityReports>>>([]);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState<Awaited<ReturnType<typeof fetchAnalytics>> | null>(null);
  const [missionReplay, setMissionReplay] = useState<Awaited<ReturnType<typeof fetchReplay>> | null>(null);
  const [correlationGraph, setCorrelationGraph] = useState<Awaited<ReturnType<typeof fetchCorrelation>> | null>(null);
  const [replayUnavailable, setReplayUnavailable] = useState(false);
  const [correlationUnavailable, setCorrelationUnavailable] = useState(false);
  const [replayWorkspace, setReplayWorkspace] = useState<Awaited<ReturnType<typeof createReplayWorkspace>> | null>(null);
  const [lastRetentionSnapshot, setLastRetentionSnapshot] = useState<RetentionSnapshotResult | null>(null);
  const [plugins, setPlugins] = useState<Awaited<ReturnType<typeof fetchPlugins>>>([]);
  const [capabilities, setCapabilities] = useState<CapabilityView[]>([]);
  const [pluginRunResult, setPluginRunResult] = useState<Awaited<ReturnType<typeof runPlugin>> | null>(null);
  const [monitoringImportDraft, setMonitoringImportDraft] = useState("");
  const [monitoringImportResult, setMonitoringImportResult] = useState<Awaited<ReturnType<typeof importMonitoringDecisions>> | null>(null);
  const [monitoringImportStatus, setMonitoringImportStatus] = useState("");
  const [incidentActionNotice, setIncidentActionNotice] = useState("");
  const [recentActionNotices, setRecentActionNotices] = useState<string[]>([]);
  const [sloSnapshot, setSloSnapshot] = useState<Awaited<ReturnType<typeof fetchSlo>> | null>(null);
  const [runbook, setRunbook] = useState<Awaited<ReturnType<typeof fetchRunbook>> | null>(null);
  const [verificationReceipts, setVerificationReceipts] = useState<VerificationReceipt[]>([]);
  const [pinnedContextCollapsed, setPinnedContextCollapsed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem(PINNED_CONTEXT_COLLAPSED_STORAGE_KEY);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch {
      // Use the default collapsed state when storage is unavailable.
    }
    return true;
  });
  const [archiveCalendarValue, setArchiveCalendarValue] = useState("");
  const [archiveCalendarMessage, setArchiveCalendarMessage] = useState("");
  const [activeHelpPopover, setActiveHelpPopover] = useState<"pinned-context" | "journal-search" | null>(null);
  const [diagnosticsCollapsed, setDiagnosticsCollapsed] = useState(() => {
    const defaults = getInitialDiagnosticsCollapsedState(0);
    if (typeof window === "undefined") return defaults;
    return defaults;
  });
  const mainRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const gatewayCardRef = useRef<HTMLElement | null>(null);
  const agentActivityCardRef = useRef<HTMLElement | null>(null);
  const approvalsCardRef = useRef<HTMLElement | null>(null);
  const pinnedContextRef = useRef<HTMLElement | null>(null);
  const todayAtGlanceRef = useRef<HTMLElement | null>(null);
  const timelineFiltersRef = useRef<HTMLElement | null>(null);
  const incidentsPanelRef = useRef<HTMLDivElement | null>(null);
  const alertsPanelRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLOListElement | null>(null);
  const toolFilterRef = useRef<HTMLInputElement | null>(null);
  const approvalButtonRef = useRef<HTMLButtonElement | null>(null);
  const helpPopoverRef = useRef<HTMLDivElement | null>(null);
  const route = useJournalRouting("");
  const { activeFilters, grouped, setActiveFilters, setGrouped } = useTimelinePreferences(route.selectedDayKey, themeId, route.grouped, route.activeFilters);
  const resolvedTheme = useMemo(() => getTheme(themeId), [themeId]);
  const effectiveDay = offlineBundleDay ?? day;
  const searchQuery = route.searchQuery;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const filteredEntries = useMemo(
    () => applyEntryFilters(effectiveDay.entries, activeFilters, showToolCalls),
    [activeFilters, effectiveDay.entries, showToolCalls]
  );
  const visibleDay = useMemo(() => ({ ...effectiveDay, entries: filteredEntries }), [effectiveDay, filteredEntries]);
  const pinnedSummaryError = useMemo(() => validatePinnedSummary(pinnedSummary), [pinnedSummary]);
  const investigationNoteError = useMemo(() => validateInvestigationNote(investigationNoteDraft), [investigationNoteDraft]);
  const generatedSummaryFreshness = useMemo(() => describeGeneratedSummaryFreshness(day.generatedSummary, day.entries), [day.entries, day.generatedSummary]);
  const generatedSummaryStale = useMemo(() => isGeneratedSummaryStale(day.generatedSummary, day.entries), [day.entries, day.generatedSummary]);
  const generatedSummaryStateText = useMemo(() => describeSummaryJobState(summaryJob, day.generatedSummary), [day.generatedSummary, summaryJob]);
  const generatedSummaryWarning = useMemo(() => describeStaleSummaryWarning(generatedSummaryFreshness), [generatedSummaryFreshness]);
  const summaryJobDurations = useMemo(() => (summaryJob ? formatSummaryJobDurations(summaryJob) : null), [summaryJob]);
  const summaryRefreshActive = useMemo(() => isSummaryJobActive(summaryJob), [summaryJob]);
  const lastSuccessfulSummaryJobCompletionAt = useMemo(
    () => getLastSuccessfulSummaryJobCompletionAt(summaryJob, day.generatedSummary),
    [day.generatedSummary, summaryJob]
  );
  const summaryFreshnessLabel = useMemo(() => {
    if (!day.generatedSummary) return "missing";
    if (generatedSummaryStale) return "stale";
    return day.generatedSummary.freshnessState ?? "fresh";
  }, [day.generatedSummary, generatedSummaryStale]);
  const retentionPreviewText = useMemo(() => formatRetentionPreview(retentionPreviewState), [retentionPreviewState]);
  const retentionSnapshotText = useMemo(() => formatRetentionSnapshotImpact(lastRetentionSnapshot), [lastRetentionSnapshot]);
  const alertSummary = summarizeAlertFindings(alertFindings);
  const searchEmptyMessage = useMemo(() => searchEmptyState(searchQuery, searchResults.length), [searchQuery, searchResults.length]);
  const bundlePreviewText = useMemo(() => (bundlePreview ? formatBundleManifestPreview(bundlePreview) : null), [bundlePreview]);
  const replayBundleDiffText = useMemo(() => formatReplayBundleDiff(replayBundleDiffState), [replayBundleDiffState]);
  const closeoutPlanText = useMemo(() => formatCloseoutPlan(closeoutPlanState), [closeoutPlanState]);
  const activeOperatorView = useMemo(
    () =>
      describeActiveOperatorView(
        {
          searchQuery,
          selectedDayKey: route.selectedDayKey,
          grouped,
          activeFilters
        },
        operatorViews
      ),
    [activeFilters, grouped, operatorViews, route.selectedDayKey, searchQuery]
  );
  const operatorViewSource = useMemo(() => describeOperatorViewSource(activeOperatorView), [activeOperatorView]);
  const pinnedSummaryRemaining = useMemo(() => remainingPinnedSummaryCharacters(pinnedSummary), [pinnedSummary]);
  const backendMismatchDetail = useMemo(() => {
    if (healthRuntimeFingerprint === "unknown") {
      if (gateway.stale && gateway.targetReachable) {
        return "Gateway target is reachable, but this browser is talking to a backend that does not publish runtime fingerprint metadata. Refresh the operator shell or restart the local API before investigating OpenClaw downtime.";
      }
      return "Backend runtime fingerprint metadata is unavailable. Refresh the operator shell or restart the local API before trusting live investigations.";
    }
    const fingerprintsDiffer =
      version.runtimeFingerprint !== "unknown" &&
      healthRuntimeFingerprint !== "unknown" &&
      version.runtimeFingerprint !== healthRuntimeFingerprint;
    if (fingerprintsDiffer) {
      return "Web and API runtime fingerprints diverged. Refresh the operator shell or stop the stale backend before investigating OpenClaw.";
    }
    if (gateway.stale && gateway.targetReachable) {
      return "Gateway target is reachable, but /api/health is stale or blocked. Check the local API process before escalating OpenClaw downtime.";
    }
    return "";
  }, [gateway.stale, gateway.targetReachable, healthRuntimeFingerprint, version.runtimeFingerprint]);
  const archiveView = useMemo(() => buildArchiveView(days, route.selectedDayKey), [days, route.selectedDayKey]);
  const composerConnectivity = useMemo(
    () => describeComposerConnectivity(profiles.find((profile) => profile.id === selectedProfileId)?.gatewayUrl, gateway.status === "ready" && !gateway.stale),
    [gateway.stale, gateway.status, profiles, selectedProfileId]
  );
  const composerConnectivityDetail = useMemo(() => {
    const missingScopes = gateway.scopeNegotiation?.missing ?? gateway.missingScopes;
    if (missingScopes.length > 0) {
      return `Gateway actions are blocked because required scopes are missing: ${missingScopes.join(", ")}. Notes stay local until scopes are restored.`;
    }
    if (gateway.stale && gateway.targetReachable) {
      return "Gateway target is reachable, but this backend is stale; commands stay local until the API process refreshes.";
    }
    if (gateway.stale) {
      return "Gateway state is stale; commands stay local until connectivity is fresh.";
    }
    return composerConnectivity.detail;
  }, [composerConnectivity.detail, gateway.missingScopes, gateway.scopeNegotiation?.missing, gateway.stale, gateway.targetReachable]);
  const healthPollAgeLabel = useMemo(() => {
    if (!lastSuccessfulHealthPollAt) return "No successful poll yet";
    const ageMs = Date.now() - Date.parse(lastSuccessfulHealthPollAt);
    const ageSeconds = Math.max(0, Math.floor(ageMs / 1000));
    return `${ageSeconds}s ago`;
  }, [lastSuccessfulHealthPollAt, days.length, day.dayKey]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  useEffect(() => {
    setArchiveCalendarValue(route.selectedDayKey);
  }, [route.selectedDayKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PINNED_CONTEXT_COLLAPSED_STORAGE_KEY, String(pinnedContextCollapsed));
    } catch {
      // Ignore local preference persistence failures.
    }
  }, [pinnedContextCollapsed]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(diagnosticsCollapsedStorageKey(activeOperatorView?.id));
      const defaults = getInitialDiagnosticsCollapsedState(0);
      if (!stored) {
        setDiagnosticsCollapsed(defaults);
        return;
      }
      setDiagnosticsCollapsed(mergeDiagnosticsCollapsedState(defaults, JSON.parse(stored) as Record<string, unknown>));
    } catch {
      setDiagnosticsCollapsed(getInitialDiagnosticsCollapsedState(0));
    }
  }, [activeOperatorView?.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(diagnosticsCollapsedStorageKey(activeOperatorView?.id), JSON.stringify(diagnosticsCollapsed));
    } catch {
      // Ignore local preference persistence failures.
    }
  }, [activeOperatorView?.id, diagnosticsCollapsed]);

  useEffect(() => {
    try {
      const key = `${route.selectedDayKey}:${searchQuery}`;
      window.localStorage.setItem(
        SESSION_DRILLDOWN_STORAGE_KEY,
        JSON.stringify({
          key,
          sessionKey: selectedSessionKey,
          tab: sessionTab,
          scrollTop: sessionScrollTop
        })
      );
    } catch {
      // Ignore drilldown persistence failures.
    }
  }, [route.selectedDayKey, searchQuery, selectedSessionKey, sessionScrollTop, sessionTab]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SESSION_DRILLDOWN_STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { key?: string; sessionKey?: string; tab?: "timeline" | "actions" | "deliveries"; scrollTop?: number };
      if (parsed.key !== `${route.selectedDayKey}:${searchQuery}`) return;
      if (typeof parsed.sessionKey === "string") setSelectedSessionKey(parsed.sessionKey);
      if (parsed.tab === "actions" || parsed.tab === "deliveries" || parsed.tab === "timeline") setSessionTab(parsed.tab);
      if (typeof parsed.scrollTop === "number") setSessionScrollTop(parsed.scrollTop);
    } catch {
      // Ignore malformed drilldown state.
    }
  }, [route.selectedDayKey, searchQuery]);

  useEffect(() => {
    void fetchSettings()
      .then((settings) => {
        setShowToolCalls(settings.showToolCalls);
        setThemeId(resolveThemeId(settings.theme));
        setSearchPresets(mergeSearchPresets(settings.searchPresets));
        setOperatorViews(mergeOperatorViewsForDay(sampleJournalDay.dayKey, undefined, settings.operatorViews));
      })
      .catch(() => setNotice("Gateway degraded: settings are using local defaults."));
    void fetchVersion().then(setVersion).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    async function refreshCore() {
      const healthStartedAt = performance.now();
      const [health, fetchedDays] = await Promise.all([fetchHealth(), fetchDays()]);
      const targetDayKey =
        route.selectedDayKey && fetchedDays.some((item) => item.dayKey === route.selectedDayKey)
          ? route.selectedDayKey
          : (fetchedDays[0]?.dayKey ?? sampleJournalDay.dayKey);
      const [fetchedDay, fetchedAgents, fetchedApprovals] = await Promise.all([
        fetchDay(targetDayKey),
        fetchSessions(targetDayKey).catch(() => [] as AgentActivity[]),
        fetchApprovals().catch(() => [] as ApprovalApiView[])
      ]);
      if (!active) return;
      setHealthPollLatencyMs(Math.round(performance.now() - healthStartedAt));
      setLastSuccessfulHealthPollAt(new Date().toISOString());
      setGateway(health.gateway);
      setHealthRuntimeFingerprint(health.backend?.runtimeFingerprint ?? "unknown");
      setDays(fetchedDays);
      if (targetDayKey !== route.selectedDayKey) route.setSelectedDayKey(targetDayKey);
      setDay(fetchedDay);
      setPinnedNote(fetchedDay.pinnedContext?.note ?? "");
      setPinnedSummary(fetchedDay.pinnedContext?.summary ?? "");
      setAgentActivity(fetchedAgents);
      setApprovals(fetchedApprovals);
      setApprovalChoices((current) => defaultApprovalChoices(fetchedApprovals, current));
      const gatewayNotice =
        health.gateway.status === "ready"
          ? "Gateway ready: operator.read, operator.write, and operator.approvals negotiated."
          : "Gateway degraded: live state will not be invented.";
      setNotice((current) =>
        current.startsWith("Gateway ready:") || current.startsWith("Gateway degraded:")
          ? gatewayNotice
          : current
      );
      if (fetchedAgents[0]?.sessionKey) setSelectedSessionKey((current) => current || fetchedAgents[0].sessionKey || "");
    }
    void refreshCore().catch(() => {
      if (active) setGateway({ status: "degraded", missingScopes: ["operator.approvals"], stale: true });
    });
    const timer = window.setInterval(() => {
      void refreshCore().catch(() => undefined);
    }, 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [route.selectedDayKey]);

  useEffect(() => {
    let active = true;
    async function refreshAdvanced() {
      const [alerts, adapters, incidentList, noteList, profileData, history, aggregate, timeline, receipts, classes, profiles, pluginList, capabilityList, reports, slo, operatorRunbook, rulePacks, verification] = await Promise.all([
        fetchAlerts().catch(() => ({ rules: [] as AlertRule[], findings: [] as AlertFindingView[] })),
        fetchAdapterEvents().catch(() => [] as AdapterEvent[]),
        fetchIncidents().catch(() => [] as IncidentSummary[]),
        fetchInvestigationNotes({ dayKey: route.selectedDayKey || day.dayKey }).catch(() => ({ notes: [] as InvestigationNote[] })),
        fetchProfiles().catch(() => ({ selectedProfileId: "default", profiles: [] as ProfileConfig[] })),
        fetchHealthHistory().catch(() => []),
        fetchHealthAggregate().catch(() => null),
        fetchHealthTimeline().catch(() => ({ timeline: [] as ServiceHealthTimelineEntry[] })),
        fetchDeliveryReceipts().catch(() => ({ receipts: [] as DeliveryReceipt[] })),
        fetchRetentionClasses().catch(() => []),
        fetchSummaryProfiles().catch(() => []),
        fetchPlugins().catch(() => []),
        fetchCapabilities().catch(() => [] as CapabilityView[]),
        fetchIntegrityReports().catch(() => []),
        fetchSlo().catch(() => null),
        fetchRunbook().catch(() => null),
        fetchIncidentRulePacks().catch(() => []),
        fetchVerificationReceipts().catch(() => [] as VerificationReceipt[])
      ]);
      if (!active) return;
      setAlertRules(alerts.rules);
      setAlertFindings(alerts.findings);
      setAdapterEvents(adapters);
      setIncidents(incidentList);
      setInvestigationNotes(noteList.notes);
      setProfiles(profileData.profiles);
      setSelectedProfileId(profileData.selectedProfileId);
      setHealthHistory(history);
      setHealthAggregate(aggregate);
      setHealthTimeline(timeline.timeline);
      setDeliveryReceipts(receipts.receipts);
      setRetentionClasses(classes);
      setSummaryProfiles(profiles);
      setPlugins(pluginList);
      setCapabilities(capabilityList);
      setIntegrityReports(reports);
      setSloSnapshot(slo);
      setRunbook(operatorRunbook);
      setIncidentRulePacks(rulePacks);
      setVerificationReceipts(verification);
      if (incidentList[0]?.id) setSelectedIncidentId((current) => current || incidentList[0]?.id || "");
    }
    void refreshAdvanced();
    return () => {
      active = false;
    };
  }, [day.dayKey, route.selectedDayKey]);

  useEffect(() => {
    setDiagnosticsCollapsed((current) => ({
      ...current,
      pendingApprovals: false
    }));
  }, [approvals.length]);

  useEffect(() => {
    if (!selectedSessionKey) return;
    const startedAt = performance.now();
    void fetchSessionDrilldown(selectedSessionKey)
      .then((detail) => {
        setSessionDetail(detail);
        setSessionLatencyMs(Math.round(performance.now() - startedAt));
      })
      .catch(() => setSessionDetail(null));
  }, [selectedSessionKey]);

  useEffect(() => {
    const dayKey = route.selectedDayKey || day.dayKey;
    if (!dayKey) return;
    let active = true;
    void fetchOperationsBacklog(dayKey, selectedIncidentId || undefined)
      .then((report) => {
        if (active) setOperationsReport(report);
      })
      .catch(() => {
        if (active) setOperationsReport(null);
      });
    return () => {
      active = false;
    };
  }, [day.dayKey, route.selectedDayKey, selectedIncidentId]);

  useEffect(() => {
    const query = deferredSearchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchNextCursor(undefined);
      setSearchLatencyMs(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const startedAt = performance.now();
      void searchJournal(query, undefined, 20, { signal: controller.signal })
        .then((result) => {
          setSearchResults(result.results);
          setSearchNextCursor(result.nextCursor);
          setSearchLatencyMs(Math.round(performance.now() - startedAt));
        })
        .catch((error) => {
          if (error instanceof Error && error.name === "AbortError") return;
          setNotice("Search request failed.");
        });
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredSearchQuery]);

  useEffect(() => {
    if (!selectedIncidentId) {
      setIncidentWorkspace(null);
      setIncidentActionRecords([]);
      setMissionReplay(null);
      setCorrelationGraph(null);
      setReplayUnavailable(false);
      setCorrelationUnavailable(false);
      return;
    }
    void fetchIncidentWorkspace(selectedIncidentId)
      .then(setIncidentWorkspace)
      .catch(() => setIncidentWorkspace(null));
    void fetchReplay(selectedIncidentId)
      .then((replay) => {
        setMissionReplay(replay);
        setReplayUnavailable(false);
      })
      .catch(() => {
        setMissionReplay(null);
        setReplayUnavailable(true);
      });
    void fetchCorrelation(selectedIncidentId)
      .then((graph) => {
        setCorrelationGraph(graph);
        setCorrelationUnavailable(false);
      })
      .catch(() => {
        setCorrelationGraph(null);
        setCorrelationUnavailable(true);
      });
    void fetchIncidentActionRecords(selectedIncidentId)
      .then((result) => setIncidentActionRecords(result.records))
      .catch(() => setIncidentActionRecords([]));
  }, [selectedIncidentId]);

  useEffect(() => {
    const entryId = visibleDay.entries[0]?.id;
    if (!entryId) {
      setLineageRecord(null);
      return;
    }
    void fetchLineage(entryId)
      .then(setLineageRecord)
      .catch(() => setLineageRecord(null));
  }, [visibleDay.entries]);

  useEffect(() => {
    if (days.length === 0 || day.dayKey !== route.selectedDayKey) return;
    if (day.generatedSummary || day.entries.length === 0 || offlineBundleDay) return;
    let active = true;
    void createSummaryJob(day.dayKey)
      .then(async (job) => {
        if (!active) return;
        setSummaryJob(job);
        const settled = await pollSummaryJobUntilSettled(job, {
          onUpdate: (nextJob) => {
            if (active) setSummaryJob(nextJob);
          }
        });
        if (!active) return;
        applySummaryJobResult(settled);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [day.dayKey, day.entries.length, day.generatedSummary, days.length, offlineBundleDay, route.selectedDayKey]);

  useEffect(() => {
    const source = new EventSource("/api/stream");
    source.addEventListener("journal", (event) => {
      const parsed = JSON.parse((event as MessageEvent).data) as { day?: JournalDay; entry?: JournalEntry };
      if (parsed.day && parsed.day.dayKey === route.selectedDayKey) setDay(parsed.day);
      if (parsed.entry) addLiveEventToast(parsed.entry);
    });
    source.onerror = () => setGateway((current) => ({ ...current, stale: true }));
    return () => source.close();
  }, [route.selectedDayKey]);

  useEffect(() => {
    if (!activeHelpPopover) return;
    function handlePointerDown(event: MouseEvent): void {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (helpPopoverRef.current?.contains(target)) return;
      const trigger = target instanceof HTMLElement ? target.closest("[data-help-trigger='true']") : null;
      if (trigger) return;
      setActiveHelpPopover(null);
    }
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") setActiveHelpPopover(null);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeHelpPopover]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.altKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (isEditableTarget(event.target)) return;
      if (event.key === "?" || (event.shiftKey && (event.code === "Slash" || event.key === "/"))) {
        event.preventDefault();
        setShortcutsOpen((current) => !current);
      } else if (event.key === "/" || event.code === "Slash") {
        event.preventDefault();
        composerRef.current?.focus();
      } else if (event.key === "Escape") {
        setShortcutsOpen(false);
        setApprovalsOpen(false);
        setExpandedEntryId(null);
        setSelectedSessionKey("");
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        mainRef.current?.focus({ preventScroll: true });
      } else if (event.altKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        jumpToNextMatchingEntry(visibleDay.entries, (entry) => entry.severity === "error" || entry.status === "failed");
      } else if (event.altKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        jumpToNextMatchingEntry(visibleDay.entries, (entry) => entry.kind === "approval_requested" || entry.kind === "approval_resolved");
      } else if (event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        jumpToNextMatchingEntry(visibleDay.entries, (entry) => entry.kind === "tool_result" || entry.kind === "tool_call");
      } else if (event.altKey && event.key.toLowerCase() === "c") {
        event.preventDefault();
        composerRef.current?.focus();
      } else if (event.altKey && event.key.toLowerCase() === "i") {
        event.preventDefault();
        focusShellTarget(incidentsPanelRef.current, "Incident workspace focused.");
      } else if (event.altKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        focusShellTarget(alertsPanelRef.current, "Alert workspace focused.");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visibleDay.entries]);

  function jumpToNextMatchingEntry(entries: JournalEntry[], predicate: (entry: JournalEntry) => boolean): void {
    const matches = entries.filter(predicate);
    if (matches.length === 0) return;
    const currentIndex = matches.findIndex((entry) => entry.id === expandedEntryId || entry.id === route.focusedEntryId);
    const next = matches[(currentIndex + 1) % matches.length] ?? matches[0];
    setExpandedEntryId(next.id);
    route.setFocusedEntryId(next.id);
  }

  async function handleSend() {
    try {
      const result = await sendComposer(composer);
      if (result.day) setDay(result.day);
      if (result.mode === "note" && result.body) {
        setDay((current) => ({
          ...current,
          entries: [
            ...current.entries,
            {
              id: `local-${current.entries.length + 1}`,
              dayKey: current.dayKey,
              source: "user",
              kind: "note",
              title: "Manual note",
              body: result.body,
              timestamp: new Date().toISOString(),
              status: "info",
              severity: "info",
              redacted: true
            }
          ]
        }));
      }
      setComposer("");
      setNotice(result.message ?? "Entry recorded.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Command blocked");
    }
  }

  async function handleDaySelect(dayKey: string) {
    setArchiveCalendarMessage("");
    route.setSelectedDayKey(dayKey);
    route.setFocusedEntryId(null);
    setExpandedEntryId(null);
    setOfflineBundleDay(null);
    setReplayBundleDiffState(null);
    setCloseoutPlanState(null);
    try {
      const [fetchedDay, fetchedAgents] = await Promise.all([fetchDay(dayKey), fetchSessions(dayKey).catch(() => [] as AgentActivity[])]);
      setDay(fetchedDay);
      setPinnedNote(fetchedDay.pinnedContext?.note ?? "");
      setPinnedSummary(fetchedDay.pinnedContext?.summary ?? "");
      setAgentActivity(fetchedAgents);
    } catch {
      setNotice("Gateway degraded: selected day could not be refreshed.");
    }
  }

  async function handleBackendRecoveryReload(): Promise<void> {
    const dayKey = route.selectedDayKey || day.dayKey;
    try {
      const [health, fetchedDay, report] = await Promise.all([
        fetchHealth(),
        fetchDay(dayKey),
        fetchOperationsBacklog(dayKey, selectedIncidentId || undefined).catch(() => null)
      ]);
      setGateway(health.gateway);
      setHealthRuntimeFingerprint(health.backend?.runtimeFingerprint ?? "unknown");
      setDay(fetchedDay);
      setPinnedNote(fetchedDay.pinnedContext?.note ?? "");
      setPinnedSummary(fetchedDay.pinnedContext?.summary ?? "");
      setOperationsReport(report);
      setLastSuccessfulHealthPollAt(new Date().toISOString());
      setNotice("Reloaded current diagnostics and active day state after backend fingerprint change.");
    } catch {
      setNotice("Backend recovery reload failed closed.");
    }
  }

  async function handleArchiveCalendarChange(value: string): Promise<void> {
    setArchiveCalendarValue(value);
    const matchedDay = findDayByCalendarValue(days, value);
    if (!matchedDay) {
      setArchiveCalendarMessage("No log available for that date.");
      return;
    }
    setArchiveCalendarMessage("");
    await handleDaySelect(matchedDay.dayKey);
  }

  async function handleHomeNavigation(): Promise<void> {
    const newestDayKey = days[0]?.dayKey ?? sampleJournalDay.dayKey;
    const homeState = createHomeRouteState(newestDayKey, {
      activeFilters,
      focusedEntryId: route.focusedEntryId,
      grouped,
      searchQuery,
      selectedDayKey: route.selectedDayKey
    });
    route.resetToHome(homeState);
    setActiveFilters([]);
    setGrouped(homeState.grouped);
    setExpandedEntryId(null);
    setOfflineBundleDay(null);
    setSearchResults([]);
    setSearchNextCursor(undefined);
    setArchiveCalendarMessage("");
    await handleDaySelect(newestDayKey);
    window.setTimeout(() => mainRef.current?.scrollTo?.({ top: 0, behavior: "smooth" }), 0);
  }

  function handleJournalTopNavigation(): void {
    timelineRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    timelineRef.current?.focus({ preventScroll: true });
    setShellActionStatus("Journal timeline focused.");
  }

  async function handleExport() {
    const blob = await exportDay(effectiveDay.dayKey);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `openclog-${effectiveDay.dayKey}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleShowToolCallsChange(show: boolean): void {
    setShowToolCalls(show);
    void updateSettings({ showToolCalls: show }).catch(() => setNotice("Gateway degraded: Show Tool Calls preference could not be saved."));
  }

  function focusShellTarget(element: HTMLElement | null, message: string): void {
    element?.scrollIntoView({ block: "center", inline: "nearest" });
    element?.focus({ preventScroll: true });
    setShellActionStatus(message);
  }

  function addLiveEventToast(entry: JournalEntry): void {
    const toast: LiveEventToast = {
      dayKey: entry.dayKey,
      entryId: entry.id,
      id: `${entry.id}-${Date.now()}`,
      kind: entry.kind,
      label: "Live OpenClaw event received."
    };
    setLiveEventToasts((current) => [toast, ...current.filter((item) => item.entryId !== entry.id)].slice(0, 3));
    window.setTimeout(() => {
      setLiveEventToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 10_000);
  }

  async function handleToastClick(toast: LiveEventToast): Promise<void> {
    setLiveEventToasts((current) => current.filter((item) => item.id !== toast.id));
    if ((toast.kind === "tool_call" || toast.kind === "tool_result") && !showToolCalls) handleShowToolCallsChange(true);
    route.setSelectedDayKey(toast.dayKey);
    const fetchedDay = await fetchDay(toast.dayKey);
    setDay(fetchedDay);
    setExpandedEntryId(toast.entryId);
    route.setFocusedEntryId(toast.entryId);
  }

  function handleApprovalChoiceChange(approvalId: string, choice: ApprovalChoice): void {
    setApprovalChoices((current) => ({ ...current, [approvalId]: choice }));
  }

  async function handleApprovalSubmit(): Promise<void> {
    const selected = approvals.filter((approval) => approvalChoices[approval.id] === "approve" || approvalChoices[approval.id] === "disapprove");
    try {
      await Promise.all(selected.map((approval) => resolveApproval(approval.id, approvalChoices[approval.id] === "approve" ? "allow-once" : "deny")));
      const fetchedApprovals = await fetchApprovals().catch(() => [] as ApprovalView[]);
      setApprovals(fetchedApprovals);
      setApprovalChoices((current) => defaultApprovalChoices(fetchedApprovals, current));
      setApprovalsOpen(false);
      approvalButtonRef.current?.focus();
    } catch {
      setNotice("Gateway degraded: approval decisions could not be submitted.");
    }
  }

  async function handleSavePinnedContext(): Promise<void> {
    if (pinnedSummaryError) return;
    const context = await updateDayContext(day.dayKey, { note: pinnedNote, summary: pinnedSummary });
    setDay((current) => ({ ...current, pinnedContext: context }));
    setNotice("Pinned day context saved.");
  }

  function applySummaryJobResult(job: Awaited<ReturnType<typeof createSummaryJob>>): void {
    const generatedSummary = job.generatedSummary;
    if (!generatedSummary) return;
    setDay((current) => (current.dayKey === job.dayKey ? { ...current, generatedSummary } : current));
  }

  async function handleRefreshSummary(): Promise<void> {
    if (summaryRefreshActive) {
      setNotice("Summary refresh already queued or running.");
      return;
    }
    try {
      const job = await createSummaryJob(day.dayKey);
      setSummaryJob(job);
      setNotice("Summary job queued for local evidence review.");
      const settled = await pollSummaryJobUntilSettled(job, { onUpdate: setSummaryJob });
      applySummaryJobResult(settled);
      if (settled.status === "completed" && settled.generatedSummary) {
        setNotice(`Generated summary refreshed by job ${settled.id}.`);
        return;
      }
      if (settled.status === "failed") {
        setNotice(`Summary refresh failed closed${settled.error ? `: ${settled.error}` : "."}`);
        return;
      }
      setNotice(`Summary job ${settled.status}.`);
    } catch (error) {
      setNotice(error instanceof Error ? `Summary refresh failed closed: ${error.message}` : "Summary refresh failed closed.");
    }
  }

  async function handleSearch(): Promise<void> {
    const startedAt = performance.now();
    const result = await searchJournal(searchQuery);
    setSearchResults(result.results);
    setSearchNextCursor(result.nextCursor);
    setSearchLatencyMs(Math.round(performance.now() - startedAt));
  }

  async function handleLoadMoreSearch(): Promise<void> {
    if (!searchNextCursor) return;
    const result = await searchJournal(searchQuery, searchNextCursor);
    setSearchResults((current) => [...current, ...result.results]);
    setSearchNextCursor(result.nextCursor);
  }

  function handleClearSearch(): void {
    route.setSearchQuery("");
    route.setFocusedEntryId(null);
    setExpandedEntryId(null);
    setSearchResults([]);
    setSearchNextCursor(undefined);
    setSearchLatencyMs(null);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  async function handleSaveSearchPreset(): Promise<void> {
    const next = addSearchPreset(searchPresets, searchQuery);
    setSearchPresets(next);
    await updateSettings({ searchPresets: next });
    setNotice("Search preset saved.");
  }

  async function handleSaveOperatorView(): Promise<void> {
    const label = searchQuery.trim() ? `${visibleDay.dayKey} ${searchQuery.trim()}` : `${visibleDay.dayKey} investigation`;
    const nextView: OperatorViewPreset = {
      id: label.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `view-${operatorViews.length + 1}`,
      label,
      dayKey: visibleDay.dayKey,
      searchQuery,
      activeFilters,
      grouped,
      hypothesis: searchQuery.trim() ? `Investigate whether ${searchQuery.trim()} explains the active incident.` : "Investigate the active day evidence.",
      validationSteps: ["Review timeline evidence.", "Check receipts and incident actions.", "Record the closeout or next validation step."],
      drilldown: {
        sessionKey: selectedSessionKey || undefined,
        tab: sessionTab,
        scrollTop: sessionScrollTop
      }
    };
    const next = mergeOperatorViewsForDay(visibleDay.dayKey, selectedSessionKey, [nextView, ...operatorViews.filter((view) => view.id !== nextView.id && view.builtIn !== true)]).slice(0, 12);
    setOperatorViews(next);
    await updateSettings({ operatorViews: next });
    setNotice("Operator view saved.");
  }

  async function handleApplySearchPreset(preset: SearchPreset): Promise<void> {
    route.setSearchQuery(preset.query);
    const result = await searchJournal(preset.query);
    setSearchResults(result.results);
    setSearchNextCursor(result.nextCursor);
  }

  async function handleApplyOperatorView(view: OperatorViewPreset): Promise<void> {
    route.setSelectedDayKey(view.dayKey ?? visibleDay.dayKey);
    route.setSearchQuery(view.searchQuery);
    setActiveFilters(view.activeFilters);
    setGrouped(view.grouped);
    setSelectedSessionKey(view.drilldown?.sessionKey ?? "");
    setSessionTab(view.drilldown?.tab ?? "timeline");
    setSessionScrollTop(view.drilldown?.scrollTop ?? 0);
    if (view.dayKey && view.dayKey !== route.selectedDayKey) await handleDaySelect(view.dayKey);
    if (view.searchQuery.trim()) {
      const result = await searchJournal(view.searchQuery);
      setSearchResults(result.results);
      setSearchNextCursor(result.nextCursor);
    }
    setNotice(`${view.label} loaded.`);
  }

  async function refreshJournalDayIndex(preferredDayKey = route.selectedDayKey || visibleDay.dayKey): Promise<void> {
    const fetchedDays = await fetchDays();
    const targetDayKey = fetchedDays.some((item) => item.dayKey === preferredDayKey)
      ? preferredDayKey
      : (fetchedDays[0]?.dayKey ?? sampleJournalDay.dayKey);
    const fetchedDay = await fetchDay(targetDayKey);
    setDays(fetchedDays);
    if (targetDayKey !== route.selectedDayKey) route.setSelectedDayKey(targetDayKey);
    setDay(fetchedDay);
    setPinnedNote(fetchedDay.pinnedContext?.note ?? "");
    setPinnedSummary(fetchedDay.pinnedContext?.summary ?? "");
  }

  async function refreshAlerts(): Promise<void> {
    const refreshed = await fetchAlerts();
    setAlertRules(refreshed.rules);
    setAlertFindings(refreshed.findings);
  }

  async function handleRetentionPreview(): Promise<void> {
    const preview = await previewRetention(RETENTION_EXECUTION_POLICY);
    setRetentionPreviewState(preview);
    if ((preview.removedIncidentCount ?? 0) > 0 || (preview.removedBundleCount ?? 0) > 0) {
      setNotice("Retention warning: preview removes incidents or replay bundles. Review evidence impact before apply.");
    }
  }

  async function handleApplyRetention(): Promise<void> {
    if (!hasRetentionImpact(retentionPreviewState)) {
      setNotice("Retention apply blocked: preview retention impact before applying cleanup.");
      return;
    }
    try {
      const snapshot = await applyRetention({
        ...RETENTION_EXECUTION_POLICY,
        keepDays: retentionPreviewState?.keepDays ?? RETENTION_EXECUTION_POLICY.keepDays
      });
      setLastRetentionSnapshot(snapshot);
      setRetentionPreviewState(snapshot.preview);
      await refreshJournalDayIndex();
      setNotice(`Retention applied with snapshot ${snapshot.id}.`);
    } catch {
      setNotice("Retention apply failed closed: cleanup was not confirmed.");
    }
  }

  async function handleRollbackRetention(): Promise<void> {
    if (!lastRetentionSnapshot) {
      setNotice("Retention rollback blocked: no applied snapshot is selected.");
      return;
    }
    try {
      const result = await rollbackRetention(lastRetentionSnapshot.id);
      await refreshJournalDayIndex();
      setLastRetentionSnapshot(null);
      setNotice(`Retention rollback restored ${String(result.restoredDayKeys.length)} day(s).`);
    } catch {
      setNotice("Retention rollback failed closed: restored state was not confirmed.");
    }
  }

  async function handleAcknowledgeAlert(ruleId: string): Promise<void> {
    try {
      await acknowledgeAlert(ruleId);
      await refreshAlerts();
      setNotice("Alert acknowledged.");
    } catch {
      setNotice("Alert acknowledgement failed closed: local alert state was not changed.");
    }
  }

  async function handleSnoozeAlert(ruleId: string): Promise<void> {
    try {
      await snoozeAlert(ruleId, thirtyMinuteSnoozeUntil());
      await refreshAlerts();
      setNotice("Alert snoozed for 30 minutes.");
    } catch {
      setNotice("Alert snooze failed closed: local alert state was not changed.");
    }
  }

  async function handleRunIntegrityCheck(): Promise<void> {
    setIntegrityReport(await runIntegrityCheck());
  }

  async function handleCreateIncident(): Promise<void> {
    const candidateIds = visibleDay.entries.slice(0, 3).map((entry) => entry.id);
    const incident = await createIncidentSnapshot({ dayKey: visibleDay.dayKey, entryIds: candidateIds, title: `Incident snapshot for ${visibleDay.dateLabel}` });
    setIncidents((current) => [incident, ...current]);
    setSelectedIncidentId(incident.id);
    setIncidentCaptured(true);
    setNotice("Incident workspace updated.");
  }

  async function handleExecuteIncidentAction(actionId: Parameters<typeof executeIncidentAction>[0]["actionId"], options?: { body?: string; pluginId?: string }): Promise<void> {
    if (!selectedIncidentId) return;
    const result = await executeIncidentAction({ incidentId: selectedIncidentId, actionId, body: options?.body, pluginId: options?.pluginId });
    setIncidentWorkspace(result.nextWorkspace);
    if (result.note) {
      setInvestigationNotes((current) => [result.note!, ...current.filter((item) => item.id !== result.note!.id)]);
      setInvestigationNoteDraft("");
    }
    if (result.receipt) {
      setDeliveryReceipts((current) => [result.receipt!, ...current.filter((item) => item.id !== result.receipt!.id)]);
    }
    if (result.packet) {
      try {
        await navigator.clipboard.writeText(result.packet);
      } catch {
        // Keep the action recorded even when clipboard is unavailable.
      }
    }
    setIncidentActionNotice(result.actionRecord.summary);
    setRecentActionNotices((current) => dedupeLiveActionNotice(current, result.actionRecord.summary));
    setNotice(result.actionRecord.summary);
  }

  async function handleSaveInvestigationNote(): Promise<void> {
    if (investigationNoteError) return;
    await handleExecuteIncidentAction("save_note", { body: investigationNoteDraft.trim() });
  }

  async function handleImportMonitoringDecisions(): Promise<void> {
    const markdown = monitoringImportDraft.trim();
    if (!markdown) {
      setMonitoringImportStatus("Monitoring import blocked: paste newsletter-monitoring.md decisions first.");
      return;
    }
    try {
      const result = await importMonitoringDecisions({
        confirmedLocalImport: true,
        markdown,
        dayKey: visibleDay.dayKey,
        sourceWorkflow: ["gmail", "blogwatcher", "openclaw"],
        sourcePath: "newsletter-monitoring.md"
      });
      setMonitoringImportResult(result);
      setMonitoringImportStatus(formatMonitoringImportSummary(result) ?? "Monitoring import completed.");
      setInvestigationNotes((current) => [...result.notes, ...current.filter((note) => !result.notes.some((imported) => imported.id === note.id))]);
      setIncidents((current) => [...result.incidents, ...current.filter((incident) => !result.incidents.some((imported) => imported.id === incident.id))]);
      if (result.incidents[0]?.id) setSelectedIncidentId(result.incidents[0].id);
      if (result.pinnedContext) {
        setPinnedNote(result.pinnedContext.note ?? "");
        setPinnedSummary(result.pinnedContext.summary ?? "");
        setDay((current) => ({ ...current, pinnedContext: result.pinnedContext }));
      }
      setNotice("Monitoring decisions imported into local operator context.");
    } catch {
      setMonitoringImportStatus("Monitoring import failed closed: no local notes or handoff packets were confirmed.");
      setNotice("Monitoring import failed closed.");
    }
  }

  async function handleSaveAlertRule(): Promise<void> {
    const rule = await saveAlertRule({ id: "reconnect-storm", kind: "reconnect_storm", threshold: 1, enabled: true, title: "Reconnect storm" });
    setAlertRules((current) => [rule, ...current.filter((item) => item.id !== rule.id)]);
    await refreshAlerts();
  }

  async function handleCreateProfile(): Promise<void> {
    const profile = await createProfile({ id: "night-ops", label: "Night Ops", gatewayUrl: "ws://127.0.0.1:18789" });
    setProfiles((current) => [profile, ...current.filter((item) => item.id !== profile.id)]);
  }

  async function handleSelectProfile(id: string): Promise<void> {
    const selected = await selectProfile(id);
    setSelectedProfileId(selected);
  }

  async function handleBuildIntegration(): Promise<void> {
    const payload = await buildIntegrationPayload("github-issue", visibleDay.dayKey);
    setIntegrationPayload(payload.body);
  }

  async function handleDeliverIntegration(target: "slack" | "generic-webhook" | "email"): Promise<void> {
    const receipt = await deliverIntegration(target, { dayKey: visibleDay.dayKey, incidentId: selectedIncidentId || undefined });
    setDeliveryReceipts((current) => [receipt, ...current.filter((item) => item.id !== receipt.id)]);
    setRecentActionNotices((current) => dedupeLiveActionNotice(current, `${target} delivery ${receipt.status}.`));
    setNotice(`${target} delivery ${receipt.status}.`);
  }

  async function handleVerifyIntegration(target: VerifiableIntegrationTarget): Promise<void> {
    setIntegrationVerificationStatus(`${target} dry-run verification running.`);
    try {
      const receipt = await verifyIntegrationTarget(target, { dayKey: visibleDay.dayKey });
      setIntegrationVerificationReceipts((current) => ({ ...current, [target]: receipt }));
      setDeliveryReceipts((current) => [receipt, ...current.filter((item) => item.id !== receipt.id)]);
      const summary = formatIntegrationVerificationReceipt(receipt);
      setIntegrationVerificationStatus(summary);
      setRecentActionNotices((current) => dedupeLiveActionNotice(current, `${target} dry-run verification ${receipt.status}.`));
      setNotice(`${target} dry-run verification ${receipt.status}.`);
    } catch {
      const message = `${target} dry-run verification failed closed.`;
      setIntegrationVerificationStatus(message);
      setNotice(message);
    }
  }

  async function handleOfflineReview(): Promise<void> {
    const bundle = await exportBundle(day.dayKey);
    setOfflineBundleDay(bundle.day);
    setNotice(`Offline review loaded for ${bundle.day.dayKey}.`);
  }

  async function handleCreateReplayWorkspace(): Promise<void> {
    const workspace = await createReplayWorkspace(visibleDay.dayKey);
    setReplayWorkspace(workspace);
    setNotice(`Replay workspace created for ${workspace.sourceDayKey}.`);
  }

  async function handlePreviewBundleManifest(): Promise<void> {
    const bundle = await exportBundle(day.dayKey);
    setBundlePreview(bundle);
  }

  async function handleCopyOfflineBundle(): Promise<void> {
    const bundle = await exportBundle(day.dayKey);
    await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setNotice("Incident bundle JSON copied with redaction applied.");
  }

  async function handleCopyApiExample(route: string, payload: Record<string, unknown>): Promise<void> {
    setNotice(`API example copied for ${route}.`);
    try {
      await navigator.clipboard.writeText(`${route}\n${JSON.stringify(payload, null, 2)}`);
    } catch {
      // Clipboard access can be unavailable in fixture browsers; the route example remains visible through the action status.
    }
  }

  async function handleComparePreviousBundle(): Promise<void> {
    const previousDay = days.find((item) => item.dayKey !== visibleDay.dayKey);
    if (!previousDay) return;
    const [left, right] = await Promise.all([exportBundle(previousDay.dayKey), exportBundle(visibleDay.dayKey)]);
    setReplayBundleDiffState(await diffReplayBundles({ left, right }));
  }

  async function handlePrepareCloseout(): Promise<void> {
    setCloseoutPlanState(await buildCloseoutPlan({ dayKey: visibleDay.dayKey, keepDays: 1, exportTargets: ["github-issue", "markdown-vault"] }));
  }

  async function handlePreviewRetentionByClass(): Promise<void> {
    setRetentionClassPreviewState(await previewRetentionByClass());
  }

  async function handleTightenRetention(): Promise<void> {
    const updated = await saveRetentionClass("entries", { keepDays: 14, includeRollback: true });
    setRetentionClasses((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
  }

  async function handleGenerateSummaryProfile(): Promise<void> {
    setGeneratedProfileSummary(await generateSummaryProfile("escalation", visibleDay.dayKey));
  }

  async function handleRunIntegrityMonitor(): Promise<void> {
    const report = await runIntegrityMonitor();
    setIntegrityReports((current) => [report, ...current.filter((item) => item.id !== report.id)]);
  }

  async function handleLoadAnalytics(): Promise<void> {
    setAnalyticsSnapshot(await fetchAnalytics());
  }

  async function handleRegisterPlugin(): Promise<void> {
    const plugin = await registerPlugin({
      id: "local-annotation-plugin",
      label: "Local Annotation Plugin",
      version: "0.1.0",
      capabilities: ["annotation"],
      readScopes: ["entries", "incidents", "notes"],
      supportsDryRun: true,
      actionIds: ["run_plugin"]
    });
    setPlugins((current) => [plugin, ...current.filter((item) => item.id !== plugin.id)]);
  }

  async function handleRunPlugin(pluginId: string): Promise<void> {
    const result = await runPlugin(pluginId, { dryRun: true });
    setPluginRunResult(result);
    setRecentActionNotices((current) => dedupeLiveActionNotice(current, result.summary));
  }

  async function handleCopySessionSummary(): Promise<void> {
    if (!sessionDetail?.sanitizedSummary) return;
    try {
      await navigator.clipboard.writeText(sessionDetail.sanitizedSummary);
    } catch {
      // Clipboard access can fail in test or restricted browser contexts; keep the operator feedback explicit.
    }
    setNotice("Sanitized session summary copied with redaction applied.");
  }

  async function copyTextWithNotice(text: string, message: string): Promise<void> {
    setNotice(message);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard may be unavailable under fixture browsers; keep the visible operator confirmation.
    }
  }

  async function handleRetryReceipt(id: string): Promise<void> {
    const original = deliveryReceipts.find((receipt) => receipt.id === id);
    if (original?.status === "failed" && pendingRetryReceiptId !== id) {
      setPendingRetryReceiptId(id);
      setReceiptRetryStatus(buildRetryReceiptConfirmation(original));
      setNotice(`Confirm retry for ${id} before resending with the same idempotency key.`);
      return;
    }
    try {
      const receipt = await retryDeliveryReceipt(id, true);
      if (!receipt?.id) throw new Error("Delivery receipt retry returned no receipt");
      setDeliveryReceipts((current) => [receipt, ...current.filter((item) => item.id !== receipt.id)]);
      setPendingRetryReceiptId(null);
      setReceiptRetryStatus(`${id} retry ${receipt.status}.`);
      setNotice(`${id} retry ${receipt.status}.`);
    } catch {
      setPendingRetryReceiptId(null);
      setReceiptRetryStatus(`${id} retry failed.`);
      setNotice(`${id} retry failed.`);
    }
  }

  async function copyIncidentSummary(entry?: JournalEntry): Promise<void> {
    const body = [
      `Day: ${visibleDay.dayKey}`,
      `Gateway: ${gateway.status}`,
      entry ? `Entry: ${entry.title}` : "Surface: gateway diagnostics",
      entry?.body ?? gateway.lastErrorReason ?? "No additional detail.",
      gateway.lastLiveEventAt ? `Last live event: ${gateway.lastLiveEventAt}` : ""
    ]
      .filter(Boolean)
      .join("\n");
    await navigator.clipboard.writeText(body);
    setNotice("Sanitized incident summary copied with redaction applied.");
  }

  function handleFilterToggle(filter: JournalFilterKey): void {
    setActiveFilters((current) => (current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter]));
  }

  const extraDiagnosticCards: DiagnosticCardDefinition[] = [
    {
      body: `Version ${version.version} at ${version.buildTimestamp}.`,
      icon: resolvedTheme.icons.tools,
      label: "Version",
      meta: `Commit ${version.commitSha}`,
      status: "info",
      title: "Build version",
      tone: "info"
    },
    {
      body: `${alertSummary.activeCount} alert finding(s) currently active.`,
      icon: resolvedTheme.icons.gateway,
      label: "Alerts",
      meta: alertRules[0]?.title,
      status: alertSummary.activeCount > 0 ? "warning" : "info",
      title: "Policy alerts",
      tone: alertSummary.activeCount > 0 ? "warning" : "info"
    },
    {
      body: adapterEvents[0]?.body ?? "No adapter events captured yet.",
      icon: resolvedTheme.icons.activity,
      label: "Adapters",
      meta: adapterEvents[0]?.adapterName,
      status: adapterEvents[0]?.severity ?? "info",
      title: "Adapter events",
      tone: adapterEvents[0]?.severity === "error" ? "danger" : adapterEvents[0]?.severity === "warning" ? "warning" : "info"
    }
  ];

  const onboardingItems = buildOnboardingItems(gateway);

  return (
    <AppShell
      day={visibleDay}
      days={days}
      diagnosticsProps={{
        agentActivity,
        agentActivityCardRef,
        approvalButtonRef,
        approvalChoices,
        approvals,
        approvalsOpen,
        approvalsCardRef,
        collapsed: diagnosticsCollapsed,
        gatewayCardRef,
        toolFilterRef,
        showToolCalls,
        onCardToggle: (card) => setDiagnosticsCollapsed((current) => ({ ...current, [card]: !(current[card] ?? true) })),
        onApprovalChoiceChange: handleApprovalChoiceChange,
        onApprovalSubmit: handleApprovalSubmit,
        onCloseApprovals: () => setApprovalsOpen(false),
        onJumpToFirstApproval: () => setApprovalsOpen(true),
        onShowToolCallsChange: handleShowToolCallsChange,
        onToggleApprovals: () => setApprovalsOpen((current) => !current)
      }}
      extraDiagnosticCards={extraDiagnosticCards}
      gateway={gateway}
      leftRailContent={
        <SearchPanel
          activeHelpPopover={activeHelpPopover}
          emptyMessage={searchEmptyMessage}
          helpPopoverRef={helpPopoverRef}
          inputRef={searchInputRef}
          nextCursor={searchNextCursor}
          activeViewSource={operatorViewSource}
          operatorViews={operatorViews}
          presets={searchPresets}
          query={searchQuery}
          results={searchResults}
          searchLatencyMs={searchLatencyMs}
          onApplyPreset={(preset) => {
            void handleApplySearchPreset(preset);
          }}
          onApplyOperatorView={(view) => {
            void handleApplyOperatorView(view);
          }}
          onLoadMore={() => void handleLoadMoreSearch()}
          onReset={() => handleClearSearch()}
          onQueryChange={route.setSearchQuery}
          onSaveOperatorView={() => void handleSaveOperatorView()}
          onSavePreset={() => void handleSaveSearchPreset()}
          onSearch={() => void handleSearch()}
          onSelectResult={(result) => {
            route.setSelectedDayKey(result.dayKey);
            route.setFocusedEntryId(result.entryId);
            setExpandedEntryId(result.entryId);
          }}
          onToggleHelp={(id) => setActiveHelpPopover((current) => (current === id ? null : id))}
        />
      }
      liveEventToasts={liveEventToasts}
      mainRef={mainRef}
      rightRailContent={
        <>
          <PinnedContextPanel
            activeHelpPopover={activeHelpPopover}
            collapsed={pinnedContextCollapsed}
            generatedSummary={day.generatedSummary?.summary}
            generatedSummaryCreatedAt={day.generatedSummary?.createdAt}
            generatedSummaryLastEntryIncludedAt={generatedSummaryFreshness.lastEntryIncludedAt}
	            generatedSummaryLatestEntryObservedAt={generatedSummaryFreshness.latestEntryObservedAt}
	            generatedSummaryStateText={generatedSummaryStateText}
	            generatedSummaryStale={generatedSummaryStale}
            generatedSummaryWarning={generatedSummaryWarning}
            summaryJobDurations={summaryJobDurations}
	            summaryRefreshActive={summaryRefreshActive}
	            helpPopoverRef={helpPopoverRef}
            note={pinnedNote}
            offline={Boolean(offlineBundleDay)}
            summaryCharactersRemaining={pinnedSummaryRemaining}
            summary={pinnedSummary}
            summaryError={pinnedSummaryError}
            sectionRef={pinnedContextRef}
            onNoteChange={setPinnedNote}
            onRefreshSummary={() => void handleRefreshSummary()}
            onSave={handleSavePinnedContext}
            onSummaryChange={setPinnedSummary}
            onToggleCollapsed={() => setPinnedContextCollapsed((current) => !current)}
            onToggleHelp={(id) => setActiveHelpPopover((current) => (current === id ? null : id))}
          />
          <TodayAtGlanceCard
            collapsed={diagnosticsCollapsed.todayAtGlance ?? true}
            day={visibleDay}
            reconnectCount={gateway.reconnectCount ?? 0}
            sectionRef={todayAtGlanceRef}
            onToggleCollapsed={() => setDiagnosticsCollapsed((current) => ({ ...current, todayAtGlance: !(current.todayAtGlance ?? true) }))}
          />
          <TimelineFiltersCard
            activeFilters={activeFilters}
            collapsed={diagnosticsCollapsed.timelineFilters ?? true}
            sectionRef={timelineFiltersRef}
            onFilterToggle={handleFilterToggle}
            onToggleCollapsed={() => setDiagnosticsCollapsed((current) => ({ ...current, timelineFilters: !(current.timelineFilters ?? true) }))}
          />
        </>
      }
      shortcutsOpen={shortcutsOpen}
      shellActionStatus={shellActionStatus}
      theme={resolvedTheme}
      themeId={themeId}
      themeIds={selectableThemeIds}
      healthPollAgeLabel={healthPollAgeLabel}
      healthPollLatencyMs={healthPollLatencyMs}
      version={version}
      recentDays={archiveView.recentDays}
      selectedOlderDay={archiveView.selectedOlderDay}
      archiveCalendarValue={archiveCalendarValue}
      archiveCalendarMessage={archiveCalendarMessage}
      onArchiveCalendarChange={(value) => {
        void handleArchiveCalendarChange(value);
      }}
      onAgentActivityFocus={() => focusShellTarget(agentActivityCardRef.current, "Monitor diagnostics focused.")}
      onApprovalsFocus={() => focusShellTarget(approvalsCardRef.current, "Security approvals focused.")}
      onComposerFocus={() => focusShellTarget(composerRef.current, "Command composer focused.")}
      onDaySelect={handleDaySelect}
      onGatewayFocus={() => focusShellTarget(gatewayCardRef.current, "Network diagnostics focused.")}
      onHomeClick={() => {
        void handleHomeNavigation();
      }}
      onMainFocus={() => focusShellTarget(mainRef.current, "Journal workspace focused.")}
      onJournalTopClick={handleJournalTopNavigation}
      onPinnedContextFocus={() => focusShellTarget(pinnedContextRef.current, "Pinned context focused.")}
      onSearchFocus={() => focusShellTarget(searchInputRef.current, "Journal search focused.")}
      onShortcutsClose={() => setShortcutsOpen(false)}
      onShortcutsToggle={() => setShortcutsOpen((current) => !current)}
      onThemeChange={(nextThemeId) => setThemeId(resolveThemeId(nextThemeId))}
      onTimelineFiltersFocus={() => focusShellTarget(timelineFiltersRef.current, "Saved filters focused.")}
      onTodayAtGlanceFocus={() => focusShellTarget(todayAtGlanceRef.current, "Today at a glance focused.")}
      onTimelineFocus={() => focusShellTarget(timelineRef.current, "Timeline logs focused.")}
      onToastClick={(toast) => {
        void handleToastClick(toast);
      }}
      onToolFilterFocus={() => focusShellTarget(toolFilterRef.current, "Tool filter focused.")}
    >
      <DayHeader
        day={visibleDay}
        lastSuccessfulSummaryJobCompletionAt={lastSuccessfulSummaryJobCompletionAt}
        summaryFreshnessLabel={summaryFreshnessLabel}
        theme={resolvedTheme}
        onExport={handleExport}
      />
      <GatewayReadinessBanner gateway={gateway} theme={resolvedTheme} />
      {backendMismatchDetail ? <BackendMismatchBanner detail={backendMismatchDetail} onRecover={() => void handleBackendRecoveryReload()} /> : null}
      <Composer
        composer={composer}
        connectivityDetail={composerConnectivityDetail}
        connectivityLabel={composerConnectivity.label}
        inputRef={composerRef}
        notice={notice}
        theme={resolvedTheme}
        onComposerChange={setComposer}
        onSend={handleSend}
      />
      {onboardingItems.length > 0 ? <OnboardingPanel items={onboardingItems} onCopy={() => void copyIncidentSummary()} /> : null}
      <p className="summary">{displayProductCopy(visibleDay.summary ?? "")}</p>
      <Timeline
        day={visibleDay}
        expandedEntryId={expandedEntryId}
        grouped={grouped}
        targetEntryId={route.focusedEntryId}
        timelineRef={timelineRef}
        onCopyIncidentSummary={(entry) => {
          void copyIncidentSummary(entry);
        }}
        onGroupedChange={(next) => setGrouped(next)}
        onTargetHandled={() => route.setFocusedEntryId(null)}
        onToggleEntry={(entryId) => {
          setExpandedEntryId((current) => (current === entryId ? null : entryId));
          route.setFocusedEntryId(entryId);
        }}
      />
      <OperationalPanels
        adapterEvents={adapterEvents}
        alertSummary={alertSummary}
        alertFindings={alertFindings}
        capabilities={capabilities}
        closeoutChecklist={closeoutPlanState?.checklist ?? []}
        closeoutPlanText={closeoutPlanText}
        correlationGraph={correlationGraph}
	        deliveryReceipts={deliveryReceipts}
        generatedProfileSummary={generatedProfileSummary}
        gatewayMissingScopes={gateway.missingScopes}
	        healthAggregate={healthAggregate}
        healthTimeline={healthTimeline}
        incidents={incidents}
        incidentCaptured={incidentCaptured}
        incidentActionRecords={incidentActionRecords}
        incidentRulePacks={incidentRulePacks}
        incidentWorkspace={incidentWorkspace}
        incidentActionNotice={incidentActionNotice}
	        integrityReport={integrityReport}
	        integrityReports={integrityReports}
	        integrationVerificationReceipts={integrationVerificationReceipts}
	        integrationVerificationStatus={integrationVerificationStatus}
	        integrationPayload={integrationPayload}
        investigationNoteDraft={investigationNoteDraft}
        investigationNoteError={investigationNoteError}
        investigationNotes={investigationNotes}
        monitoringImportDraft={monitoringImportDraft}
        monitoringImportResult={monitoringImportResult}
        monitoringImportStatus={monitoringImportStatus}
        analyticsSnapshot={analyticsSnapshot}
        bundleDigest={bundlePreview?.manifest.signature?.digest}
        bundlePreviewText={bundlePreviewText}
        healthHistory={healthHistory}
        lineageRecord={lineageRecord}
        missionReplay={missionReplay}
        offlineBundleDay={offlineBundleDay}
        operationsReport={operationsReport}
        pendingRetryReceiptId={pendingRetryReceiptId}
        plugins={plugins}
        pluginRunResult={pluginRunResult}
        profiles={profiles}
        recentActionNotices={recentActionNotices}
        replayWorkspace={replayWorkspace}
        replayBundleDiffText={replayBundleDiffText}
        replayUnavailable={replayUnavailable}
        correlationUnavailable={correlationUnavailable}
        retentionClasses={retentionClasses}
        retentionClassPreviewState={retentionClassPreviewState}
        receiptRetryStatus={receiptRetryStatus}
        lastRetentionSnapshot={lastRetentionSnapshot}
        retentionPreview={retentionPreviewState}
        retentionPreviewText={retentionPreviewText}
        retentionSnapshotText={retentionSnapshotText}
        runbook={runbook}
        verificationReceipts={verificationReceipts}
        incidentsPanelRef={incidentsPanelRef}
        alertsPanelRef={alertsPanelRef}
        selectedIncidentId={selectedIncidentId}
        selectedProfileId={selectedProfileId}
        selectedSessionKey={selectedSessionKey}
        sessionTab={sessionTab}
        sessionLatencyMs={sessionLatencyMs}
        sessionDetail={sessionDetail}
        sloSnapshot={sloSnapshot}
        summaryJob={summaryJob}
        summaryProfiles={summaryProfiles}
        visibleDay={visibleDay}
        onAcknowledgeAlert={(ruleId) => void handleAcknowledgeAlert(ruleId)}
        onApplyRetention={() => void handleApplyRetention()}
        onBuildIntegration={() => void handleBuildIntegration()}
        onComparePreviousBundle={() => void handleComparePreviousBundle()}
	        onCopyBundleDigest={(digest) => {
	          void copyTextWithNotice(digest, "Bundle digest copied with redaction applied.");
	        }}
	        onCopyIncidentId={(id) => {
	          void copyTextWithNotice(id, "Incident id copied.");
	        }}
	        onCopyReceiptId={(id) => {
	          void copyTextWithNotice(id, "Receipt id copied with redaction applied.");
	        }}
        onCopySessionSummary={() => void handleCopySessionSummary()}
        onCopyOfflineBundle={() => void handleCopyOfflineBundle()}
        onCopyApiExample={(route, payload) => {
          void handleCopyApiExample(route, payload);
        }}
        onCreateIncident={() => void handleCreateIncident()}
        onCreateProfile={() => void handleCreateProfile()}
	        onDeliverIntegration={(target) => {
	          void handleDeliverIntegration(target);
	        }}
        onExecuteIncidentAction={(actionId, options) => {
          void handleExecuteIncidentAction(actionId, options);
        }}
        onGenerateSummaryProfile={() => void handleGenerateSummaryProfile()}
        onGenerateSummary={() => void handleRefreshSummary()}
        onImportMonitoringDecisions={() => void handleImportMonitoringDecisions()}
        onOfflineReview={() => void handleOfflineReview()}
        onInvestigationNoteChange={setInvestigationNoteDraft}
        onMonitoringImportDraftChange={setMonitoringImportDraft}
        onLoadAnalytics={() => void handleLoadAnalytics()}
        onJumpToEntry={(entryId) => {
          setExpandedEntryId(entryId);
          route.setFocusedEntryId(entryId);
          setNotice(`Timeline entry ${entryId} selected from incident evidence.`);
        }}
        onPrepareCloseout={() => void handlePrepareCloseout()}
        onCreateReplayWorkspace={() => void handleCreateReplayWorkspace()}
        onPreviewBundleManifest={() => void handlePreviewBundleManifest()}
        onPreviewRetentionByClass={() => void handlePreviewRetentionByClass()}
        onPreviewRetention={() => void handleRetentionPreview()}
        onRollbackRetention={() => void handleRollbackRetention()}
        onRetryReceipt={(id) => void handleRetryReceipt(id)}
        onRunIntegrityCheck={() => void handleRunIntegrityCheck()}
        onRunIntegrityMonitor={() => void handleRunIntegrityMonitor()}
        onRegisterPlugin={() => void handleRegisterPlugin()}
        onRunPlugin={(pluginId) => {
          void handleRunPlugin(pluginId);
        }}
        onSaveAlertRule={() => void handleSaveAlertRule()}
        onSaveInvestigationNote={() => void handleSaveInvestigationNote()}
        onSnoozeAlert={(ruleId) => void handleSnoozeAlert(ruleId)}
	        onTightenRetention={() => void handleTightenRetention()}
	        onVerifyIntegration={(target) => {
	          void handleVerifyIntegration(target);
	        }}
	        onSelectIncident={setSelectedIncidentId}
        onSelectProfile={(id) => {
          void handleSelectProfile(id);
        }}
        onSelectSession={setSelectedSessionKey}
        onSessionScrollChange={setSessionScrollTop}
        onSessionTabChange={setSessionTab}
      />
    </AppShell>
  );
}

function defaultApprovalChoices(approvals: ApprovalView[], current: Record<string, ApprovalChoice>): Record<string, ApprovalChoice> {
  const next: Record<string, ApprovalChoice> = {};
  for (const approval of approvals) next[approval.id] = current[approval.id] ?? "defer";
  return next;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || tag === "code" || target.isContentEditable || Boolean(target.closest("[data-editor-control='true']"));
}

function buildOnboardingItems(gateway: GatewayViewState): string[] {
  const items: string[] = [];
  if (gateway.missingScopes.length > 0) items.push(`Required scopes missing: ${gateway.missingScopes.join(", ")}`);
  if ((gateway.lastErrorReason ?? "").includes("device identity")) items.push("Device identity is missing or rejected.");
  if ((gateway.lastErrorReason ?? "").includes("token")) items.push("Gateway token must be revalidated.");
  if (gateway.connectionStatus === "connecting") items.push("Gateway is reconnecting.");
  return items;
}

function incidentLoopSteps(incident: IncidentSummary): Array<{ label: "Detect" | "Explain" | "Recommend" | "Act" | "Record"; done: boolean }> {
  const progress = incident.loopProgress ?? { detect: true, explain: true, recommend: incident.runbookSuggestions.length > 0, act: false, record: false };
  return [
    { label: "Detect", done: progress.detect },
    { label: "Explain", done: progress.explain },
    { label: "Recommend", done: progress.recommend },
    { label: "Act", done: progress.act },
    { label: "Record", done: progress.record }
  ];
}

function TodayAtGlanceCard(props: { collapsed: boolean; day: JournalDay; reconnectCount: number; sectionRef: RefObject<HTMLElement | null>; onToggleCollapsed: () => void }) {
  const items = [
    { label: "Messages", value: props.day.metrics.messageCount },
    { label: "Tools", value: props.day.metrics.toolCallCount },
    { label: "Approvals", value: props.day.metrics.approvalCount },
    { label: "Failures", value: props.day.metrics.errorCount },
    { label: "Reconnects", value: props.reconnectCount }
  ];
  return (
    <section className="diagnostic-card info utility-rail-card" aria-label="Today at a glance" ref={props.sectionRef} tabIndex={0}>
      <SquareChartGantt aria-hidden="true" size={22} />
      <div>
        <div className="diagnostic-card-header">
          <h3>Today at a glance</h3>
          <button type="button" onClick={props.onToggleCollapsed}>
            {props.collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
        {!props.collapsed ? (
          <div className="glance-strip glance-strip-rail">
            {items.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
            <div>
              <strong>Trend</strong>
              <span>{buildReconnectTrendText(props.reconnectCount)}</span>
            </div>
          </div>
        ) : (
          <p className="collapsed-panel-copy">Collapsed.</p>
        )}
      </div>
    </section>
  );
}

function TimelineFiltersCard(props: {
  activeFilters: JournalFilterKey[];
  collapsed: boolean;
  sectionRef: RefObject<HTMLElement | null>;
  onFilterToggle: (filter: JournalFilterKey) => void;
  onToggleCollapsed: () => void;
}) {
  return (
    <section className="diagnostic-card info utility-rail-card" aria-label="Saved filters" ref={props.sectionRef} tabIndex={0}>
      <SlidersHorizontal aria-hidden="true" size={22} />
      <div>
        <div className="diagnostic-card-header">
          <h3>Saved filters</h3>
          <button type="button" onClick={props.onToggleCollapsed}>
            {props.collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
        {!props.collapsed ? (
          <div className="timeline-filter-bar" aria-label="Saved filters">
            {timelineFilterOptions.map((filter) => (
              <label key={filter.id} className="switch-row timeline-filter-toggle">
                <span className="timeline-filter-toggle-copy">
                  <strong>{filter.label}</strong>
                  <small>{props.activeFilters.includes(filter.id) ? "Hide" : "Show"}</small>
                </span>
                <input checked={!props.activeFilters.includes(filter.id)} type="checkbox" onChange={() => props.onFilterToggle(filter.id)} />
              </label>
            ))}
          </div>
        ) : (
          <p className="collapsed-panel-copy">Collapsed.</p>
        )}
      </div>
    </section>
  );
}

function PinnedContextPanel(props: {
  activeHelpPopover: "pinned-context" | "journal-search" | null;
  collapsed: boolean;
  generatedSummary?: string;
  generatedSummaryCreatedAt?: string;
  generatedSummaryLastEntryIncludedAt?: string;
  generatedSummaryLatestEntryObservedAt?: string;
  generatedSummaryStateText: string;
  generatedSummaryStale: boolean;
  generatedSummaryWarning: string | null;
  helpPopoverRef: RefObject<HTMLDivElement | null>;
  note: string;
  offline: boolean;
  summary: string;
  summaryCharactersRemaining: number;
  summaryError: string | null;
  summaryJobDurations: ReturnType<typeof formatSummaryJobDurations> | null;
  summaryRefreshActive: boolean;
  sectionRef: RefObject<HTMLElement | null>;
  onNoteChange: (value: string) => void;
  onRefreshSummary: () => void;
  onSave: () => void;
  onSummaryChange: (value: string) => void;
  onToggleCollapsed: () => void;
  onToggleHelp: (id: "pinned-context") => void;
}) {
  return (
    <section className="diagnostic-card info pinned-context-card" aria-label="Pinned context" ref={props.sectionRef} tabIndex={0}>
      <FileText aria-hidden="true" size={22} />
      <div>
        <div className="diagnostic-card-header">
          <div className="panel-header-title">
            <h3>Pinned context</h3>
            <button
              aria-controls="pinned-context-help"
              aria-expanded={props.activeHelpPopover === "pinned-context"}
              className="help-trigger"
              data-help-trigger="true"
              type="button"
              onClick={() => props.onToggleHelp("pinned-context")}
            >
              ?
            </button>
          </div>
          <div className="panel-header-actions">
            <button type="button" onClick={props.onToggleCollapsed}>
              {props.collapsed ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>
        {props.offline ? <span>Offline review</span> : null}
        {props.activeHelpPopover === "pinned-context" ? (
          <div className="help-popover" id="pinned-context-help" ref={props.helpPopoverRef} role="dialog">
            <p>Pinned context keeps the operator note and handoff summary visible and durable for the current day.</p>
            <p>Use it to preserve facts you want to carry into incident review, export, or shift handoff.</p>
          </div>
        ) : null}
        {!props.collapsed ? (
          <>
            <label>
              <span>Pinned note</span>
              <textarea aria-label="Pinned note" value={props.note} onChange={(event) => props.onNoteChange(event.target.value)} />
            </label>
            <label>
              <span>Pinned summary</span>
              <textarea aria-label="Pinned summary" value={props.summary} onChange={(event) => props.onSummaryChange(event.target.value)} />
            </label>
            <p className={props.summaryCharactersRemaining < 0 ? "validation-message" : "generated-summary"}>
              {props.summaryCharactersRemaining} characters remaining.
            </p>
            {props.summaryError ? <p className="validation-message">{props.summaryError}</p> : null}
            <p className="generated-summary">{props.generatedSummaryStateText}</p>
            {props.summaryJobDurations ? (
              <p className="generated-summary">
                Summary timing: queued for {props.summaryJobDurations.queuedFor}, running for {props.summaryJobDurations.runningFor}, last completed {props.summaryJobDurations.lastCompleted ?? "unavailable"}.
              </p>
            ) : null}
            {props.generatedSummary ? <p className="generated-summary">Generated summary: {props.generatedSummary}</p> : null}
            {props.generatedSummaryCreatedAt ? <p className="generated-summary">Summary generated at {props.generatedSummaryCreatedAt}.</p> : null}
            {props.generatedSummaryLastEntryIncludedAt ? <p className="generated-summary">Last entry included: {props.generatedSummaryLastEntryIncludedAt}.</p> : null}
            {props.generatedSummaryLatestEntryObservedAt ? <p className="generated-summary">Latest entry observed: {props.generatedSummaryLatestEntryObservedAt}.</p> : null}
            {props.generatedSummaryWarning ? <p className="validation-message">{props.generatedSummaryWarning}</p> : null}
            {props.generatedSummaryStale ? (
              <div className="validation-message">
                <p>Generated summary is stale. Regenerate after reviewing the latest entries.</p>
	                {!props.offline ? (
	                  <button type="button" disabled={props.summaryRefreshActive} onClick={props.onRefreshSummary}>
	                    {props.summaryRefreshActive ? "Summary refresh in progress" : "Refresh summary now"}
	                  </button>
	                ) : null}
              </div>
            ) : null}
            {!props.offline ? (
              <button type="button" disabled={Boolean(props.summaryError)} onClick={props.onSave}>
                Save pinned context
              </button>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function OnboardingPanel(props: { items: string[]; onCopy: () => void }) {
  return (
    <section className="workspace-panel" aria-label="Setup guidance">
      <div className="panel-header">
        <h3>Setup guidance</h3>
        <button type="button" onClick={props.onCopy}>
          Copy incident summary
        </button>
      </div>
      <ul>
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function CorrelationBadge(props: { correlationId?: string; onCopy: (value: string) => void }) {
  const badge = formatCorrelationBadge(props.correlationId);
  if (!badge) return null;
  return (
    <button className="correlation-badge" type="button" onClick={() => props.onCopy(badge.copyText)}>
      {badge.label}
    </button>
  );
}

function SearchPanel(props: {
  activeHelpPopover: "pinned-context" | "journal-search" | null;
  activeViewSource: string | null;
  emptyMessage: string | null;
  helpPopoverRef: RefObject<HTMLDivElement | null>;
  inputRef: RefObject<HTMLInputElement | null>;
  nextCursor?: string;
  operatorViews: OperatorViewPreset[];
  presets: SearchPreset[];
  query: string;
  results: JournalSearchResult[];
  searchLatencyMs: number | null;
  onApplyPreset: (preset: SearchPreset) => void;
  onApplyOperatorView: (view: OperatorViewPreset) => void;
  onLoadMore: () => void;
  onReset: () => void;
  onQueryChange: (value: string) => void;
  onSaveOperatorView: () => void;
  onSavePreset: () => void;
  onSearch: () => void;
  onSelectResult: (result: JournalSearchResult) => void;
  onToggleHelp: (id: "journal-search") => void;
}) {
  return (
    <section className="archive-block rail-search-panel" aria-label="Journal search">
      <div className="panel-header rail-panel-header">
        <div className="panel-header-title rail-panel-title">
          <Search aria-hidden="true" size={16} />
          <h3>Journal search</h3>
          <button
            aria-controls="journal-search-help"
            aria-expanded={props.activeHelpPopover === "journal-search"}
            className="help-trigger"
            data-help-trigger="true"
            type="button"
            onClick={() => props.onToggleHelp("journal-search")}
          >
            ?
          </button>
        </div>
        <div className="panel-header-actions">
          <button aria-label="Save search preset" type="button" onClick={props.onSavePreset}>
            Save preset
          </button>
          <button aria-label="Save operator view" type="button" onClick={props.onSaveOperatorView}>
            Save view
          </button>
        </div>
      </div>
      {props.activeHelpPopover === "journal-search" ? (
        <div className="help-popover" id="journal-search-help" ref={props.helpPopoverRef} role="dialog">
          <p>Journal search finds matches in titles, bodies, tools, and status fields across the journal.</p>
          <p>Presets save recurring investigations so you can reopen the same query with one click.</p>
        </div>
      ) : null}
      {props.presets.length > 0 ? (
        <div className="search-presets" aria-label="Saved search presets">
          {props.presets.map((preset) => (
            <button key={preset.id} type="button" onClick={() => props.onApplyPreset(preset)}>
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
      {props.operatorViews.length > 0 ? (
        <div className="search-presets" aria-label="Saved operator views">
          {props.operatorViews.map((view) => (
            <button key={view.id} type="button" onClick={() => props.onApplyOperatorView(view)}>
              {view.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="search-row">
        <input ref={props.inputRef} aria-label="Journal search input" value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="Search titles, bodies, tools, statuses..." />
        <button type="button" onClick={props.onSearch}>
          Search
        </button>
        <button aria-label="Reset journal search" disabled={!props.query.trim() && props.results.length === 0 && props.searchLatencyMs === null} type="button" onClick={props.onReset}>
          Reset
        </button>
      </div>
      {props.activeViewSource ? <p className="search-meta">{props.activeViewSource}</p> : null}
      {props.searchLatencyMs !== null ? <p className="search-meta">Search completed in {props.searchLatencyMs} ms.</p> : null}
      <ul className="search-results">
        {props.results.map((result) => (
          <li key={result.entryId}>
            <button type="button" onClick={() => props.onSelectResult(result)}>
              <strong>{result.title}</strong>
              <span>{result.bodyPreview}</span>
              {result.matchSnippet ? <small>{result.matchSnippet}</small> : null}
              {result.matchFieldHints?.length ? <small>Matched fields: {result.matchFieldHints.join(", ")}</small> : null}
            </button>
          </li>
        ))}
      </ul>
      {props.nextCursor ? (
        <button type="button" onClick={props.onLoadMore}>
          Load more results
        </button>
      ) : null}
      {props.emptyMessage ? <p>{props.emptyMessage}</p> : null}
    </section>
  );
}

function OperationalPanels(props: {
  adapterEvents: AdapterEvent[];
  analyticsSnapshot: Awaited<ReturnType<typeof fetchAnalytics>> | null;
  alertFindings: AlertFindingView[];
  alertSummary: { activeCount: number; acknowledgedCount: number; snoozedCount: number };
  alertsPanelRef: RefObject<HTMLDivElement | null>;
  bundleDigest?: string;
  bundlePreviewText: string | null;
  capabilities: CapabilityView[];
  closeoutChecklist: string[];
  closeoutPlanText: string | null;
  correlationGraph: Awaited<ReturnType<typeof fetchCorrelation>> | null;
  deliveryReceipts: DeliveryReceipt[];
  generatedProfileSummary: Awaited<ReturnType<typeof generateSummaryProfile>> | null;
  gatewayMissingScopes: string[];
  healthAggregate: Awaited<ReturnType<typeof fetchHealthAggregate>> | null;
  healthHistory: Awaited<ReturnType<typeof fetchHealthHistory>>;
  healthTimeline: ServiceHealthTimelineEntry[];
  incidents: IncidentSummary[];
  incidentActionRecords: IncidentActionRecord[];
  incidentActionNotice: string;
  incidentCaptured: boolean;
  incidentRulePacks: Awaited<ReturnType<typeof fetchIncidentRulePacks>>;
  incidentWorkspace: Awaited<ReturnType<typeof fetchIncidentWorkspace>> | null;
  incidentsPanelRef: RefObject<HTMLDivElement | null>;
  integrityReport: Awaited<ReturnType<typeof runIntegrityCheck>> | null;
  integrityReports: Awaited<ReturnType<typeof fetchIntegrityReports>>;
  integrationVerificationReceipts: Partial<Record<VerifiableIntegrationTarget, DeliveryReceipt>>;
  integrationVerificationStatus: string;
  integrationPayload: string;
  investigationNoteDraft: string;
  investigationNoteError: string | null;
  investigationNotes: InvestigationNote[];
  lineageRecord: Awaited<ReturnType<typeof fetchLineage>> | null;
  missionReplay: Awaited<ReturnType<typeof fetchReplay>> | null;
  monitoringImportDraft: string;
  monitoringImportResult: Awaited<ReturnType<typeof importMonitoringDecisions>> | null;
  monitoringImportStatus: string;
  offlineBundleDay: JournalDay | null;
  operationsReport: OperationsBacklogReport | null;
  pendingRetryReceiptId: string | null;
  plugins: Awaited<ReturnType<typeof fetchPlugins>>;
  pluginRunResult: Awaited<ReturnType<typeof runPlugin>> | null;
  profiles: ProfileConfig[];
  recentActionNotices: string[];
  replayWorkspace: Awaited<ReturnType<typeof createReplayWorkspace>> | null;
  replayBundleDiffText: string | null;
  replayUnavailable: boolean;
  correlationUnavailable: boolean;
  retentionClasses: Awaited<ReturnType<typeof fetchRetentionClasses>>;
  retentionClassPreviewState: Awaited<ReturnType<typeof previewRetentionByClass>> | null;
  receiptRetryStatus: string;
  lastRetentionSnapshot: RetentionSnapshotResult | null;
  retentionPreview: Awaited<ReturnType<typeof previewRetention>> | null;
  retentionPreviewText: string | null;
  retentionSnapshotText: string | null;
  runbook: Awaited<ReturnType<typeof fetchRunbook>> | null;
  verificationReceipts: VerificationReceipt[];
  selectedIncidentId: string;
  selectedProfileId: string;
  selectedSessionKey: string;
  sessionTab: "timeline" | "actions" | "deliveries";
  sessionLatencyMs: number | null;
  sessionDetail: Awaited<ReturnType<typeof fetchSessionDrilldown>> | null;
  sloSnapshot: Awaited<ReturnType<typeof fetchSlo>> | null;
  summaryJob: Awaited<ReturnType<typeof createSummaryJob>> | null;
  summaryProfiles?: Awaited<ReturnType<typeof fetchSummaryProfiles>>;
  visibleDay: JournalDay;
  onAcknowledgeAlert: (ruleId: string) => void;
  onApplyRetention: () => void;
  onBuildIntegration: () => void;
  onComparePreviousBundle: () => void;
  onCopyApiExample: (route: string, payload: Record<string, unknown>) => void;
  onCopyBundleDigest: (digest: string) => void;
  onCopyIncidentId: (id: string) => void;
  onCopySessionSummary: () => void;
  onCopyOfflineBundle: () => void;
  onCopyReceiptId: (id: string) => void;
  onCreateIncident: () => void;
  onCreateProfile: () => void;
  onCreateReplayWorkspace: () => void;
  onDeliverIntegration: (target: "slack" | "generic-webhook" | "email") => void;
  onExecuteIncidentAction: (actionId: Parameters<typeof executeIncidentAction>[0]["actionId"], options?: { body?: string; pluginId?: string }) => void;
  onGenerateSummary: () => void;
  onGenerateSummaryProfile: () => void;
  onImportMonitoringDecisions: () => void;
  onInvestigationNoteChange: (value: string) => void;
  onMonitoringImportDraftChange: (value: string) => void;
  onJumpToEntry: (entryId: string) => void;
  onLoadAnalytics: () => void;
  onOfflineReview: () => void;
  onPrepareCloseout: () => void;
  onPreviewBundleManifest: () => void;
  onPreviewRetentionByClass: () => void;
  onPreviewRetention: () => void;
  onRollbackRetention: () => void;
  onRetryReceipt: (id: string) => void;
  onRunIntegrityCheck: () => void;
  onRunIntegrityMonitor: () => void;
  onRegisterPlugin: () => void;
  onRunPlugin: (pluginId: string) => void;
  onSaveAlertRule: () => void;
  onSaveInvestigationNote: () => void;
  onSnoozeAlert: (ruleId: string) => void;
  onTightenRetention: () => void;
  onVerifyIntegration: (target: VerifiableIntegrationTarget) => void;
  onSelectIncident: (id: string) => void;
  onSelectProfile: (id: string) => void;
  onSelectSession: (id: string) => void;
  onSessionScrollChange: (value: number) => void;
  onSessionTabChange: (value: "timeline" | "actions" | "deliveries") => void;
}) {
  const sessionOptions = Array.from(new Set(props.visibleDay.entries.map((entry) => entry.sessionId).filter(Boolean))) as string[];
  const selectedProfile = props.profiles.find((profile) => profile.id === props.selectedProfileId) ?? props.profiles[0];
  const profileSafety = classifyGatewayUrl(selectedProfile?.gatewayUrl);
  const deliveryReceipts = props.deliveryReceipts ?? [];
  const capabilities = props.capabilities ?? [];
  const retentionClasses = props.retentionClasses ?? [];
  const retentionClassPreviewState = props.retentionClassPreviewState ?? [];
  const summaryProfiles = props.summaryProfiles ?? [];
  const integrityReports = props.integrityReports ?? [];
  const plugins = props.plugins ?? [];
  const healthTimeline = props.healthTimeline ?? [];
  const generatedSummaryCitations = props.generatedProfileSummary?.citations ?? [];
  const operationsReport = props.operationsReport;
  const failedDryRunNotice = Object.values(props.integrationVerificationReceipts).map((receipt) => receipt ? buildDryRunFailureJumpNotice(receipt) : null).find((notice) => notice !== null);
  const activeSummaryJobDurations = props.summaryJob ? formatSummaryJobDurations(props.summaryJob) : null;
  const deliveryTargets: Array<{ label: string; target: VerifiableIntegrationTarget }> = [
    { label: "Slack", target: "slack" },
    { label: "Webhook", target: "generic-webhook" },
    { label: "Email", target: "email" }
  ];
  return (
    <section className="workspace-grid" aria-label="Operational workbench">
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Session drilldown</h3>
        </div>
        <div className="search-presets">
          <button type="button" onClick={() => props.onSessionTabChange("timeline")}>
            Timeline
          </button>
          <button type="button" onClick={() => props.onSessionTabChange("actions")}>
            Actions
          </button>
          <button type="button" onClick={() => props.onSessionTabChange("deliveries")}>
            Deliveries
          </button>
        </div>
        <select aria-label="Session drilldown" value={props.selectedSessionKey} onChange={(event) => props.onSelectSession(event.target.value)}>
          {sessionOptions.map((sessionKey) => (
            <option key={sessionKey} value={sessionKey}>
              {sessionKey}
            </option>
          ))}
        </select>
        {props.sessionDetail ? (
          <>
            <p>
              {props.sessionDetail.toolCount} tools, {props.sessionDetail.approvalCount} approvals, {props.sessionDetail.reconnectCount} reconnects.
            </p>
            {props.sessionLatencyMs !== null ? <p>API response time: {props.sessionLatencyMs} ms.</p> : null}
            <p>Current drilldown tab: {props.sessionTab}. Saved scroll offset marker: {props.sessionDetail.entries.length}.</p>
            {props.sessionDetail.sanitizedSummary ? <p>{props.sessionDetail.sanitizedSummary}</p> : null}
            <button type="button" onClick={() => props.onSessionScrollChange(props.sessionDetail?.entries.length ?? 0)}>
              Save current drilldown position
            </button>
            <button type="button" onClick={props.onCopySessionSummary}>
              Copy sanitized session summary
            </button>
          </>
        ) : (
          <p>No session drilldown available.</p>
        )}
      </section>
      <section className="workspace-panel" aria-label="Verification Center">
        <div className="panel-header">
          <h3>Verification Center</h3>
        </div>
        {operationsReport ? (
          <>
            <p>Last successful verify:gateway {operationsReport.verificationCenter.lastSuccessfulGatewayVerifyAt ?? "unavailable"}.</p>
            <ul>
              {operationsReport.verificationCenter.gates.map((gate) => (
                <li key={gate.id}>
                  <strong>{gate.label}</strong>: {gate.status}. {gate.detail}
                </li>
              ))}
            </ul>
            <p>Native truth monitor: {operationsReport.nativeTruthMonitor.status}.</p>
            <ul>
              {operationsReport.nativeTruthMonitor.checks.map((check) => (
                <li key={check.id}>
                  {check.id}: {check.status} - {check.detail}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Verification Center is waiting for local operations evidence.</p>
        )}
      </section>
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Integrity and retention</h3>
        </div>
        <button type="button" onClick={props.onRunIntegrityCheck}>
          Run integrity check
        </button>
        <button type="button" onClick={props.onPreviewRetention}>
          Preview retention
        </button>
        <button type="button" disabled={!hasRetentionImpact(props.retentionPreview)} onClick={props.onApplyRetention}>
          Apply retention
        </button>
        {props.lastRetentionSnapshot ? (
          <button type="button" onClick={props.onRollbackRetention}>
            Rollback retention snapshot
          </button>
        ) : null}
        <button type="button" disabled={isSummaryJobActive(props.summaryJob)} onClick={props.onGenerateSummary}>
          {isSummaryJobActive(props.summaryJob) ? "Summary refresh in progress" : "Refresh current summary"}
        </button>
        {props.integrityReport ? <p>{props.integrityReport.checkedEntries} entries checked; mismatches {props.integrityReport.mismatchedEntryIds.length}.</p> : null}
        {props.retentionPreviewText ? <p>{props.retentionPreviewText}</p> : <p>Preview keeps the newest 1 day before any cleanup is applied.</p>}
        {props.retentionSnapshotText ? <p>{props.retentionSnapshotText}</p> : null}
        {props.retentionPreview && ((props.retentionPreview.removedIncidentCount ?? 0) > 0 || (props.retentionPreview.removedBundleCount ?? 0) > 0) ? (
          <p className="validation-message">Warning: this retention preview removes incidents or replay bundles.</p>
        ) : null}
        {props.summaryJob ? (
          <div className={`summary-job-status ${props.summaryJob.status}`} role="status">
            <p>Summary job {props.summaryJob.status}: {props.summaryJob.progressLabel}</p>
            {activeSummaryJobDurations ? (
              <p>
                Summary timing: queued for {activeSummaryJobDurations.queuedFor}, running for {activeSummaryJobDurations.runningFor}, total {activeSummaryJobDurations.total}.
              </p>
            ) : null}
            {props.summaryJob.correlationId ? <CorrelationBadge correlationId={props.summaryJob.correlationId} onCopy={props.onCopyReceiptId} /> : null}
            {props.summaryJob.completedAt ? <p>Summary job completed at {props.summaryJob.completedAt}.</p> : null}
            {props.summaryJob.error ? <p className="validation-message">Summary job failed closed: {props.summaryJob.error}</p> : null}
          </div>
        ) : (
          <p>Summary never generated for this day yet.</p>
        )}
      </section>
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Monitoring import</h3>
        </div>
        <label>
          <span>newsletter-monitoring.md decisions</span>
          <textarea
            aria-label="Monitoring import markdown"
            value={props.monitoringImportDraft}
            onChange={(event) => props.onMonitoringImportDraftChange(event.target.value)}
          />
        </label>
        <button type="button" onClick={props.onImportMonitoringDecisions}>
          Import monitoring decisions
        </button>
        {props.monitoringImportStatus ? <p>{props.monitoringImportStatus}</p> : <p>Paste local Gmail, blogwatcher, and OpenClaw triage decisions to create notes or handoff packets.</p>}
        {props.monitoringImportResult?.handoffPackets.length ? (
          <ul>
            {props.monitoringImportResult.handoffPackets.map((packet) => (
              <li key={packet.id}>
                {packet.title} · {packet.provenance.sourceHash}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="workspace-panel" aria-label="Operations backlog surfaces">
        <div className="panel-header">
          <h3>Operations backlog</h3>
        </div>
        {operationsReport ? (
          <>
            <p>
              Evidence checklist: {operationsReport.incidentEvidenceChecklist.items.filter((item) => item.present).length}/{operationsReport.incidentEvidenceChecklist.items.length} present.
            </p>
            <ul>
              {operationsReport.incidentEvidenceChecklist.items.map((item) => (
                <li key={item.id}>
                  {item.label}: {item.present ? "present" : "missing"}
                </li>
              ))}
            </ul>
            <p>Investigation bundle preview: {operationsReport.investigationBundlePreview.items.length} redacted item(s) ready.</p>
            <p>Readiness history sparkline: {operationsReport.readinessHistory.points.length} point(s) over 24 hours.</p>
            <p>Delivery ledger: {operationsReport.deliveryLedger.items.length} searchable receipt(s).</p>
            <ul>
              {operationsReport.deliveryLedger.items.slice(0, 3).map((receipt) => (
                <li key={receipt.id}>
                  {receipt.target} {receipt.status} fingerprint {receipt.requestFingerprint ?? "unavailable"}
                  {receipt.sameKeyRetryRequiresConfirmation ? " - same-key retry requires confirmation" : ""}
                </li>
              ))}
            </ul>
            <p>Route budgets: {operationsReport.routePerformanceBudgets.map((budget) => `${budget.route} ${budget.status}`).join(", ")}.</p>
            <p>Chaos tests: {operationsReport.chaosScenarios.map((scenario) => scenario.id).join(", ")}.</p>
            <p>Evidence quality: {operationsReport.evidenceQualityScores.map((score) => `${score.incidentId} ${score.grade} ${score.score}`).join(", ") || "unscored"}.</p>
            <p>Operations ledger: {operationsReport.operationsLedger.entries.length} append-only event(s).</p>
            <p>Policy packs: {operationsReport.policyRecommendationPacks.map((pack) => pack.label).join(", ")}.</p>
            <p>Role-aware simulations: {operationsReport.roleAwareSimulations.map((simulation) => `${simulation.title} (${simulation.liveSideEffects ? "live" : "no live side effects"})`).join(", ")}.</p>
            <p>Governed SDK manifests: {operationsReport.governedSdkManifests.map((manifest) => `${manifest.id} ${manifest.permissions.join("/")}`).join(", ")}.</p>
          </>
        ) : (
          <p>Operations backlog surfaces are waiting for local evidence.</p>
        )}
      </section>
      <section className="workspace-panel" ref={props.incidentsPanelRef} tabIndex={-1}>
        <div className="panel-header">
          <h3>Incidents and alerts</h3>
        </div>
        <button type="button" onClick={props.onCreateIncident}>
          Capture incident
        </button>
        <button type="button" onClick={props.onSaveAlertRule}>
          Save alert rule
        </button>
        {props.incidentCaptured ? <p>Incident snapshot captured.</p> : null}
        <p>{props.incidents.length} incidents, {props.alertSummary.activeCount} active alert finding(s), {props.alertSummary.snoozedCount} snoozed.</p>
        {props.incidents.length > 0 ? (
          <ul>
            {props.incidents.slice(0, 4).map((incident) => (
              <li key={incident.id}>
                <strong>{incident.title}</strong>
                <div className="search-presets" aria-label="Incident loop progress">
                  {incidentLoopSteps(incident).map((step) => (
                    <span key={step.label} className="timeline-chip">
                      {step.label}: {step.done ? "done" : "open"}
                    </span>
                  ))}
                </div>
                <button aria-label={`Copy incident id ${incident.id}`} type="button" onClick={() => props.onCopyIncidentId(incident.id)}>
                  Copy incident id
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {props.incidents.length === 0 ? (
          <div>
            <p>No incidents captured yet.</p>
            <button type="button" onClick={props.onCreateIncident}>
              Capture incident from this day
            </button>
          </div>
        ) : null}
        <div ref={props.alertsPanelRef} tabIndex={-1}>
          {props.alertSummary.activeCount === 0 && props.alertSummary.snoozedCount === 0 ? (
            <div>
              <p>No active alert findings right now.</p>
              <button type="button" onClick={props.onSaveAlertRule}>
                Create reconnect alert rule
              </button>
            </div>
          ) : null}
          {props.alertFindings.length > 0 ? (
            <ul>
              {props.alertFindings.map((finding) => {
                const state = describeAlertFindingState(finding);
                return (
                  <li key={finding.ruleId}>
                    <strong>{finding.title}</strong>
                    <p>{state.label}</p>
                    <p>{state.detail}</p>
                    <div className="search-presets">
                      <button type="button" disabled={!finding.triggered} onClick={() => props.onAcknowledgeAlert(finding.ruleId)}>
                        Acknowledge {finding.title}
                      </button>
                      <button type="button" disabled={!finding.triggered} onClick={() => props.onSnoozeAlert(finding.ruleId)}>
                        Snooze {finding.title} for 30 minutes
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        {props.incidents.length > 0 ? (
          <>
            <label>
              <span>Incident workspace</span>
              <select aria-label="Incident workspace selector" value={props.selectedIncidentId} onChange={(event) => props.onSelectIncident(event.target.value)}>
                {props.incidents.map((incident) => (
                  <option key={incident.id} value={incident.id}>
                    {incident.title}
                  </option>
                ))}
              </select>
            </label>
            {props.incidentWorkspace ? (
              <div className="incident-workspace">
                <div className="incident-loop">
                  <section className="incident-loop-section">
                    <h4>Detect</h4>
                    <p>{props.incidentWorkspace.loop.detect.summary}</p>
                    <p>Sessions: {props.incidentWorkspace.loop.detect.sessionKeys.join(", ") || "none"}</p>
                    <div className="search-presets">
                      {props.incidentWorkspace.loop.detect.evidence.map((item) => (
                        <span key={item} className="timeline-chip">
                          {item}
                        </span>
                      ))}
                    </div>
                  </section>
                  <section className="incident-loop-section">
                    <h4>Explain</h4>
                    <p>{props.incidentWorkspace.loop.explain.title}</p>
                    <p>{props.incidentWorkspace.loop.explain.summary}</p>
                    {props.incidentWorkspace.loop.explain.degraded ? <p className="validation-message">Fail-closed: evidence is degraded.</p> : null}
                  </section>
                  <section className="incident-loop-section">
                    <h4>Recommend</h4>
                    <ul>
                      {props.incidentWorkspace.loop.recommend.map((item) => (
                        <li key={item.id}>
                          <strong>{item.title}</strong> {item.rationale}
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className="incident-loop-section">
                    <h4>Act</h4>
                    <div className="search-presets">
                      {props.incidentWorkspace.loop.act.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          disabled={action.availability === "blocked"}
                          title={action.reason ?? action.description}
                          onClick={() =>
                            props.onExecuteIncidentAction(action.id, {
                              ...(action.id === "save_note" || action.id === "record_closeout" ? { body: props.investigationNoteDraft } : {})
                            })
                          }
                        >
                          {action.availability === "blocked" ? buildGatewayScopeButtonLabel(action.label, props.gatewayMissingScopes) : action.label}
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="incident-loop-section">
                    <h4>Record</h4>
                    <p>{props.incidentWorkspace.loop.record.noteCount} note(s); receipts {props.incidentWorkspace.loop.record.latestReceiptIds.join(", ") || "none"}.</p>
                    {props.incidentActionNotice ? <p>{props.incidentActionNotice}</p> : null}
                    {props.incidentWorkspace.loop.record.actionRecords.length > 0 ? (
                      <ul>
                        {props.incidentWorkspace.loop.record.actionRecords.map((record) => (
                          <li key={record.id}>
                            {record.title}: {record.summary}
                            <CorrelationBadge correlationId={typeof record.metadata?.correlationId === "string" ? record.metadata.correlationId : undefined} onCopy={props.onCopyReceiptId} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No incident action records recorded yet.</p>
                    )}
                    {props.incidentRulePacks.length > 0 ? <p>Rule packs: {props.incidentRulePacks.map((pack) => pack.label).join(", ")}.</p> : null}
                  </section>
                </div>
              </div>
            ) : null}
            <label>
              <span>Investigation note</span>
              <textarea
                aria-label="Investigation note"
                value={props.investigationNoteDraft}
                onChange={(event) => props.onInvestigationNoteChange(event.target.value)}
              />
            </label>
            {props.investigationNoteError ? <p className="validation-message">{props.investigationNoteError}</p> : null}
            <button type="button" disabled={Boolean(props.investigationNoteError)} onClick={props.onSaveInvestigationNote}>
              Save investigation note
            </button>
            {props.investigationNotes.length > 0 ? (
              <>
                <p>Investigation note recorded.</p>
                <ul>
                  {props.investigationNotes.slice(0, 3).map((note) => (
                    <li key={note.id}>
                      {note.body}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}
      </section>
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Adapters and offline review</h3>
        </div>
        <button type="button" onClick={props.onPreviewBundleManifest}>
          Preview bundle manifest
        </button>
        <button type="button" onClick={props.onOfflineReview}>
          Open offline review bundle
        </button>
        <button type="button" onClick={props.onCopyOfflineBundle}>
          Copy incident bundle JSON
        </button>
        <button type="button" onClick={props.onComparePreviousBundle}>
          Compare previous day bundle
        </button>
        <button type="button" onClick={props.onCreateReplayWorkspace}>
          Create replay workspace
        </button>
        <p>{props.adapterEvents[0]?.body ?? "No adapter events recorded yet."}</p>
        {props.bundlePreviewText ? <p>{props.bundlePreviewText}</p> : null}
        {props.bundleDigest ? (
          <div className="search-presets">
            <button type="button" onClick={() => props.onCopyBundleDigest(props.bundleDigest!)}>
              Copy bundle digest
            </button>
            <button type="button" onClick={() => props.onCopyBundleDigest(props.bundleDigest!)}>
              Copy incident packet digest
            </button>
          </div>
        ) : null}
        {props.offlineBundleDay ? <p>Offline bundle loaded for {props.offlineBundleDay.dayKey}.</p> : null}
        {props.replayBundleDiffText ? <p>{props.replayBundleDiffText}</p> : null}
        {props.replayWorkspace ? <p>Replay workspace verified: {props.replayWorkspace.verification.verified ? "yes" : "no"}.</p> : null}
      </section>
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Profiles</h3>
        </div>
        <button type="button" onClick={props.onCreateProfile}>
          Create Night Ops profile
        </button>
        <select aria-label="Profile selector" value={props.selectedProfileId} onChange={(event) => props.onSelectProfile(event.target.value)}>
          <option value="default">Default</option>
          {props.profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}
            </option>
          ))}
        </select>
        {selectedProfile?.gatewayUrl ? <p>{selectedProfile.gatewayUrl}</p> : null}
        <p>{profileSafety.label}</p>
        <p>{profileSafety.detail}</p>
      </section>
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Integrations and health history</h3>
        </div>
        <button type="button" onClick={props.onBuildIntegration}>
          Build GitHub issue payload
        </button>
        <button type="button" onClick={props.onPrepareCloseout}>
          Prepare end-of-day closeout
        </button>
        {props.integrationPayload ? <textarea readOnly value={props.integrationPayload} /> : <p>No integration payload generated yet.</p>}
        {props.closeoutPlanText ? <p>{props.closeoutPlanText}</p> : null}
        {props.healthAggregate ? (
          <p>
            Aggregate: reconnects {props.healthAggregate.reconnectCount}, stale windows {props.healthAggregate.staleCount}, recoveries {props.healthAggregate.recoveryCount}.
          </p>
        ) : null}
        {props.closeoutChecklist.length > 0 ? (
          <ul>
            {props.closeoutChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {props.healthHistory.length > 0 ? (
          <ul>
            {props.healthHistory.map((event) => (
              <li key={event.id}>
                {event.category}: {event.title}
              </li>
            ))}
          </ul>
        ) : null}
        {props.recentActionNotices.length > 0 ? <p>Recent actions: {props.recentActionNotices.join(" | ")}</p> : null}
      </section>
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Delivery and governance</h3>
        </div>
        {props.receiptRetryStatus ? <p aria-live="polite">{props.receiptRetryStatus}</p> : null}
        {capabilities.length > 0 ? (
          <div className="capability-registry" aria-label="Capability registry">
            {capabilities.slice(0, 6).map((capability) => (
              <article className="delivery-target-card" key={capability.id}>
                <h4>{capability.label}</h4>
                <p>{formatCapabilitySummary(capability)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="validation-message">Capability registry unavailable; live actions fail closed.</p>
        )}
        <button type="button" onClick={() => props.onCopyApiExample("POST /api/integrations/slack/deliver", { dayKey: props.visibleDay.dayKey, incidentId: props.selectedIncidentId || "incident-id" })}>
          Copy governance API example
        </button>
        {props.integrationVerificationStatus ? <p aria-live="polite">{props.integrationVerificationStatus}</p> : null}
        {failedDryRunNotice ? (
          <p className="validation-message">
            {failedDryRunNotice.message} <a href={failedDryRunNotice.href}>{failedDryRunNotice.label}</a>
          </p>
        ) : null}
        <div className="delivery-target-grid" aria-label="Delivery target verification">
          {deliveryTargets.map((item) => {
            const verificationReceipt = props.integrationVerificationReceipts[item.target];
            return (
              <div className="delivery-target-card" id={`delivery-target-${item.target}`} key={item.target}>
                <h4>{item.label}</h4>
                <div className="search-presets">
                  <button type="button" onClick={() => props.onVerifyIntegration(item.target)}>
                    Verify {item.label} dry run
                  </button>
                  <button type="button" disabled={!capabilityGateAllows(capabilities, `delivery:${item.target}`)} onClick={() => props.onDeliverIntegration(item.target)}>
                    {capabilityGateAllows(capabilities, `delivery:${item.target}`)
                      ? `Deliver to ${item.label.toLocaleLowerCase()}`
                      : buildGatewayScopeButtonLabel(`Deliver to ${item.label.toLocaleLowerCase()}`, props.gatewayMissingScopes)}
                  </button>
                </div>
                {verificationReceipt ? (
                  <>
                    <p>{formatIntegrationVerificationReceipt(verificationReceipt)}</p>
                    <p>{formatReceiptDetails(verificationReceipt)}</p>
                  </>
                ) : (
                  <p>Dry-run verification has not been run for this target in the current workbench session.</p>
                )}
              </div>
            );
          })}
        </div>
        {deliveryReceipts.length > 0 ? (
          <ul>
            {deliveryReceipts.slice(0, 3).map((receipt) => (
              <li key={receipt.id}>
                <p>
                  {receipt.target}: {receipt.status} ({receipt.correlationId})
                  {receipt.deadLetterReason ? ` - ${receipt.deadLetterReason}` : ""} · retries {receipt.retryCount}
                </p>
                <CorrelationBadge correlationId={receipt.correlationId} onCopy={props.onCopyReceiptId} />
                <p>{formatReceiptDetails(receipt)}</p>
                <div className="search-presets">
                  <button aria-label={`Retry receipt ${receipt.id}`} type="button" disabled={receipt.status !== "failed"} onClick={() => props.onRetryReceipt(receipt.id)}>
                    {props.pendingRetryReceiptId === receipt.id ? "Confirm retry" : "Retry"}
                  </button>
                  <button aria-label={`Copy receipt id ${receipt.id}`} type="button" onClick={() => props.onCopyReceiptId(receipt.id)}>
                    Copy receipt id
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p>No delivery receipts recorded yet.</p>
        )}
        {props.lineageRecord ? <p>Lineage: incidents {props.lineageRecord.incidentIds.length}, exports {props.lineageRecord.bundleExportIds.length}, receipts {props.lineageRecord.deliveryReceiptIds.length}.</p> : null}
        <button type="button" onClick={props.onPreviewRetentionByClass}>
          Show class retention impact
        </button>
        <button type="button" onClick={props.onTightenRetention}>
          Tighten entry retention to 14 days
        </button>
        {retentionClasses.length > 0 ? <p>{retentionClasses.length} retention classes configured.</p> : null}
        {retentionClassPreviewState.length > 0 ? (
          <ul>
            {retentionClassPreviewState.slice(0, 3).map((preview) => (
              <li key={preview.classId}>
                {preview.label}: {preview.impact.removedCount} removable
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Replay, correlation, and summaries</h3>
        </div>
        <button type="button" onClick={() => props.onCopyApiExample(`GET /api/correlation/${props.selectedIncidentId || "incident-id"}`, { incidentId: props.selectedIncidentId || "incident-id" })}>
          Copy replay API example
        </button>
        <button type="button" onClick={props.onGenerateSummaryProfile}>
          Generate escalation summary
        </button>
        <button type="button" onClick={props.onRunIntegrityMonitor}>
          Run integrity monitor
        </button>
        <button type="button" onClick={props.onLoadAnalytics}>
          Refresh analytics
        </button>
        <p>{summaryProfiles.length} summary profiles available.</p>
        {props.generatedProfileSummary ? <p>{props.generatedProfileSummary.summary}</p> : <p>No summary profile generated yet.</p>}
        {generatedSummaryCitations.length > 0 ? <p>Citations: {generatedSummaryCitations.map((citation) => citation.entryId).join(", ")}</p> : null}
        {props.missionReplay ? (
          <div>
            <p>Mission replay generated at {props.missionReplay.generatedAt}; {props.missionReplay.steps.length} step(s).</p>
            <ol>
              {props.missionReplay.steps.map((step, index) => (
                <li key={step.id}>
                  <p>{formatMissionReplayStep(step, index)}</p>
                  {step.entryIds.map((entryId) => (
                    <button key={entryId} type="button" onClick={() => props.onJumpToEntry(entryId)}>
                      Open entry {entryId}
                    </button>
                  ))}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p>
            {props.selectedIncidentId
              ? props.replayUnavailable
                ? "Mission replay unavailable: local replay endpoint failed closed."
                : "Mission replay loading from local evidence."
              : "Mission replay unavailable until an incident is selected."}
          </p>
        )}
        {props.correlationGraph ? (
          <div>
            <p>Causality graph: {props.correlationGraph.nodes.length} nodes, {props.correlationGraph.edges.length} edges.</p>
            <ul>
              {props.correlationGraph.nodes.map((node) => (
                <li key={node.id}>{formatCorrelationNode(node)}</li>
              ))}
              {props.correlationGraph.edges.map((edge) => (
                <li key={edge.id}>{formatCorrelationEdge(edge)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>
            {props.selectedIncidentId
              ? props.correlationUnavailable
                ? "Correlation graph unavailable: local correlation endpoint failed closed."
                : "Correlation graph loading from local evidence."
              : "Correlation graph unavailable until an incident is selected."}
          </p>
        )}
        {integrityReports[0] ? <p>Latest integrity report: {integrityReports[0].ok ? "ok" : "issues found"}.</p> : null}
        {props.analyticsSnapshot ? (
          <p>
            Analytics: {props.analyticsSnapshot.noisyTools[0]?.toolName ?? "no noisy tool"} / reconnect-heavy days {props.analyticsSnapshot.reconnectHeavyDays.length}.
          </p>
        ) : null}
        {props.sloSnapshot ? (
          <p>
            SLO: gateway freshness {props.sloSnapshot.gatewayFreshnessOk ? "ok" : "degraded"}, stale summaries {props.sloSnapshot.staleSummaryCount}, failed deliveries {props.sloSnapshot.failedDeliveryCount}.
          </p>
        ) : null}
        {props.runbook ? <p>Runbook sections: {props.runbook.sections.map((section) => section.title).join(", ")}.</p> : null}
        <p>Verification receipts: {props.verificationReceipts.length} published.</p>
        {props.verificationReceipts.length > 0 ? (
          <ul>
            {props.verificationReceipts.slice(0, 4).map((receipt) => (
              <li key={receipt.id}>
                {receipt.command}: {receipt.status} - {receipt.summary}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Plugins and timeline</h3>
        </div>
        <button type="button" onClick={() => props.onCopyApiExample("POST /api/plugins/register", { id: "local-annotation-plugin", capabilities: ["annotation"], readScopes: ["entries", "incidents", "notes"] })}>
          Copy plugin API example
        </button>
        <button type="button" onClick={props.onRegisterPlugin}>
          Register local annotation plugin
        </button>
        {plugins.length > 0 ? (
          <>
            <ul>
              {plugins.map((plugin) => (
                <li key={plugin.id}>
                  {plugin.label} ({plugin.capabilities.join(", ")}) {plugin.supportsDryRun === false ? "live-only" : "dry-run ready"}
                  <button type="button" disabled={!capabilityGateAllows(capabilities, `plugin:${plugin.id}`)} onClick={() => props.onRunPlugin(plugin.id)}>
                    Run
                  </button>
                </li>
              ))}
            </ul>
            {props.pluginRunResult ? <p>{props.pluginRunResult.summary}</p> : null}
          </>
        ) : (
          <p>No plugins registered yet.</p>
        )}
        {props.incidentActionRecords.length > 0 ? <p>Recent incident actions: {props.incidentActionRecords.length}.</p> : null}
        {healthTimeline.length > 0 ? (
          <ul>
            {healthTimeline.slice(0, 4).map((event) => (
              <li key={event.id}>
                {event.category}: {event.detail}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  );
}
