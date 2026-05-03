import { useEffect, useMemo, useRef, useState } from "react";
import {
  getTheme,
  displayProductCopy,
  resolveThemeId,
  sampleJournalDay,
  type AgentActivity,
  type ApprovalView,
  type JournalDay,
  type JournalEntry,
  type ThemeId
} from "@openclog/core";
import {
  exportDay,
  fetchApprovals,
  fetchDay,
  fetchDays,
  fetchHealth,
  fetchSessions,
  fetchSettings,
  resolveApproval,
  selectableThemeIds,
  sendComposer,
  updateSettings
} from "./api.js";
import {
  AppShell,
  Composer,
  DayHeader,
  GatewayReadinessBanner,
  Timeline,
  type ApprovalChoice,
  type GatewayViewState,
  type LiveEventToast
} from "./components/JournalLayout.js";
import "./styles/app.css";

export function App() {
  const [themeId, setThemeId] = useState<ThemeId>("openclog-journal");
  const [days, setDays] = useState<Array<Omit<JournalDay, "entries">>>([]);
  const [day, setDay] = useState<JournalDay>(sampleJournalDay);
  const [selectedDayKey, setSelectedDayKey] = useState("");
  const [gateway, setGateway] = useState<GatewayViewState>({ status: "degraded", missingScopes: ["operator.approvals"], stale: true });
  const [composer, setComposer] = useState("");
  const [notice, setNotice] = useState("Gateway degraded: live state will not be invented.");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [groupedTimeline, setGroupedTimeline] = useState(true);
  const [showToolCalls, setShowToolCalls] = useState(true);
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);
  const [approvals, setApprovals] = useState<ApprovalView[]>([]);
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [approvalChoices, setApprovalChoices] = useState<Record<string, ApprovalChoice>>({});
  const [liveEventToasts, setLiveEventToasts] = useState<LiveEventToast[]>([]);
  const [targetEntryId, setTargetEntryId] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);
  const gatewayCardRef = useRef<HTMLElement | null>(null);
  const themeSelectorRef = useRef<HTMLSelectElement | null>(null);
  const timelineRef = useRef<HTMLOListElement | null>(null);
  const toolFilterRef = useRef<HTMLInputElement | null>(null);
  const approvalButtonRef = useRef<HTMLButtonElement | null>(null);
  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const visibleEntries = useMemo(
    () => (showToolCalls ? day.entries : day.entries.filter((entry) => !isToolEntry(entry))),
    [day.entries, showToolCalls]
  );
  const visibleDay = useMemo(() => ({ ...day, entries: visibleEntries }), [day, visibleEntries]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
  }, [themeId]);

  useEffect(() => {
    void fetchSettings()
      .then((settings) => {
        setShowToolCalls(settings.showToolCalls);
        setThemeId(resolveThemeId(settings.theme));
      })
      .catch(() => {
        setNotice("Gateway degraded: settings are using local defaults.");
      });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || isEditableTarget(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        composerRef.current?.focus();
      }
      if (event.key === "?") {
        event.preventDefault();
        setShortcutsOpen((current) => !current);
      }
      if (event.key === "Escape") {
        setShortcutsOpen(false);
        setApprovalsOpen(false);
        setExpandedEntryId(null);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let active = true;
    async function refresh() {
      const [health, fetchedDays] = await Promise.all([fetchHealth(), fetchDays()]);
      const targetDayKey = selectedDayKey && fetchedDays.some((item) => item.dayKey === selectedDayKey)
        ? selectedDayKey
        : (fetchedDays[0]?.dayKey ?? sampleJournalDay.dayKey);
      const [fetchedDay, fetchedAgents, fetchedApprovals] = await Promise.all([
        fetchDay(targetDayKey),
        fetchSessions(targetDayKey).catch(() => [] as AgentActivity[]),
        fetchApprovals().catch(() => [] as ApprovalView[])
      ]);
      if (!active) return;
      setGateway(health.gateway);
      setDays(fetchedDays);
      setSelectedDayKey(targetDayKey);
      setDay(fetchedDay);
      setAgentActivity(fetchedAgents);
      setApprovals(fetchedApprovals);
      setApprovalChoices((current) => defaultApprovalChoices(fetchedApprovals, current));
      setNotice((current) =>
        current === "Sent to OpenClaw. Waiting for live response." || current === "Entry recorded." || current === "Gateway degraded: settings are using local defaults."
          ? current
          : health.gateway.status === "ready"
            ? "Gateway ready: operator.read, operator.write, and operator.approvals negotiated."
            : "Gateway degraded: live state will not be invented."
      );
    }
    void refresh().catch(() => {
      if (active) setGateway({ status: "degraded", missingScopes: ["operator.approvals"], stale: true });
    });
    const timer = window.setInterval(() => {
      void refresh().catch(() => {
        if (active) setGateway({ status: "degraded", missingScopes: ["operator.approvals"], stale: true });
      });
    }, 1500);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedDayKey]);

  useEffect(() => {
    const source = new EventSource("/api/stream");
    source.addEventListener("journal", (event) => {
      const parsed = JSON.parse((event as MessageEvent).data) as { day?: JournalDay; entry?: JournalEntry };
      if (parsed.day && parsed.day.dayKey === selectedDayKey) setDay(parsed.day);
      if (parsed.entry) addLiveEventToast(parsed.entry);
    });
    source.onerror = () => {
      setGateway((current) => ({ ...current, stale: true }));
    };
    return () => source.close();
  }, [selectedDayKey]);

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
              timestamp: new Date("2026-05-02T12:45:00.000Z").toISOString(),
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
    setSelectedDayKey(dayKey);
    setExpandedEntryId(null);
    setTargetEntryId(null);
    try {
      const [fetchedDay, fetchedAgents] = await Promise.all([fetchDay(dayKey), fetchSessions(dayKey).catch(() => [] as AgentActivity[])]);
      setDay(fetchedDay);
      setAgentActivity(fetchedAgents);
    } catch {
      setNotice("Gateway degraded: selected day could not be refreshed.");
    }
  }

  async function handleExport() {
    const blob = await exportDay(day.dayKey);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `openclog-${day.dayKey}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleShowToolCallsChange(show: boolean): void {
    setShowToolCalls(show);
    void updateSettings({ showToolCalls: show }).catch(() => {
      setNotice("Gateway degraded: Show Tool Calls preference could not be saved.");
    });
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
    if (isToolKind(toast.kind) && !showToolCalls) handleShowToolCallsChange(true);
    setSelectedDayKey(toast.dayKey);
    try {
      const fetchedDay = await fetchDay(toast.dayKey);
      setDay(fetchedDay);
    } catch {
      setNotice("Gateway degraded: live entry day could not be refreshed.");
    }
    setExpandedEntryId(toast.entryId);
    setTargetEntryId(toast.entryId);
  }

  function handleApprovalChoiceChange(approvalId: string, choice: ApprovalChoice): void {
    setApprovalChoices((current) => ({ ...current, [approvalId]: choice }));
  }

  async function handleApprovalSubmit(): Promise<void> {
    const selected = approvals.filter((approval) => approvalChoices[approval.id] === "approve" || approvalChoices[approval.id] === "disapprove");
    try {
      await Promise.all(
        selected.map((approval) => resolveApproval(approval.id, approvalChoices[approval.id] === "approve" ? "allow-once" : "deny"))
      );
      const fetchedApprovals = await fetchApprovals().catch(() => [] as ApprovalView[]);
      setApprovals(fetchedApprovals);
      setApprovalChoices((current) => defaultApprovalChoices(fetchedApprovals, current));
      setApprovalsOpen(false);
      approvalButtonRef.current?.focus();
    } catch {
      setNotice("Gateway degraded: approval decisions could not be submitted.");
    }
  }

  function handleCloseApprovals(): void {
    setApprovalsOpen(false);
    approvalButtonRef.current?.focus();
  }

  function handleJumpToFirstApproval(): void {
    const firstApproval = approvals[0];
    const entry = firstApproval
      ? day.entries.find((item) => item.kind === "approval_requested" && (item.approvalId === firstApproval.id || !item.approvalId))
      : undefined;
    if (entry) {
      setExpandedEntryId(entry.id);
      setTargetEntryId(entry.id);
      return;
    }
    setApprovalsOpen(true);
    window.setTimeout(() => document.querySelector<HTMLInputElement>("#pending-approvals-popover input")?.focus(), 0);
  }

  return (
    <AppShell
      day={visibleDay}
      days={days}
      diagnosticsProps={{
        agentActivity,
        approvalButtonRef,
        approvalChoices,
        approvals,
        approvalsOpen,
        gatewayCardRef,
        toolFilterRef,
        showToolCalls,
        onApprovalChoiceChange: handleApprovalChoiceChange,
        onApprovalSubmit: handleApprovalSubmit,
        onCloseApprovals: handleCloseApprovals,
        onJumpToFirstApproval: handleJumpToFirstApproval,
        onShowToolCallsChange: handleShowToolCallsChange,
        onToggleApprovals: () => setApprovalsOpen((current) => !current)
      }}
      gateway={gateway}
      liveEventToasts={liveEventToasts}
      shortcutsOpen={shortcutsOpen}
      theme={theme}
      themeId={themeId}
      themeIds={selectableThemeIds}
      mainRef={mainRef}
      themeSelectorRef={themeSelectorRef}
      onComposerFocus={() => composerRef.current?.focus()}
      onDaySelect={handleDaySelect}
      onGatewayFocus={() => gatewayCardRef.current?.focus()}
      onMainFocus={() => mainRef.current?.focus()}
      onShortcutsToggle={() => setShortcutsOpen((current) => !current)}
      onShortcutsClose={() => setShortcutsOpen(false)}
      onThemeChange={(nextThemeId) => setThemeId(resolveThemeId(nextThemeId))}
      onThemeFocus={() => themeSelectorRef.current?.focus()}
      onTimelineFocus={() => timelineRef.current?.focus()}
      onToolFilterFocus={() => toolFilterRef.current?.focus()}
      onToastClick={(toast) => {
        void handleToastClick(toast);
      }}
    >
      <Composer composer={composer} inputRef={composerRef} notice={notice} theme={theme} onComposerChange={setComposer} onSend={handleSend} />
      <GatewayReadinessBanner gateway={gateway} theme={theme} />
      <DayHeader day={day} theme={theme} onExport={handleExport} />
      <p className="summary">{displayProductCopy(day.summary ?? "")}</p>
      <Timeline
        day={visibleDay}
        expandedEntryId={expandedEntryId}
        grouped={groupedTimeline}
        targetEntryId={targetEntryId}
        timelineRef={timelineRef}
        onGroupedChange={setGroupedTimeline}
        onTargetHandled={() => setTargetEntryId(null)}
        onToggleEntry={(entryId) => setExpandedEntryId((current) => (current === entryId ? null : entryId))}
      />
    </AppShell>
  );
}

function defaultApprovalChoices(approvals: ApprovalView[], current: Record<string, ApprovalChoice>): Record<string, ApprovalChoice> {
  const next: Record<string, ApprovalChoice> = {};
  for (const approval of approvals) next[approval.id] = current[approval.id] ?? "defer";
  return next;
}

function isToolEntry(entry: JournalEntry): boolean {
  return isToolKind(entry.kind);
}

function isToolKind(kind: JournalEntry["kind"]): boolean {
  return kind === "tool_call" || kind === "tool_result";
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || tag === "code" || target.isContentEditable || Boolean(target.closest("[data-editor-control='true']"));
}
