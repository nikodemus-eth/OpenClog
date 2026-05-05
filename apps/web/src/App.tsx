import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { FileText, Search, SlidersHorizontal, SquareChartGantt } from "lucide-react";
import {
  displayProductCopy,
  getTheme,
  resolveThemeId,
  sampleJournalDay,
  themeGroups,
  type AdapterEvent,
  type AgentActivity,
  type AlertFinding,
  type AlertRule,
  type ApprovalView,
  type DeliveryReceipt,
  type IncidentSummary,
  type InvestigationNote,
  type JournalDay,
  type JournalEntry,
  type JournalFilterKey,
  type JournalSearchResult,
  type OperatorViewPreset,
  type ProfileConfig,
  type ServiceHealthTimelineEntry,
  type ThemePracticalGroup,
  type ThemeId
} from "@openclog/core";
import {
  type BundleExport,
  buildCloseoutPlan,
  executeIncidentAction,
  deliverIntegration,
  fetchAnalytics,
  fetchCorrelation,
  fetchDeliveryReceipts,
  fetchHealthHistory,
  fetchHealthTimeline,
  fetchIntegrityReports,
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
  fetchPlugins,
  fetchProfiles,
  fetchReplay,
  fetchRetentionClasses,
  fetchSessionDrilldown,
  fetchSessions,
  fetchSettings,
  fetchSummaryProfiles,
  fetchVersion,
  generateSummary,
  generateSummaryProfile,
  previewRetention,
  previewRetentionByClass,
  registerPlugin,
  resolveApproval,
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
  updateDayContext,
  updateSettings,
  type ApprovalView as ApprovalApiView,
  type VersionResponse
} from "./api.js";
import {
  AppShell,
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
  buildReconnectTrendText,
  mergeDiagnosticsCollapsedState,
  mergeSearchPresets,
  createHomeRouteState,
  describeGeneratedSummaryFreshness,
  formatBundleManifestPreview,
  formatCloseoutPlan,
  formatReplayBundleDiff,
  findDayByCalendarValue,
  getInitialDiagnosticsCollapsedState,
  classifyGatewayUrl,
  formatRetentionPreview,
  isGeneratedSummaryStale,
  searchEmptyState,
  validateInvestigationNote,
  validatePinnedSummary
} from "./state/operator-workspace.js";
import { useTimelinePreferences } from "./hooks/useTimelinePreferences.js";
import "./styles/app.css";

const PINNED_CONTEXT_COLLAPSED_STORAGE_KEY = "openclog.pinned-context.collapsed";
const DIAGNOSTICS_COLLAPSED_STORAGE_KEY = "openclog.diagnostics.collapsed";
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
  const [version, setVersion] = useState<VersionResponse>({ version: "0.1.0", commitSha: "unknown", buildTimestamp: new Date().toISOString() });
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
  const [sessionDetail, setSessionDetail] = useState<Awaited<ReturnType<typeof fetchSessionDrilldown>> | null>(null);
  const [integrityReport, setIntegrityReport] = useState<Awaited<ReturnType<typeof runIntegrityCheck>> | null>(null);
  const [retentionPreviewState, setRetentionPreviewState] = useState<Awaited<ReturnType<typeof previewRetention>> | null>(null);
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState("");
  const [incidentCaptured, setIncidentCaptured] = useState(false);
  const [incidentWorkspace, setIncidentWorkspace] = useState<Awaited<ReturnType<typeof fetchIncidentWorkspace>> | null>(null);
  const [investigationNotes, setInvestigationNotes] = useState<InvestigationNote[]>([]);
  const [investigationNoteDraft, setInvestigationNoteDraft] = useState("");
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertFindings, setAlertFindings] = useState<AlertFinding[]>([]);
  const [adapterEvents, setAdapterEvents] = useState<AdapterEvent[]>([]);
  const [profiles, setProfiles] = useState<ProfileConfig[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState("default");
  const [integrationPayload, setIntegrationPayload] = useState<string>("");
  const [offlineBundleDay, setOfflineBundleDay] = useState<JournalDay | null>(null);
  const [bundlePreview, setBundlePreview] = useState<BundleExport | null>(null);
  const [replayBundleDiffState, setReplayBundleDiffState] = useState<Awaited<ReturnType<typeof diffReplayBundles>> | null>(null);
  const [closeoutPlanState, setCloseoutPlanState] = useState<Awaited<ReturnType<typeof buildCloseoutPlan>> | null>(null);
  const [healthHistory, setHealthHistory] = useState<Awaited<ReturnType<typeof fetchHealthHistory>>>([]);
  const [healthTimeline, setHealthTimeline] = useState<ServiceHealthTimelineEntry[]>([]);
  const [deliveryReceipts, setDeliveryReceipts] = useState<DeliveryReceipt[]>([]);
  const [retentionClasses, setRetentionClasses] = useState<Awaited<ReturnType<typeof fetchRetentionClasses>>>([]);
  const [retentionClassPreviewState, setRetentionClassPreviewState] = useState<Awaited<ReturnType<typeof previewRetentionByClass>>>([]);
  const [lineageRecord, setLineageRecord] = useState<Awaited<ReturnType<typeof fetchLineage>> | null>(null);
  const [summaryProfiles, setSummaryProfiles] = useState<Awaited<ReturnType<typeof fetchSummaryProfiles>>>([]);
  const [generatedProfileSummary, setGeneratedProfileSummary] = useState<Awaited<ReturnType<typeof generateSummaryProfile>> | null>(null);
  const [integrityReports, setIntegrityReports] = useState<Awaited<ReturnType<typeof fetchIntegrityReports>>>([]);
  const [analyticsSnapshot, setAnalyticsSnapshot] = useState<Awaited<ReturnType<typeof fetchAnalytics>> | null>(null);
  const [missionReplay, setMissionReplay] = useState<Awaited<ReturnType<typeof fetchReplay>> | null>(null);
  const [correlationGraph, setCorrelationGraph] = useState<Awaited<ReturnType<typeof fetchCorrelation>> | null>(null);
  const [plugins, setPlugins] = useState<Awaited<ReturnType<typeof fetchPlugins>>>([]);
  const [pluginRunResult, setPluginRunResult] = useState<Awaited<ReturnType<typeof runPlugin>> | null>(null);
  const [incidentActionNotice, setIncidentActionNotice] = useState("");
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
    try {
      const stored = window.localStorage.getItem(DIAGNOSTICS_COLLAPSED_STORAGE_KEY);
      if (!stored) return defaults;
      return mergeDiagnosticsCollapsedState(defaults, JSON.parse(stored) as Record<string, unknown>);
    } catch {
      return defaults;
    }
  });
  const mainRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const gatewayCardRef = useRef<HTMLElement | null>(null);
  const agentActivityCardRef = useRef<HTMLElement | null>(null);
  const approvalsCardRef = useRef<HTMLElement | null>(null);
  const incidentsPanelRef = useRef<HTMLDivElement | null>(null);
  const alertsPanelRef = useRef<HTMLDivElement | null>(null);
  const themeSelectorRef = useRef<HTMLSelectElement | null>(null);
  const timelineRef = useRef<HTMLOListElement | null>(null);
  const toolFilterRef = useRef<HTMLInputElement | null>(null);
  const approvalButtonRef = useRef<HTMLButtonElement | null>(null);
  const helpPopoverRef = useRef<HTMLDivElement | null>(null);
  const route = useJournalRouting("");
  const { activeFilters, grouped, setActiveFilters, setGrouped } = useTimelinePreferences(route.selectedDayKey, themeId, route.grouped, route.activeFilters);
  const resolvedTheme = useMemo(() => getTheme(themeId), [themeId]);
  const effectiveDay = offlineBundleDay ?? day;
  const searchQuery = route.searchQuery;
  const filteredEntries = useMemo(
    () => applyEntryFilters(effectiveDay.entries, activeFilters, showToolCalls),
    [activeFilters, effectiveDay.entries, showToolCalls]
  );
  const visibleDay = useMemo(() => ({ ...effectiveDay, entries: filteredEntries }), [effectiveDay, filteredEntries]);
  const pinnedSummaryError = useMemo(() => validatePinnedSummary(pinnedSummary), [pinnedSummary]);
  const investigationNoteError = useMemo(() => validateInvestigationNote(investigationNoteDraft), [investigationNoteDraft]);
  const generatedSummaryFreshness = useMemo(() => describeGeneratedSummaryFreshness(day.generatedSummary, day.entries), [day.entries, day.generatedSummary]);
  const generatedSummaryStale = useMemo(() => isGeneratedSummaryStale(day.generatedSummary, day.entries), [day.entries, day.generatedSummary]);
  const retentionPreviewText = useMemo(() => formatRetentionPreview(retentionPreviewState), [retentionPreviewState]);
  const searchEmptyMessage = useMemo(() => searchEmptyState(searchQuery, searchResults.length), [searchQuery, searchResults.length]);
  const bundlePreviewText = useMemo(() => (bundlePreview ? formatBundleManifestPreview(bundlePreview) : null), [bundlePreview]);
  const replayBundleDiffText = useMemo(() => formatReplayBundleDiff(replayBundleDiffState), [replayBundleDiffState]);
  const closeoutPlanText = useMemo(() => formatCloseoutPlan(closeoutPlanState), [closeoutPlanState]);
  const archiveView = useMemo(() => buildArchiveView(days, route.selectedDayKey), [days, route.selectedDayKey]);

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
      window.localStorage.setItem(DIAGNOSTICS_COLLAPSED_STORAGE_KEY, JSON.stringify(diagnosticsCollapsed));
    } catch {
      // Ignore local preference persistence failures.
    }
  }, [diagnosticsCollapsed]);

  useEffect(() => {
    void fetchSettings()
      .then((settings) => {
        setShowToolCalls(settings.showToolCalls);
        setThemeId(resolveThemeId(settings.theme));
        setSearchPresets(mergeSearchPresets(settings.searchPresets));
        setOperatorViews(settings.operatorViews);
      })
      .catch(() => setNotice("Gateway degraded: settings are using local defaults."));
    void fetchVersion().then(setVersion).catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    async function refreshCore() {
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
      setGateway(health.gateway);
      setDays(fetchedDays);
      if (targetDayKey !== route.selectedDayKey) route.setSelectedDayKey(targetDayKey);
      setDay(fetchedDay);
      setPinnedNote(fetchedDay.pinnedContext?.note ?? "");
      setPinnedSummary(fetchedDay.pinnedContext?.summary ?? "");
      setAgentActivity(fetchedAgents);
      setApprovals(fetchedApprovals);
      setApprovalChoices((current) => defaultApprovalChoices(fetchedApprovals, current));
      setNotice(
        health.gateway.status === "ready"
          ? "Gateway ready: operator.read, operator.write, and operator.approvals negotiated."
          : "Gateway degraded: live state will not be invented."
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
      const [alerts, adapters, incidentList, noteList, profileData, history, timeline, receipts, classes, profiles, pluginList, reports] = await Promise.all([
        fetchAlerts().catch(() => ({ rules: [] as AlertRule[], findings: [] as AlertFinding[] })),
        fetchAdapterEvents().catch(() => [] as AdapterEvent[]),
        fetchIncidents().catch(() => [] as IncidentSummary[]),
        fetchInvestigationNotes({ dayKey: route.selectedDayKey || day.dayKey }).catch(() => ({ notes: [] as InvestigationNote[] })),
        fetchProfiles().catch(() => ({ selectedProfileId: "default", profiles: [] as ProfileConfig[] })),
        fetchHealthHistory().catch(() => []),
        fetchHealthTimeline().catch(() => ({ timeline: [] as ServiceHealthTimelineEntry[] })),
        fetchDeliveryReceipts().catch(() => ({ receipts: [] as DeliveryReceipt[] })),
        fetchRetentionClasses().catch(() => []),
        fetchSummaryProfiles().catch(() => []),
        fetchPlugins().catch(() => []),
        fetchIntegrityReports().catch(() => [])
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
      setHealthTimeline(timeline.timeline);
      setDeliveryReceipts(receipts.receipts);
      setRetentionClasses(classes);
      setSummaryProfiles(profiles);
      setPlugins(pluginList);
      setIntegrityReports(reports);
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
    if (!selectedIncidentId) {
      setIncidentWorkspace(null);
      setMissionReplay(null);
      setCorrelationGraph(null);
      return;
    }
    void fetchIncidentWorkspace(selectedIncidentId)
      .then(setIncidentWorkspace)
      .catch(() => setIncidentWorkspace(null));
    void fetchReplay(selectedIncidentId)
      .then(setMissionReplay)
      .catch(() => setMissionReplay(null));
    void fetchCorrelation(selectedIncidentId)
      .then(setCorrelationGraph)
      .catch(() => setCorrelationGraph(null));
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
    if (day.generatedSummary || day.entries.length === 0 || offlineBundleDay) return;
    void generateSummary(day.dayKey)
      .then((generatedSummary) => setDay((current) => ({ ...current, generatedSummary })))
      .catch(() => undefined);
  }, [day, offlineBundleDay]);

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

  function handleThemeGroupSelect(practicalGroup: ThemePracticalGroup): void {
    const group = themeGroups.find((item) => item.practicalGroup === practicalGroup);
    const nextThemeId = group?.themeIds[0] ?? "openclog-journal";
    setThemeId(resolveThemeId(nextThemeId));
    setShellActionStatus(`${group?.label ?? "Theme group"} selected.`);
    window.setTimeout(() => themeSelectorRef.current?.focus({ preventScroll: true }), 0);
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
      grouped
    };
    const next = [nextView, ...operatorViews.filter((view) => view.id !== nextView.id)].slice(0, 8);
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
    if (view.dayKey && view.dayKey !== route.selectedDayKey) await handleDaySelect(view.dayKey);
    if (view.searchQuery.trim()) {
      const result = await searchJournal(view.searchQuery);
      setSearchResults(result.results);
      setSearchNextCursor(result.nextCursor);
    }
    setNotice(`${view.label} loaded.`);
  }

  async function handleRetentionPreview(): Promise<void> {
    setRetentionPreviewState(await previewRetention({ keepDays: 1, includeAudit: true, includeRedactedEvents: true, includeSummaries: true }));
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
    setNotice(result.actionRecord.summary);
  }

  async function handleSaveInvestigationNote(): Promise<void> {
    if (investigationNoteError) return;
    await handleExecuteIncidentAction("save_note", { body: investigationNoteDraft.trim() });
  }

  async function handleSaveAlertRule(): Promise<void> {
    const rule = await saveAlertRule({ id: "reconnect-storm", kind: "reconnect_storm", threshold: 1, enabled: true, title: "Reconnect storm" });
    setAlertRules((current) => [rule, ...current.filter((item) => item.id !== rule.id)]);
    const refreshed = await fetchAlerts();
    setAlertFindings(refreshed.findings);
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
    setNotice(`${target} delivery ${receipt.status}.`);
  }

  async function handleOfflineReview(): Promise<void> {
    const bundle = await exportBundle(day.dayKey);
    setOfflineBundleDay(bundle.day);
    setNotice(`Offline review loaded for ${bundle.day.dayKey}.`);
  }

  async function handlePreviewBundleManifest(): Promise<void> {
    const bundle = await exportBundle(day.dayKey);
    setBundlePreview(bundle);
  }

  async function handleCopyOfflineBundle(): Promise<void> {
    const bundle = await exportBundle(day.dayKey);
    await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    setNotice("Incident bundle JSON copied.");
  }

  async function handleCopyApiExample(route: string, payload: Record<string, unknown>): Promise<void> {
    try {
      await navigator.clipboard.writeText(`${route}\n${JSON.stringify(payload, null, 2)}`);
    } catch {
      // Clipboard access can be unavailable in fixture browsers; the route example remains visible through the action status.
    }
    setNotice(`API example copied for ${route}.`);
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
      readScopes: ["entries", "incidents", "notes"]
    });
    setPlugins((current) => [plugin, ...current.filter((item) => item.id !== plugin.id)]);
  }

  async function handleRunPlugin(pluginId: string): Promise<void> {
    setPluginRunResult(await runPlugin(pluginId));
  }

  async function handleCopySessionSummary(): Promise<void> {
    if (!sessionDetail?.sanitizedSummary) return;
    try {
      await navigator.clipboard.writeText(sessionDetail.sanitizedSummary);
    } catch {
      // Clipboard access can fail in test or restricted browser contexts; keep the operator feedback explicit.
    }
    setNotice("Sanitized session summary copied.");
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
    setNotice("Sanitized incident summary copied.");
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
      body: `${alertFindings.filter((finding) => finding.triggered).length} alert finding(s) currently active.`,
      icon: resolvedTheme.icons.gateway,
      label: "Alerts",
      meta: alertRules[0]?.title,
      status: alertFindings.some((finding) => finding.triggered) ? "warning" : "info",
      title: "Policy alerts",
      tone: alertFindings.some((finding) => finding.triggered) ? "warning" : "info"
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
            generatedSummaryStale={generatedSummaryStale}
            helpPopoverRef={helpPopoverRef}
            note={pinnedNote}
            offline={Boolean(offlineBundleDay)}
            summary={pinnedSummary}
            summaryError={pinnedSummaryError}
            onNoteChange={setPinnedNote}
            onRefreshSummary={() => void handleExecuteIncidentAction("refresh_summary")}
            onSave={handleSavePinnedContext}
            onSummaryChange={setPinnedSummary}
            onToggleCollapsed={() => setPinnedContextCollapsed((current) => !current)}
            onToggleHelp={(id) => setActiveHelpPopover((current) => (current === id ? null : id))}
          />
          <TodayAtGlanceCard
            collapsed={diagnosticsCollapsed.todayAtGlance ?? true}
            day={visibleDay}
            reconnectCount={gateway.reconnectCount ?? 0}
            onToggleCollapsed={() => setDiagnosticsCollapsed((current) => ({ ...current, todayAtGlance: !(current.todayAtGlance ?? true) }))}
          />
          <TimelineFiltersCard
            activeFilters={activeFilters}
            collapsed={diagnosticsCollapsed.timelineFilters ?? true}
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
      themeSelectorRef={themeSelectorRef}
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
      onShortcutsClose={() => setShortcutsOpen(false)}
      onShortcutsToggle={() => setShortcutsOpen((current) => !current)}
      onThemeChange={(nextThemeId) => setThemeId(resolveThemeId(nextThemeId))}
      onThemeFocus={() => focusShellTarget(themeSelectorRef.current, "Theme picker focused.")}
      onThemeGroupSelect={handleThemeGroupSelect}
      onTimelineFocus={() => focusShellTarget(timelineRef.current, "Timeline logs focused.")}
      onToastClick={(toast) => {
        void handleToastClick(toast);
      }}
      onToolFilterFocus={() => focusShellTarget(toolFilterRef.current, "Tool filter focused.")}
    >
      <DayHeader day={visibleDay} theme={resolvedTheme} onExport={handleExport} />
      <GatewayReadinessBanner gateway={gateway} theme={resolvedTheme} />
      <Composer composer={composer} inputRef={composerRef} notice={notice} theme={resolvedTheme} onComposerChange={setComposer} onSend={handleSend} />
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
        alertFindings={alertFindings}
        closeoutChecklist={closeoutPlanState?.checklist ?? []}
        closeoutPlanText={closeoutPlanText}
        correlationGraph={correlationGraph}
        deliveryReceipts={deliveryReceipts}
        generatedProfileSummary={generatedProfileSummary}
        healthTimeline={healthTimeline}
        incidents={incidents}
        incidentCaptured={incidentCaptured}
        incidentWorkspace={incidentWorkspace}
        incidentActionNotice={incidentActionNotice}
        integrityReport={integrityReport}
        integrityReports={integrityReports}
        integrationPayload={integrationPayload}
        investigationNoteDraft={investigationNoteDraft}
        investigationNoteError={investigationNoteError}
        investigationNotes={investigationNotes}
        analyticsSnapshot={analyticsSnapshot}
        bundlePreviewText={bundlePreviewText}
        healthHistory={healthHistory}
        lineageRecord={lineageRecord}
        missionReplay={missionReplay}
        offlineBundleDay={offlineBundleDay}
        plugins={plugins}
        pluginRunResult={pluginRunResult}
        profiles={profiles}
        replayBundleDiffText={replayBundleDiffText}
        retentionClasses={retentionClasses}
        retentionClassPreviewState={retentionClassPreviewState}
        retentionPreview={retentionPreviewState}
        retentionPreviewText={retentionPreviewText}
        incidentsPanelRef={incidentsPanelRef}
        alertsPanelRef={alertsPanelRef}
        selectedIncidentId={selectedIncidentId}
        selectedProfileId={selectedProfileId}
        selectedSessionKey={selectedSessionKey}
        sessionLatencyMs={sessionLatencyMs}
        sessionDetail={sessionDetail}
        summaryProfiles={summaryProfiles}
        visibleDay={visibleDay}
        onBuildIntegration={() => void handleBuildIntegration()}
        onComparePreviousBundle={() => void handleComparePreviousBundle()}
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
        onOfflineReview={() => void handleOfflineReview()}
        onInvestigationNoteChange={setInvestigationNoteDraft}
        onLoadAnalytics={() => void handleLoadAnalytics()}
        onPrepareCloseout={() => void handlePrepareCloseout()}
        onPreviewBundleManifest={() => void handlePreviewBundleManifest()}
        onPreviewRetentionByClass={() => void handlePreviewRetentionByClass()}
        onPreviewRetention={() => void handleRetentionPreview()}
        onRunIntegrityCheck={() => void handleRunIntegrityCheck()}
        onRunIntegrityMonitor={() => void handleRunIntegrityMonitor()}
        onRegisterPlugin={() => void handleRegisterPlugin()}
        onRunPlugin={(pluginId) => {
          void handleRunPlugin(pluginId);
        }}
        onSaveAlertRule={() => void handleSaveAlertRule()}
        onSaveInvestigationNote={() => void handleSaveInvestigationNote()}
        onTightenRetention={() => void handleTightenRetention()}
        onSelectIncident={setSelectedIncidentId}
        onSelectProfile={(id) => {
          void handleSelectProfile(id);
        }}
        onSelectSession={setSelectedSessionKey}
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

function TodayAtGlanceCard(props: { collapsed: boolean; day: JournalDay; reconnectCount: number; onToggleCollapsed: () => void }) {
  const items = [
    { label: "Messages", value: props.day.metrics.messageCount },
    { label: "Tools", value: props.day.metrics.toolCallCount },
    { label: "Approvals", value: props.day.metrics.approvalCount },
    { label: "Failures", value: props.day.metrics.errorCount },
    { label: "Reconnects", value: props.reconnectCount }
  ];
  return (
    <section className="diagnostic-card info utility-rail-card" aria-label="Today at a glance" tabIndex={0}>
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
  onFilterToggle: (filter: JournalFilterKey) => void;
  onToggleCollapsed: () => void;
}) {
  return (
    <section className="diagnostic-card info utility-rail-card" aria-label="Saved filters" tabIndex={0}>
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
  generatedSummaryStale: boolean;
  helpPopoverRef: RefObject<HTMLDivElement | null>;
  note: string;
  offline: boolean;
  summary: string;
  summaryError: string | null;
  onNoteChange: (value: string) => void;
  onRefreshSummary: () => void;
  onSave: () => void;
  onSummaryChange: (value: string) => void;
  onToggleCollapsed: () => void;
  onToggleHelp: (id: "pinned-context") => void;
}) {
  return (
    <section className="diagnostic-card info pinned-context-card" aria-label="Pinned context" tabIndex={0}>
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
            {props.summaryError ? <p className="validation-message">{props.summaryError}</p> : null}
            {props.generatedSummary ? <p className="generated-summary">Generated summary: {props.generatedSummary}</p> : null}
            {props.generatedSummaryCreatedAt ? <p className="generated-summary">Summary generated at {props.generatedSummaryCreatedAt}.</p> : null}
            {props.generatedSummaryLastEntryIncludedAt ? <p className="generated-summary">Last entry included: {props.generatedSummaryLastEntryIncludedAt}.</p> : null}
            {props.generatedSummaryStale ? (
              <div className="validation-message">
                <p>Generated summary is stale. Regenerate after reviewing the latest entries.</p>
                {!props.offline ? (
                  <button type="button" onClick={props.onRefreshSummary}>
                    Refresh summary now
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

function SearchPanel(props: {
  activeHelpPopover: "pinned-context" | "journal-search" | null;
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
      </div>
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
  alertFindings: AlertFinding[];
  alertsPanelRef: RefObject<HTMLDivElement | null>;
  bundlePreviewText: string | null;
  closeoutChecklist: string[];
  closeoutPlanText: string | null;
  correlationGraph: Awaited<ReturnType<typeof fetchCorrelation>> | null;
  deliveryReceipts: DeliveryReceipt[];
  generatedProfileSummary: Awaited<ReturnType<typeof generateSummaryProfile>> | null;
  healthHistory: Awaited<ReturnType<typeof fetchHealthHistory>>;
  healthTimeline: ServiceHealthTimelineEntry[];
  incidents: IncidentSummary[];
  incidentActionNotice: string;
  incidentCaptured: boolean;
  incidentWorkspace: Awaited<ReturnType<typeof fetchIncidentWorkspace>> | null;
  incidentsPanelRef: RefObject<HTMLDivElement | null>;
  integrityReport: Awaited<ReturnType<typeof runIntegrityCheck>> | null;
  integrityReports: Awaited<ReturnType<typeof fetchIntegrityReports>>;
  integrationPayload: string;
  investigationNoteDraft: string;
  investigationNoteError: string | null;
  investigationNotes: InvestigationNote[];
  lineageRecord: Awaited<ReturnType<typeof fetchLineage>> | null;
  missionReplay: Awaited<ReturnType<typeof fetchReplay>> | null;
  offlineBundleDay: JournalDay | null;
  plugins: Awaited<ReturnType<typeof fetchPlugins>>;
  pluginRunResult: Awaited<ReturnType<typeof runPlugin>> | null;
  profiles: ProfileConfig[];
  replayBundleDiffText: string | null;
  retentionClasses: Awaited<ReturnType<typeof fetchRetentionClasses>>;
  retentionClassPreviewState: Awaited<ReturnType<typeof previewRetentionByClass>> | null;
  retentionPreview: Awaited<ReturnType<typeof previewRetention>> | null;
  retentionPreviewText: string | null;
  selectedIncidentId: string;
  selectedProfileId: string;
  selectedSessionKey: string;
  sessionLatencyMs: number | null;
  sessionDetail: Awaited<ReturnType<typeof fetchSessionDrilldown>> | null;
  summaryProfiles?: Awaited<ReturnType<typeof fetchSummaryProfiles>>;
  visibleDay: JournalDay;
  onBuildIntegration: () => void;
  onComparePreviousBundle: () => void;
  onCopyApiExample: (route: string, payload: Record<string, unknown>) => void;
  onCopySessionSummary: () => void;
  onCopyOfflineBundle: () => void;
  onCreateIncident: () => void;
  onCreateProfile: () => void;
  onDeliverIntegration: (target: "slack" | "generic-webhook" | "email") => void;
  onExecuteIncidentAction: (actionId: Parameters<typeof executeIncidentAction>[0]["actionId"], options?: { body?: string; pluginId?: string }) => void;
  onGenerateSummaryProfile: () => void;
  onInvestigationNoteChange: (value: string) => void;
  onLoadAnalytics: () => void;
  onOfflineReview: () => void;
  onPrepareCloseout: () => void;
  onPreviewBundleManifest: () => void;
  onPreviewRetentionByClass: () => void;
  onPreviewRetention: () => void;
  onRunIntegrityCheck: () => void;
  onRunIntegrityMonitor: () => void;
  onRegisterPlugin: () => void;
  onRunPlugin: (pluginId: string) => void;
  onSaveAlertRule: () => void;
  onSaveInvestigationNote: () => void;
  onTightenRetention: () => void;
  onSelectIncident: (id: string) => void;
  onSelectProfile: (id: string) => void;
  onSelectSession: (id: string) => void;
}) {
  const sessionOptions = Array.from(new Set(props.visibleDay.entries.map((entry) => entry.sessionId).filter(Boolean))) as string[];
  const selectedProfile = props.profiles.find((profile) => profile.id === props.selectedProfileId) ?? props.profiles[0];
  const profileSafety = classifyGatewayUrl(selectedProfile?.gatewayUrl);
  const deliveryReceipts = props.deliveryReceipts ?? [];
  const retentionClasses = props.retentionClasses ?? [];
  const retentionClassPreviewState = props.retentionClassPreviewState ?? [];
  const summaryProfiles = props.summaryProfiles ?? [];
  const integrityReports = props.integrityReports ?? [];
  const plugins = props.plugins ?? [];
  const healthTimeline = props.healthTimeline ?? [];
  const generatedSummaryCitations = props.generatedProfileSummary?.citations ?? [];
  return (
    <section className="workspace-grid" aria-label="Operational workbench">
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Session drilldown</h3>
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
            {props.sessionDetail.sanitizedSummary ? <p>{props.sessionDetail.sanitizedSummary}</p> : null}
            <button type="button" onClick={props.onCopySessionSummary}>
              Copy sanitized session summary
            </button>
          </>
        ) : (
          <p>No session drilldown available.</p>
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
        {props.integrityReport ? <p>{props.integrityReport.checkedEntries} entries checked; mismatches {props.integrityReport.mismatchedEntryIds.length}.</p> : null}
        {props.retentionPreviewText ? <p>{props.retentionPreviewText}</p> : <p>Preview keeps the newest 1 day before any cleanup is applied.</p>}
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
        <p>{props.incidents.length} incidents, {props.alertFindings.filter((finding) => finding.triggered).length} active alert findings.</p>
        {props.incidents.length === 0 ? (
          <div>
            <p>No incidents captured yet.</p>
            <button type="button" onClick={props.onCreateIncident}>
              Capture incident from this day
            </button>
          </div>
        ) : null}
        <div ref={props.alertsPanelRef} tabIndex={-1}>
          {props.alertFindings.filter((finding) => finding.triggered).length === 0 ? (
            <div>
              <p>No active alert findings right now.</p>
              <button type="button" onClick={props.onSaveAlertRule}>
                Create reconnect alert rule
              </button>
            </div>
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
                          {action.label}
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
                          </li>
                        ))}
                      </ul>
                    ) : null}
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
        <p>{props.adapterEvents[0]?.body ?? "No adapter events recorded yet."}</p>
        {props.bundlePreviewText ? <p>{props.bundlePreviewText}</p> : null}
        {props.offlineBundleDay ? <p>Offline bundle loaded for {props.offlineBundleDay.dayKey}.</p> : null}
        {props.replayBundleDiffText ? <p>{props.replayBundleDiffText}</p> : null}
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
      </section>
      <section className="workspace-panel">
        <div className="panel-header">
          <h3>Delivery and governance</h3>
        </div>
        <button type="button" onClick={() => props.onCopyApiExample("POST /api/integrations/slack/deliver", { dayKey: props.visibleDay.dayKey, incidentId: props.selectedIncidentId || "incident-id" })}>
          Copy governance API example
        </button>
        <div className="search-presets">
          <button type="button" onClick={() => props.onDeliverIntegration("slack")}>
            Deliver to Slack
          </button>
          <button type="button" onClick={() => props.onDeliverIntegration("generic-webhook")}>
            Deliver to webhook
          </button>
          <button type="button" onClick={() => props.onDeliverIntegration("email")}>
            Deliver to email
          </button>
        </div>
        {deliveryReceipts.length > 0 ? (
          <ul>
            {deliveryReceipts.slice(0, 3).map((receipt) => (
              <li key={receipt.id}>
                {receipt.target}: {receipt.status} ({receipt.correlationId})
                {receipt.deadLetterReason ? ` - ${receipt.deadLetterReason}` : ""}
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
        {props.missionReplay ? <p>Mission replay steps: {props.missionReplay.steps.length}</p> : null}
        {props.correlationGraph ? <p>Correlation graph: {props.correlationGraph.nodes.length} nodes, {props.correlationGraph.edges.length} edges.</p> : null}
        {integrityReports[0] ? <p>Latest integrity report: {integrityReports[0].ok ? "ok" : "issues found"}.</p> : null}
        {props.analyticsSnapshot ? (
          <p>
            Analytics: {props.analyticsSnapshot.noisyTools[0]?.toolName ?? "no noisy tool"} / reconnect-heavy days {props.analyticsSnapshot.reconnectHeavyDays.length}.
          </p>
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
                  {plugin.label} ({plugin.capabilities.join(", ")})
                  <button type="button" onClick={() => props.onRunPlugin(plugin.id)}>
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
