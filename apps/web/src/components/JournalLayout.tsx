import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type React from "react";
import {
  Activity,
  AlertTriangle,
  AtSign,
  Bot,
  CalendarDays,
  ClipboardList,
  Copy,
  Download,
  FileSearch,
  FileText,
  Flag,
  Gauge,
  Hash,
  HelpCircle,
  Home,
  ListFilter,
  Network,
  Paperclip,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  RadioTower,
  Send,
  SlidersHorizontal,
  ShieldCheck,
  SquarePen,
  Wrench,
  type LucideIcon
} from "lucide-react";
import {
  buildTimelineDisplayItems,
  displayProductCopy,
  entryBelongsToGroup,
  formatTimelineGroupSummary,
  getTheme,
  sampleJournalDay,
  themeGroups,
  type AgentActivity,
  type ApprovalView,
  type IconToken,
  type JournalDay,
  type JournalEntry,
  type OpenClogTheme,
  type TimelineDisplayItem,
  type ThemeId
} from "@openclog/core";
import type { VersionResponse } from "../api.js";
import { iconFor } from "./icons.js";
import { timelineDisplayText } from "./event-display.js";
import { StatusChip } from "./StatusChip.js";
import { themeVars } from "./theme-style.js";

export type Theme = OpenClogTheme;

const LEFT_RAIL_COLLAPSED_STORAGE_KEY = "openclog.shell.leftRailCollapsed";
const RIGHT_RAIL_COLLAPSED_STORAGE_KEY = "openclog.shell.rightRailCollapsed";

export interface GatewayViewState {
  connectionStatus?: "connected" | "connecting" | "disconnected";
  lastErrorCategory?: string;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  lastErrorReason?: string;
  lastLiveEventAt?: string;
  lastSuccessfulSyncAt?: string;
  status: "ready" | "blocked" | "degraded";
  scopes?: string[];
  missingScopes: string[];
  scopeNegotiation?: { have: string[]; missing: string[] };
  targetReachable?: boolean;
  nextReconnectAt?: string;
  reconnectCount?: number;
  reconnectAttempt?: number;
  serviceRecovery?: {
    enabled: boolean;
    lastAttemptAt?: string;
    lastReason?: string;
    lastResult?: "success" | "failed" | "skipped";
    nextAllowedAt?: string;
    restartCount: number;
  };
  stale: boolean;
}

export type ApprovalChoice = "approve" | "disapprove" | "defer";

export interface DiagnosticCardDefinition {
  body: string;
  icon: IconToken;
  label: string;
  meta?: string;
  status: string;
  title: string;
  tone: "success" | "info" | "warning" | "danger";
}

export interface LiveEventToast {
  dayKey: string;
  entryId: string;
  id: string;
  kind: JournalEntry["kind"];
  label: string;
}

interface AppShellProps {
  archiveCalendarMessage: string;
  archiveCalendarValue: string;
  children: React.ReactNode;
  day: JournalDay;
  days: Array<Omit<JournalDay, "entries">>;
  diagnosticsProps: Omit<DiagnosticsPanelProps, "day" | "gateway" | "theme" | "onRailCollapse">;
  extraDiagnosticCards?: DiagnosticCardDefinition[];
  gateway: GatewayViewState;
  leftRailContent?: ReactNode;
  liveEventToasts: LiveEventToast[];
  recentDays: Array<Omit<JournalDay, "entries">>;
  rightRailContent?: ReactNode;
  selectedOlderDay: Omit<JournalDay, "entries"> | null;
  shortcutsOpen: boolean;
  shellActionStatus: string;
  lastSuccessfulSummaryJobCompletionAt?: string;
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  healthPollAgeLabel: string;
  healthPollLatencyMs: number | null;
  version: VersionResponse;
  mainRef: RefObject<HTMLElement | null>;
  onAgentActivityFocus: () => void;
  onApprovalsFocus: () => void;
  onArchiveCalendarChange: (value: string) => void;
  onComposerFocus: () => void;
  onDaySelect: (dayKey: string) => void;
  onGatewayFocus: () => void;
  onHomeClick: () => void;
  onJournalTopClick: () => void;
  onMainFocus: () => void;
  onPinnedContextFocus: () => void;
  onSearchFocus: () => void;
  onShortcutsToggle: () => void;
  onShortcutsClose: () => void;
  onThemeChange: (themeId: ThemeId) => void;
  onTimelineFiltersFocus: () => void;
  onTodayAtGlanceFocus: () => void;
  onTimelineFocus: () => void;
  onToolFilterFocus: () => void;
  onToastClick: (toast: LiveEventToast) => void;
}

export function AppShell(props: AppShellProps) {
  const [leftRailCollapsed, setLeftRailCollapsed] = usePersistentBoolean(LEFT_RAIL_COLLAPSED_STORAGE_KEY, false);
  const [rightRailCollapsed, setRightRailCollapsed] = usePersistentBoolean(RIGHT_RAIL_COLLAPSED_STORAGE_KEY, false);

  function runAfterRender(callback: () => void): void {
    window.setTimeout(callback, 0);
  }

  function expandLeftRail(callback?: () => void): void {
    setLeftRailCollapsed(false);
    if (callback) runAfterRender(callback);
  }

  function expandRightRail(callback?: () => void): void {
    setRightRailCollapsed(false);
    if (callback) runAfterRender(callback);
  }

  useEffect(() => {
    function handleShellShortcut(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") return;
      if (event.key === "[") {
        event.preventDefault();
        setLeftRailCollapsed(!leftRailCollapsed);
      }
      if (event.key === "]") {
        event.preventDefault();
        expandRightRail(props.onGatewayFocus);
      }
    }

    window.addEventListener("keydown", handleShellShortcut);
    return () => window.removeEventListener("keydown", handleShellShortcut);
  }, [leftRailCollapsed, props.onGatewayFocus]);

  return (
    <div
      className="app-shell"
      data-accessibility-profile={props.theme.accessibilityProfile}
      data-card-style={props.theme.cardStyle}
      data-density={props.theme.density}
      data-diagnostics-density={props.theme.diagnosticsDensity}
      data-diagnostics-style={props.theme.diagnosticsStyle}
      data-family={props.theme.family}
      data-lifecycle={props.theme.lifecycle}
      data-motion={props.theme.motionProfile}
      data-practical-group={props.theme.practicalGroup}
      data-theme={props.themeId}
      data-theme-use-case={props.theme.useCase}
      data-left-rail-collapsed={leftRailCollapsed}
      data-right-rail-collapsed={rightRailCollapsed}
      data-interaction-emphasis={props.theme.interactionEmphasis}
      data-timeline-layout={props.theme.timelineLayoutMode}
      data-timeline-style={props.theme.timelineStyle}
      style={themeVars(props.theme)}
    >
      <SkipLink />
      <header className="app-header" aria-label="OpenClog operator shell">
        <TopAppBar
          theme={props.theme}
          onHomeClick={props.onHomeClick}
          onJournalTopClick={props.onJournalTopClick}
          onComposerFocus={props.onComposerFocus}
          onGatewayFocus={() => expandRightRail(props.onGatewayFocus)}
          onMainFocus={props.onMainFocus}
          onShortcutsToggle={props.onShortcutsToggle}
          onTimelineFocus={props.onTimelineFocus}
          onToolFilterFocus={() => expandRightRail(props.onToolFilterFocus)}
          healthPollAgeLabel={props.healthPollAgeLabel}
          healthPollLatencyMs={props.healthPollLatencyMs}
          shellActionStatus={props.shellActionStatus}
          version={props.version}
        />
      </header>
      <Sidebar
        leftRailContent={props.leftRailContent}
        days={props.days}
        archiveCalendarMessage={props.archiveCalendarMessage}
        archiveCalendarValue={props.archiveCalendarValue}
        recentDays={props.recentDays}
        selectedDayKey={props.day.dayKey}
        selectedOlderDay={props.selectedOlderDay}
        lastSuccessfulSummaryJobCompletionAt={props.lastSuccessfulSummaryJobCompletionAt}
        theme={props.theme}
        themeId={props.themeId}
        themeIds={props.themeIds}
        collapsed={leftRailCollapsed}
        onArchiveCalendarChange={props.onArchiveCalendarChange}
        onDaySelect={props.onDaySelect}
        onAgentActivityFocus={() => expandRightRail(props.onAgentActivityFocus)}
        onApprovalsFocus={() => expandRightRail(props.onApprovalsFocus)}
        onCollapse={() => setLeftRailCollapsed(true)}
        onGatewayFocus={() => expandRightRail(props.onGatewayFocus)}
        onExpand={() => setLeftRailCollapsed(false)}
        onHomeClick={props.onHomeClick}
        onNewEntry={props.onComposerFocus}
        onSearchFocus={() => expandLeftRail(props.onSearchFocus)}
        onThemeChange={props.onThemeChange}
      />
      <main id="main-content" className="journal-page" aria-label="Daily page" data-theme={props.themeId} ref={props.mainRef} tabIndex={-1}>
        {props.children}
        <footer className="shell-shortcut-strip" aria-label="Keyboard shortcut hints">
          <span>[ left rail</span>
          <span>Alt+S search</span>
          <span>Alt+C composer</span>
          <span>] diagnostics</span>
        </footer>
      </main>
      {rightRailCollapsed ? (
        <CollapsedRightRail
          theme={props.theme}
          onAgentActivityFocus={() => expandRightRail(props.onAgentActivityFocus)}
          onApprovalsFocus={() => expandRightRail(props.onApprovalsFocus)}
          onExpand={() => setRightRailCollapsed(false)}
          onGatewayFocus={() => expandRightRail(props.onGatewayFocus)}
          onPinnedContextFocus={() => expandRightRail(props.onPinnedContextFocus)}
          onTimelineFiltersFocus={() => expandRightRail(props.onTimelineFiltersFocus)}
          onTodayAtGlanceFocus={() => expandRightRail(props.onTodayAtGlanceFocus)}
          onToolFilterFocus={() => expandRightRail(props.onToolFilterFocus)}
        />
      ) : (
        <DiagnosticsPanel
          {...props.diagnosticsProps}
          day={props.day}
          extraCards={props.extraDiagnosticCards ?? []}
          gateway={props.gateway}
          rightRailContent={props.rightRailContent}
          theme={props.theme}
          onRailCollapse={() => setRightRailCollapsed(true)}
        />
      )}
      <ShortcutsHelp open={props.shortcutsOpen} onClose={props.onShortcutsClose} />
      <LiveEventToastStack toasts={props.liveEventToasts} onToastClick={props.onToastClick} />
    </div>
  );
}

function usePersistentBoolean(storageKey: string, defaultValue: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch {
      // Keep the default when browser storage is unavailable.
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // Rail collapse preferences are helpful, but never required for rendering.
    }
  }, [storageKey, value]);

  return [value, setValue];
}

function TopAppBar(props: {
  theme: Theme;
  onHomeClick: () => void;
  onJournalTopClick: () => void;
  onComposerFocus: () => void;
  onGatewayFocus: () => void;
  onMainFocus: () => void;
  onShortcutsToggle: () => void;
  onTimelineFocus: () => void;
  onToolFilterFocus: () => void;
  healthPollAgeLabel: string;
  healthPollLatencyMs: number | null;
  shellActionStatus: string;
  version: VersionResponse;
}) {
  const navItems = [
    { label: "Journal", onClick: props.onMainFocus },
    { label: "Command", onClick: props.onComposerFocus },
    { label: "Network", onClick: props.onGatewayFocus },
    { label: "Logs", onClick: props.onTimelineFocus }
  ];
  const utilityItems = [
    { label: "Tool filter settings", icon: SlidersHorizontal, onClick: props.onToolFilterFocus },
    { label: "Keyboard shortcuts", icon: HelpCircle, onClick: props.onShortcutsToggle }
  ];
  return (
    <div className="top-app-bar">
      <div className="top-app-bar-brand">
        <BrandMark theme={props.theme} compact onClick={props.onHomeClick} />
        <button aria-label="Jump to journal timeline" className="operator-avatar-button" type="button" onClick={props.onJournalTopClick}>
          <OperatorAvatar />
        </button>
      </div>
      <nav aria-label="Primary shell navigation" className="top-nav">
        {navItems.map((item) => (
          <button key={item.label} type="button" onClick={item.onClick}>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="top-utility" aria-label="Shell utilities">
        <p className="backend-meta" aria-label="API backend metadata">
          PID {String(props.version.pid)} · {props.version.commitSha} · built {props.version.buildTimestamp} · boot {props.version.bootedAt}
        </p>
        <p className="backend-meta" aria-label="API health poll telemetry">
          Health poll {props.healthPollLatencyMs !== null ? `${String(props.healthPollLatencyMs)} ms` : "pending"} · last success {props.healthPollAgeLabel}
        </p>
        {props.shellActionStatus ? (
          <p className="shell-action-status" aria-live="polite">
            {props.shellActionStatus}
          </p>
        ) : null}
        {utilityItems.map((item) => (
          <button key={item.label} type="button" aria-label={item.label} onClick={item.onClick}>
            <item.icon size={19} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

function OperatorAvatar() {
  return (
    <span className="operator-avatar" role="img" aria-label="Local operator avatar">
      OC
    </span>
  );
}

export function Sidebar(props: {
  archiveCalendarMessage: string;
  archiveCalendarValue: string;
  collapsed: boolean;
  days: Array<Omit<JournalDay, "entries">>;
  leftRailContent?: ReactNode;
  lastSuccessfulSummaryJobCompletionAt?: string;
  recentDays: Array<Omit<JournalDay, "entries">>;
  selectedDayKey: string;
  selectedOlderDay: Omit<JournalDay, "entries"> | null;
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  onAgentActivityFocus: () => void;
  onApprovalsFocus: () => void;
  onArchiveCalendarChange: (value: string) => void;
  onCollapse: () => void;
  onDaySelect: (dayKey: string) => void;
  onExpand: () => void;
  onGatewayFocus: () => void;
  onHomeClick: () => void;
  onNewEntry: () => void;
  onSearchFocus: () => void;
  onThemeChange: (themeId: ThemeId) => void;
}) {
  if (props.collapsed) {
    const recentLogsLabel = props.lastSuccessfulSummaryJobCompletionAt
      ? `Recent logs. Last summary completion ${props.lastSuccessfulSummaryJobCompletionAt}`
      : "Recent logs";
    const items: CollapsedRailItem[] = [
      { label: "Home", iconName: "home", Icon: Home, onClick: props.onHomeClick },
      { label: "New entry", iconName: "square-pen", Icon: SquarePen, onClick: props.onNewEntry },
      { label: "Journal search", iconName: "file-search", Icon: FileSearch, onClick: props.onSearchFocus },
      { label: recentLogsLabel, iconName: "calendar-days", Icon: CalendarDays, onClick: props.onExpand },
      { label: "Theme picker", iconName: "palette", Icon: Palette, onClick: props.onExpand },
      { label: "Network diagnostics", iconName: "radio-tower", Icon: RadioTower, onClick: props.onGatewayFocus },
      { label: "Agent monitors", iconName: "activity", Icon: Activity, onClick: props.onAgentActivityFocus },
      { label: "Security approvals", iconName: "shield-check", Icon: ShieldCheck, onClick: props.onApprovalsFocus }
    ];
    return (
      <CollapsedRail
        ariaLabel={`${props.theme.labels.archiveTitle} collapsed`}
        className="left-rail"
        expandIcon={PanelLeftOpen}
        expandIconName="panel-left-open"
        expandLabel="Expand left rail"
        items={items}
        side="left"
        onExpand={props.onExpand}
      />
    );
  }

  return (
    <aside className="sidebar left-rail" aria-label={props.theme.labels.archiveTitle}>
      <OperatorConsoleHeader onCollapse={props.onCollapse} onNewEntry={props.onNewEntry} />
      {props.leftRailContent}
      <DayArchive
        archiveCalendarMessage={props.archiveCalendarMessage}
        archiveCalendarValue={props.archiveCalendarValue}
        days={props.days}
        recentDays={props.recentDays}
        selectedDayKey={props.selectedDayKey}
        selectedOlderDay={props.selectedOlderDay}
        theme={props.theme}
        onArchiveCalendarChange={props.onArchiveCalendarChange}
        onDaySelect={props.onDaySelect}
      />
      <ThemeSelector theme={props.theme} themeId={props.themeId} themeIds={props.themeIds} onThemeChange={props.onThemeChange} />
      {props.theme.labels.statusFooter ? <p className="theme-footer">{props.theme.labels.statusFooter}</p> : null}
      <RailSystemShortcuts onAgentActivityFocus={props.onAgentActivityFocus} onApprovalsFocus={props.onApprovalsFocus} onGatewayFocus={props.onGatewayFocus} />
    </aside>
  );
}

function OperatorConsoleHeader(props: { onCollapse: () => void; onNewEntry: () => void }) {
  return (
    <div className="operator-console">
      <div className="operator-console-heading">
        <strong>Operator Console</strong>
        <button
          aria-label="Collapse left rail"
          className="rail-collapse-toggle"
          data-rail-icon="panel-left-close"
          title="Collapse left rail"
          type="button"
          onClick={props.onCollapse}
        >
          <PanelLeftClose size={18} aria-hidden="true" />
        </button>
      </div>
      <p>Station 04-B</p>
      <button type="button" onClick={props.onNewEntry}>
        <SquarePen size={18} aria-hidden="true" />
        New Entry
      </button>
    </div>
  );
}

function RailSystemShortcuts(props: { onAgentActivityFocus: () => void; onApprovalsFocus: () => void; onGatewayFocus: () => void }) {
  const shortcuts = [
    { label: "Network", icon: RadioTower, onClick: props.onGatewayFocus },
    { label: "Monitors", icon: Activity, onClick: props.onAgentActivityFocus },
    { label: "Security", icon: ShieldCheck, onClick: props.onApprovalsFocus }
  ];
  return (
    <nav className="rail-shortcuts" aria-label="System shortcuts">
      <p>System</p>
      {shortcuts.map((shortcut) => (
        <button key={shortcut.label} type="button" onClick={shortcut.onClick}>
          <shortcut.icon size={17} aria-hidden="true" />
          {shortcut.label}
        </button>
      ))}
    </nav>
  );
}

export function DayArchive(props: {
  archiveCalendarMessage: string;
  archiveCalendarValue: string;
  days: Array<Omit<JournalDay, "entries">>;
  recentDays: Array<Omit<JournalDay, "entries">>;
  selectedDayKey: string;
  selectedOlderDay: Omit<JournalDay, "entries"> | null;
  theme: Theme;
  onArchiveCalendarChange: (value: string) => void;
  onDaySelect: (dayKey: string) => void;
}) {
  const items = props.recentDays.length > 0 ? props.recentDays : props.days.length > 0 ? props.days.slice(0, 7) : [sampleJournalDay];
  const todayItem = items[0];
  return (
    <div className="day-list" aria-label={props.theme.labels.archiveTitle}>
      <div className="archive-block">
        <div className="archive-heading-row">
          <strong className="archive-heading">Recent logs</strong>
          <button aria-label="Select today log" className="archive-today-button" type="button" onClick={() => props.onDaySelect(todayItem.dayKey)}>
            Today
          </button>
        </div>
        <nav aria-label="Recent logs">
      {items.map((item) => {
        const selected = item.dayKey === props.selectedDayKey;
        const title = displayProductCopy(item.title);
        const completeness = item.evidenceCompleteness;
        const completenessLabel = completeness?.label ?? "Evidence completeness unavailable";
        return (
        <button
          aria-current={selected ? "date" : undefined}
          aria-label={`${item.dateLabel}. ${title}. ${selected ? props.theme.labels.selectedDayStatus : "Archived day"}. ${item.metrics.errorCount > 0 ? "Status: degraded" : "Status: active"}. ${completenessLabel}`}
          className={selected ? "day-row selected" : "day-row"}
          key={item.dayKey}
          onClick={() => props.onDaySelect(item.dayKey)}
          type="button"
        >
          <span>{item.dateLabel}</span>
          <strong>{title}</strong>
          <small>
            {selected ? props.theme.labels.selectedDayStatus : "Archived day"} · {item.metrics.errorCount > 0 ? "Status: degraded" : "Status: active"}
          </small>
          {completeness ? <small className="evidence-badge">{completeness.label}</small> : null}
        </button>
        );
      })}
        </nav>
      </div>
      <div className="archive-block archive-calendar">
        <label className="archive-date-picker">
          <span>Jump to date</span>
          <input
            aria-label="Jump to date"
            type="date"
            value={props.archiveCalendarValue}
            onChange={(event) => props.onArchiveCalendarChange(event.target.value)}
          />
        </label>
        {props.archiveCalendarMessage ? <p className="archive-message">{props.archiveCalendarMessage}</p> : null}
        {props.selectedOlderDay ? (
          <div>
            <strong className="archive-heading">Selected older log</strong>
            <button className="day-row selected" type="button" onClick={() => props.onDaySelect(props.selectedOlderDay?.dayKey ?? "")}>
              <span>{props.selectedOlderDay.dateLabel}</span>
              <strong>{displayProductCopy(props.selectedOlderDay.title)}</strong>
              <small>{props.theme.labels.selectedDayStatus} · older log</small>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ThemeSelector(props: {
  selectRef?: RefObject<HTMLSelectElement | null>;
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  onThemeChange: (themeId: ThemeId) => void;
}) {
  const themeIdSet = useMemo(() => new Set(props.themeIds), [props.themeIds]);
  return (
    <label className="theme-picker">
      <span>Theme picker: {props.theme.labels.themeLabel}</span>
      <small>Theme and background settings are decorative only.</small>
      <select aria-label="Theme" ref={props.selectRef} value={props.themeId} onChange={(event) => props.onThemeChange(event.target.value as ThemeId)}>
        {themeGroups.map((group) => {
          const themeIds = group.themeIds.filter((id) => themeIdSet.has(id));
          if (themeIds.length === 0) return null;
          return (
            <optgroup key={group.label} label={group.label}>
              {themeIds.map((id) => (
                <option key={id} value={id}>
                  {getTheme(id).displayName}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </label>
  );
}

export function Composer(props: {
  composer: string;
  connectivityDetail: string;
  connectivityLabel: "Local only" | "Live Gateway";
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  notice: string;
  theme: Theme;
  onComposerChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <section className="composer" aria-label="Composer">
      <div className="composer-shell">
        <div className="composer-icon" aria-hidden="true">
          <FileText size={22} />
        </div>
        <label>
          <span>{props.theme.labels.composerPrompt}</span>
          <textarea
            aria-label="Composer input"
            ref={props.inputRef}
            value={props.composer}
            onChange={(event) => props.onComposerChange(event.target.value)}
            placeholder="Ask OpenClog or write something..."
          />
        </label>
        <div className="composer-row">
          <div className="composer-tools" aria-hidden="true">
            <Paperclip size={17} />
            <AtSign size={17} />
            <Hash size={17} />
          </div>
          <div title={props.connectivityDetail}>
            <StatusChip label="Composer mode" status={props.connectivityLabel} tone={props.connectivityLabel === "Live Gateway" ? "success" : "warning"} />
          </div>
          <button type="button" onClick={props.onSend}>
            <Send size={18} aria-hidden="true" />
            {props.theme.labels.send}
          </button>
        </div>
        {props.connectivityLabel === "Live Gateway" ? <p className="composer-mode-detail">{props.connectivityDetail}</p> : null}
      </div>
      <p aria-live="polite" className={props.notice.includes("blocked") || props.notice.includes("Command") ? "notice warning" : "notice"}>
        {props.notice}
      </p>
    </section>
  );
}

export function GatewayReadinessBanner(props: { gateway: GatewayViewState; theme: Theme; onCopyMissingScopes?: () => void }) {
  const status = props.gateway.status === "ready" && !props.gateway.stale ? "success" : props.gateway.status === "blocked" ? "danger" : "warning";
  const haveScopes = props.gateway.scopeNegotiation?.have ?? props.gateway.scopes ?? [];
  const missingScopes = props.gateway.scopeNegotiation?.missing ?? props.gateway.missingScopes;
  return (
    <section className={`readiness-banner ${status}`} aria-label={`Gateway readiness: ${props.gateway.status}`} aria-live="polite">
      <StatusChip label="Gateway readiness" status={props.gateway.status} tone={status} />
      <p>
        {props.gateway.connectionStatus === "connecting"
          ? "OpenClaw Gateway is reconnecting; control actions are paused."
          : props.gateway.status === "ready"
          ? "OpenClaw Gateway ready with required operator scopes."
          : props.gateway.stale
            ? "OpenClaw Gateway degraded: state is stale or unavailable."
            : "OpenClaw Gateway degraded: missing required operator scopes."}
      </p>
      <p>Have scopes: {haveScopes.join(", ") || "none"}. Missing scopes: {missingScopes.join(", ") || "none"}.</p>
      {missingScopes.length > 0 && props.onCopyMissingScopes ? (
        <button type="button" onClick={props.onCopyMissingScopes}>
          Copy missing scopes
        </button>
      ) : null}
    </section>
  );
}

export function BackendMismatchBanner(props: { detail: string; onRecover?: () => void }) {
  return (
    <section className="readiness-banner danger" role="status" aria-label="Backend mismatch">
      <StatusChip label="Backend mismatch" status="stale" tone="danger" />
      <p>{props.detail}</p>
      {props.onRecover ? (
        <button type="button" onClick={props.onRecover}>
          Reload diagnostics and active day
        </button>
      ) : null}
    </section>
  );
}

export function DayHeader(props: { day: JournalDay; lastSuccessfulSummaryJobCompletionAt?: string; summaryFreshnessLabel: string; theme: Theme; onExport: () => void }) {
  const freshnessTone = props.summaryFreshnessLabel === "fresh" ? "success" : props.summaryFreshnessLabel === "missing" ? "info" : "warning";
  return (
    <header className="day-header">
      <div>
        <p>{props.day.dateLabel}</p>
        <h2>{props.theme.labels.mainTitle}</h2>
        {props.theme.labels.productSubtitle ? <p className="theme-subtitle">{props.theme.labels.productSubtitle}</p> : null}
        <div className="day-header-meta">
          <StatusChip label="Summary freshness" status={props.summaryFreshnessLabel} tone={freshnessTone} />
          {props.lastSuccessfulSummaryJobCompletionAt ? <span>Last summary completion {props.lastSuccessfulSummaryJobCompletionAt}</span> : null}
        </div>
      </div>
      <button type="button" onClick={props.onExport}>
        <Download size={18} aria-hidden="true" />
        {props.theme.labels.exportDay}
      </button>
    </header>
  );
}

export function Timeline(props: {
  day: JournalDay;
  expandedEntryId: string | null;
  grouped: boolean;
  onCopyIncidentSummary: (entry: JournalEntry) => void;
  targetEntryId: string | null;
  timelineRef: RefObject<HTMLOListElement | null>;
  onGroupedChange: (grouped: boolean) => void;
  onTargetHandled: () => void;
  onToggleEntry: (entryId: string) => void;
}) {
  const { day, expandedEntryId, grouped, onCopyIncidentSummary, targetEntryId, timelineRef, onGroupedChange, onTargetHandled, onToggleEntry } = props;
  const refs = useRef(new Map<string, HTMLDivElement>());
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const displayItems = useMemo(() => buildTimelineDisplayItems(day.entries, { grouped }), [day.entries, grouped]);
  const orderedEntries = useMemo(() => displayItems.flatMap((item) => (item.kind === "group" ? item.entries : [item.entry])), [displayItems]);
  const entryIds = useMemo(() => orderedEntries.map((entry) => entry.id), [orderedEntries]);
  const entryIndexById = useMemo(() => new Map(entryIds.map((id, index) => [id, index])), [entryIds]);

  useEffect(() => {
    if (!targetEntryId) return;
    const target = refs.current.get(targetEntryId);
    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.focus();
      onTargetHandled();
      return;
    }
    const group = displayItems.find((item) => entryBelongsToGroup(item, targetEntryId));
    if (group?.kind !== "group") return;
    setExpandedGroupIds((current) => new Set(current).add(group.id));
    window.setTimeout(() => {
      const nestedTarget = refs.current.get(targetEntryId);
      if (!nestedTarget) return;
      nestedTarget.scrollIntoView({ block: "center", behavior: "smooth" });
      nestedTarget.focus();
      onTargetHandled();
    }, 0);
  }, [displayItems, onTargetHandled, targetEntryId]);

  function toggleGroup(groupId: string): void {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function focusEntry(index: number): void {
    const id = entryIds[Math.max(0, Math.min(index, entryIds.length - 1))];
    if (id) refs.current.get(id)?.focus();
  }

  function handleTimelineKeyDown(event: React.KeyboardEvent<HTMLOListElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusEntry(0);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusEntry(entryIds.length - 1);
    }
  }

  function handleEntryKeyDown(event: React.KeyboardEvent<HTMLDivElement>, entry: JournalEntry, index: number): void {
    if (event.key === "ArrowDown") {
      event.stopPropagation();
      event.preventDefault();
      focusEntry(index + 1);
    }
    if (event.key === "ArrowUp") {
      event.stopPropagation();
      event.preventDefault();
      focusEntry(index - 1);
    }
    if (event.key === "Enter") {
      event.stopPropagation();
      event.preventDefault();
      onToggleEntry(entry.id);
    }
  }

  return (
    <section className="timeline-region" aria-label="Journal timeline">
      <div className="timeline-toolbar" aria-label="Timeline view">
        <button aria-pressed={grouped} type="button" onClick={() => onGroupedChange(true)}>
          Grouped timeline
        </button>
        <button aria-pressed={!grouped} type="button" onClick={() => onGroupedChange(false)}>
          Raw timeline
        </button>
      </div>
      {displayItems.length === 0 ? (
        <div className="timeline-empty-state" role="status">
          <h3>No journal entries match the current view.</h3>
          <p>Try clearing saved filters, switching timeline mode, or waiting for fresh Gateway traffic.</p>
        </div>
      ) : null}
      <ol className="timeline" aria-label="Timeline entries" ref={timelineRef} tabIndex={0} onKeyDown={handleTimelineKeyDown}>
        {displayItems.map((item) =>
          item.kind === "group" ? (
            <TimelineGroupCard
              entryIndexById={entryIndexById}
              expanded={expandedGroupIds.has(item.id)}
              expandedEntryId={expandedEntryId}
              group={item}
              key={item.id}
              refs={refs}
              targetEntryId={targetEntryId}
              onCopyIncidentSummary={onCopyIncidentSummary}
              onEntryKeyDown={handleEntryKeyDown}
              onTargetHandled={onTargetHandled}
              onToggleEntry={onToggleEntry}
              onToggleGroup={() => toggleGroup(item.id)}
            />
          ) : (
            <TimelineEntryCard
              entry={item.entry}
              expanded={expandedEntryId === item.entry.id}
              index={entryIndexById.get(item.entry.id) ?? 0}
              key={item.entry.id}
              setRef={(node) => {
                if (node) refs.current.set(item.entry.id, node);
                else refs.current.delete(item.entry.id);
              }}
              onCopyIncidentSummary={() => onCopyIncidentSummary(item.entry)}
              onKeyDown={(event) => handleEntryKeyDown(event, item.entry, entryIndexById.get(item.entry.id) ?? 0)}
              onToggle={() => onToggleEntry(item.entry.id)}
            />
          )
        )}
      </ol>
    </section>
  );
}

function TimelineGroupCard(props: {
  group: Extract<TimelineDisplayItem, { kind: "group" }>;
  expanded: boolean;
  refs: RefObject<Map<string, HTMLDivElement>>;
  entryIndexById: Map<string, number>;
  expandedEntryId: string | null;
  targetEntryId: string | null;
  onCopyIncidentSummary: (entry: JournalEntry) => void;
  onEntryKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, entry: JournalEntry, index: number) => void;
  onTargetHandled: () => void;
  onToggleEntry: (entryId: string) => void;
  onToggleGroup: () => void;
}) {
  return (
    <li>
      <section className="entry-group" aria-label={`Grouped timeline entries: ${props.group.count} entries`} data-group-id={props.group.id}>
        <div className="entry-card grouped info">
          <time>{new Date(props.group.lastTimestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
          <div className="entry-icon" aria-hidden="true">
            <FileText size={20} />
          </div>
          <div className="entry-body">
            <h3>{displayProductCopy(props.group.title)}</h3>
            <p>{formatTimelineGroupSummary(props.group)}</p>
            <p className="visually-hidden">{props.group.entries.map((entry) => timelineDisplayText(entry, false).body).join(" ")}</p>
            <button type="button" onClick={props.onToggleGroup}>
              {props.expanded ? "Collapse grouped events" : "Expand grouped events"}
            </button>
          </div>
          <StatusChip label="Grouped entries" status={props.group.status} tone="info" />
        </div>
        {props.expanded ? (
          <ol className="grouped-entry-list" aria-label="Expanded grouped entries">
            {props.group.entries.map((entry) => (
              <TimelineEntryCard
                entry={entry}
                expanded={props.expandedEntryId === entry.id}
                index={props.entryIndexById.get(entry.id) ?? 0}
                key={entry.id}
                setRef={(node) => {
                  if (node) {
                    props.refs.current.set(entry.id, node);
                    if (props.targetEntryId === entry.id) {
                      window.setTimeout(() => {
                        node.scrollIntoView({ block: "center", behavior: "smooth" });
                        node.focus();
                        props.onTargetHandled();
                      }, 0);
                    }
                  } else props.refs.current.delete(entry.id);
                }}
                onCopyIncidentSummary={() => props.onCopyIncidentSummary(entry)}
                onKeyDown={(event) => props.onEntryKeyDown(event, entry, props.entryIndexById.get(entry.id) ?? 0)}
                onToggle={() => props.onToggleEntry(entry.id)}
              />
            ))}
          </ol>
        ) : null}
      </section>
    </li>
  );
}

export function TimelineEntryCard(props: {
  entry: JournalEntry;
  expanded: boolean;
  index: number;
  onCopyIncidentSummary: () => void;
  setRef: (node: HTMLDivElement | null) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onToggle: () => void;
}) {
  const tone = props.entry.severity === "error" ? "danger" : props.entry.severity === "warning" ? "warning" : props.entry.status === "success" ? "success" : "info";
  const display = timelineDisplayText(props.entry, props.expanded);
  return (
    <li>
      <div
        aria-expanded={props.expanded}
        aria-label={`Timeline entry ${props.index + 1}: ${displayProductCopy(props.entry.title)}. Status: ${props.entry.status ?? "info"}`}
        className={`entry-card ${tone}`}
        data-entry-id={props.entry.id}
        onClick={props.onToggle}
        onKeyDown={props.onKeyDown}
        ref={props.setRef}
        role="button"
        tabIndex={-1}
      >
        <time>{new Date(props.entry.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
        <div className="entry-icon" aria-hidden="true">
          {props.entry.severity === "warning" ? <AlertTriangle size={20} /> : <FileText size={20} />}
        </div>
        <div className="entry-body">
          <h3>{displayProductCopy(props.entry.title)}</h3>
          <p>{display.body}</p>
          {display.hasMore ? <small>Preview shown. Open this entry for the full redacted text.</small> : null}
          {display.redactions.length > 0 && props.expanded ? <small>Redacted for: {display.redactions.map((redaction) => redaction.reason).join(", ")}.</small> : null}
          {props.entry.toolName ? <small>Tool: {props.entry.toolName}</small> : null}
          {props.expanded ? <p className="entry-details">Entry details: source {props.entry.source}; redacted {props.entry.redacted ? "yes" : "no"}.</p> : null}
          {props.entry.severity === "error" || props.entry.status === "failed" ? (
            <button
              type="button"
              className="inline-action"
              onClick={(event) => {
                event.stopPropagation();
                props.onCopyIncidentSummary();
              }}
            >
              <Copy size={14} aria-hidden="true" />
              Copy incident summary
            </button>
          ) : null}
        </div>
        <StatusChip label="Entry" status={props.entry.status ?? "info"} tone={tone} />
      </div>
    </li>
  );
}

export interface DiagnosticsPanelProps {
  agentActivity: AgentActivity[];
  agentActivityCardRef: RefObject<HTMLElement | null>;
  approvals: ApprovalView[];
  approvalsCardRef: RefObject<HTMLElement | null>;
  approvalsOpen: boolean;
  approvalButtonRef: RefObject<HTMLButtonElement | null>;
  approvalChoices: Record<string, ApprovalChoice>;
  collapsed: {
    agentActivity: boolean;
    gateway: boolean;
    pendingApprovals: boolean;
    recentTools: boolean;
    [key: string]: boolean;
  };
  day: JournalDay;
  gatewayCardRef: RefObject<HTMLElement | null>;
  gateway: GatewayViewState;
  rightRailContent?: ReactNode;
  showToolCalls: boolean;
  toolFilterRef: RefObject<HTMLInputElement | null>;
  theme: Theme;
  extraCards?: DiagnosticCardDefinition[];
  onCardToggle: (card: string) => void;
  onApprovalChoiceChange: (approvalId: string, choice: ApprovalChoice) => void;
  onApprovalSubmit: () => void;
  onCloseApprovals: () => void;
  onJumpToFirstApproval: () => void;
  onShowToolCallsChange: (show: boolean) => void;
  onToggleApprovals: () => void;
  onRailCollapse: () => void;
}

export function DiagnosticsPanel(props: DiagnosticsPanelProps) {
  const gatewayTone = props.gateway.status === "ready" && !props.gateway.stale ? "success" : props.gateway.status === "blocked" ? "danger" : "warning";
  const recovery = props.gateway.serviceRecovery;
  return (
    <aside className="sidebar right-rail" aria-label={props.theme.labels.diagnosticsTitle}>
      <div className="rail-title-row">
        <h2>{props.theme.labels.diagnosticsTitle}</h2>
        <button
          aria-label="Collapse right rail"
          className="rail-collapse-toggle"
          data-rail-icon="panel-right-close"
          title="Collapse right rail"
          type="button"
          onClick={props.onRailCollapse}
        >
          <PanelRightClose size={18} aria-hidden="true" />
        </button>
      </div>
      <PendingApprovalsCard
        approvalButtonRef={props.approvalButtonRef}
        approvals={props.approvals}
        choices={props.approvalChoices}
        collapsed={props.collapsed.pendingApprovals}
        icon={props.theme.icons.approvals}
        open={props.approvalsOpen}
        sectionRef={props.approvalsCardRef}
        pendingCount={props.approvals.length}
        onChoiceChange={props.onApprovalChoiceChange}
        onClose={props.onCloseApprovals}
        onJumpToFirstApproval={props.onJumpToFirstApproval}
        onSubmit={props.onApprovalSubmit}
        onToggle={props.onToggleApprovals}
        onToggleCollapsed={() => props.onCardToggle("pendingApprovals")}
      />
      {props.rightRailContent}
      <DiagnosticsCard
        body={gatewayDiagnosticBody(props.gateway)}
        collapsed={props.collapsed.gateway}
        icon={props.theme.icons.gateway}
        label="Gateway"
        meta={
          props.gateway.lastErrorCategory
            ? `Last error category: ${props.gateway.lastErrorCategory}${props.gateway.lastSuccessfulSyncAt ? ` · Last successful sync ${formatTime(props.gateway.lastSuccessfulSyncAt)}` : ""}`
            : props.gateway.missingScopes.length > 0
            ? `Missing scopes: ${props.gateway.missingScopes.join(", ")}`
            : recovery && recovery.restartCount > 0
              ? `Service recovery attempted ${String(recovery.restartCount)} time${recovery.restartCount === 1 ? "" : "s"}`
              : props.gateway.lastSuccessfulSyncAt
                ? `Last successful sync ${formatTime(props.gateway.lastSuccessfulSyncAt)}`
              : props.gateway.reconnectCount
                ? `${String(props.gateway.reconnectCount)} reconnect event${props.gateway.reconnectCount === 1 ? "" : "s"} observed`
                : "All required scopes negotiated"
        }
        sectionRef={props.gatewayCardRef}
        status={props.gateway.status}
        title={`Gateway ${props.gateway.status}`}
        tone={gatewayTone}
        onToggleCollapsed={() => props.onCardToggle("gateway")}
      />
      <AgentActivityCard agents={props.agentActivity} collapsed={props.collapsed.agentActivity} icon={props.theme.icons.activity} sectionRef={props.agentActivityCardRef} onToggleCollapsed={() => props.onCardToggle("agentActivity")} />
      <RecentToolsCard collapsed={props.collapsed.recentTools} count={props.day.metrics.toolCallCount} icon={props.theme.icons.tools} inputRef={props.toolFilterRef} showToolCalls={props.showToolCalls} onShowToolCallsChange={props.onShowToolCallsChange} onToggleCollapsed={() => props.onCardToggle("recentTools")} />
      {props.extraCards?.map((card) => (
        <DiagnosticsCard key={card.label} collapsed={props.collapsed[card.label] ?? true} onToggleCollapsed={() => props.onCardToggle(card.label)} {...card} />
      ))}
    </aside>
  );
}

function CollapsedRightRail(props: {
  theme: Theme;
  onAgentActivityFocus: () => void;
  onApprovalsFocus: () => void;
  onExpand: () => void;
  onGatewayFocus: () => void;
  onPinnedContextFocus: () => void;
  onTimelineFiltersFocus: () => void;
  onTodayAtGlanceFocus: () => void;
  onToolFilterFocus: () => void;
}) {
  const items: CollapsedRailItem[] = [
    { label: "Pending approvals", iconName: "clipboard-list", Icon: ClipboardList, onClick: props.onApprovalsFocus },
    { label: "Pinned context", iconName: "pin", Icon: Pin, onClick: props.onPinnedContextFocus },
    { label: "Today at a glance", iconName: "gauge", Icon: Gauge, onClick: props.onTodayAtGlanceFocus },
    { label: "Saved filters", iconName: "list-filter", Icon: ListFilter, onClick: props.onTimelineFiltersFocus },
    { label: "Gateway diagnostics", iconName: "network", Icon: Network, onClick: props.onGatewayFocus },
    { label: "Agent activity", iconName: "bot", Icon: Bot, onClick: props.onAgentActivityFocus },
    { label: "Recent tools", iconName: "wrench", Icon: Wrench, onClick: props.onToolFilterFocus }
  ];
  return (
    <CollapsedRail
      ariaLabel={`${props.theme.labels.diagnosticsTitle} collapsed`}
      className="right-rail"
      expandIcon={PanelRightOpen}
      expandIconName="panel-right-open"
      expandLabel="Expand right rail"
      items={items}
      side="right"
      onExpand={props.onExpand}
    />
  );
}

interface CollapsedRailItem {
  label: string;
  iconName: string;
  Icon: LucideIcon;
  onClick: () => void;
}

function CollapsedRail(props: {
  ariaLabel: string;
  className: "left-rail" | "right-rail";
  expandIcon: LucideIcon;
  expandIconName: string;
  expandLabel: string;
  items: CollapsedRailItem[];
  side: "left" | "right";
  onExpand: () => void;
}) {
  const ExpandIcon = props.expandIcon;
  return (
    <aside className={`sidebar ${props.className} collapsed-rail collapsed-${props.side}-rail`} aria-label={props.ariaLabel}>
      <button
        aria-label={props.expandLabel}
        className="rail-collapse-toggle collapsed-rail-expand"
        data-rail-icon={props.expandIconName}
        title={props.expandLabel}
        type="button"
        onClick={props.onExpand}
      >
        <ExpandIcon size={20} aria-hidden="true" />
      </button>
      <nav className="collapsed-rail-nav" aria-label={`${props.side === "left" ? "Workspace" : "Diagnostics"} collapsed rail shortcuts`}>
        {props.items.map((item) => (
          <button
            aria-label={item.label}
            className="collapsed-rail-button"
            data-rail-icon={item.iconName}
            key={item.label}
            title={item.label}
            type="button"
            onClick={item.onClick}
          >
            <item.Icon size={20} aria-hidden="true" />
          </button>
        ))}
      </nav>
    </aside>
  );
}

function gatewayDiagnosticBody(gateway: GatewayViewState): string {
  if (gateway.connectionStatus === "connecting") return gateway.nextReconnectAt ? `Reconnecting; next attempt at ${formatTime(gateway.nextReconnectAt)}.` : "Reconnecting to OpenClaw Gateway.";
  if (gateway.stale) return gateway.lastErrorReason ? `OpenClaw Gateway stale: ${gateway.lastErrorReason}.` : "OpenClaw Gateway state is stale until reconnect.";
  if (gateway.lastErrorCategory && gateway.lastLiveEventAt) return `OpenClaw Gateway state is current. Last live event at ${formatTime(gateway.lastLiveEventAt)}. Last degraded category was ${gateway.lastErrorCategory}.`;
  if (gateway.lastErrorCategory) return `OpenClaw Gateway state is current. Last degraded category was ${gateway.lastErrorCategory}.`;
  if (gateway.lastLiveEventAt) return `OpenClaw Gateway state is current. Last live event at ${formatTime(gateway.lastLiveEventAt)}.`;
  return "OpenClaw Gateway state is current.";
}

function formatTime(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

export function AgentActivityCard(props: { agents: AgentActivity[]; collapsed: boolean; icon: IconToken; sectionRef?: RefObject<HTMLElement | null>; onToggleCollapsed: () => void }) {
  const Icon = iconFor(props.icon);
  const agents = useMemo(() => sortAgentsForDisplay(props.agents), [props.agents]);
  return (
    <section aria-label="Diagnostics card: Agent Activity. Status: info" className="diagnostic-card info" ref={props.sectionRef} tabIndex={0}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <DiagnosticsCardHeader title="Agent Activity" collapsed={props.collapsed} onToggle={props.onToggleCollapsed} />
        {!props.collapsed ? (
          <>
            {agents.length === 0 ? <p>No active agents recorded for this day.</p> : null}
            <ul className="agent-list">
              {agents.map((agent) => (
                <li key={agent.id}>
                  <strong>{agent.label}</strong>
                  <span>{agent.summary}</span>
                  {agent.status === "idle" ? <span>{formatInactiveDuration(agent.lastSeenAt)}</span> : null}
                  <StatusChip label={agent.label} status={agent.status} tone={agent.status === "working" ? "info" : "success"} />
                </li>
              ))}
            </ul>
          </>
        ) : <p className="collapsed-panel-copy">Collapsed.</p>}
      </div>
    </section>
  );
}

function sortAgentsForDisplay(agents: AgentActivity[]): AgentActivity[] {
  return agents
    .map((agent, index) => ({ agent, index }))
    .sort((left, right) => {
      const statusOrder = agentDisplayRank(left.agent) - agentDisplayRank(right.agent);
      if (statusOrder !== 0) return statusOrder;
      const lastSeenOrder = agentLastSeenMs(right.agent.lastSeenAt) - agentLastSeenMs(left.agent.lastSeenAt);
      return lastSeenOrder === 0 ? left.index - right.index : lastSeenOrder;
    })
    .map(({ agent }) => agent);
}

function agentDisplayRank(agent: AgentActivity): number {
  return agent.status === "working" ? 0 : 1;
}

function formatInactiveDuration(lastSeenAt: string | undefined): string {
  const lastSeenMs = agentLastSeenMs(lastSeenAt);
  if (!Number.isFinite(lastSeenMs)) return "Inactive time unavailable";
  const inactiveMinutes = Math.max(0, Math.floor((Date.now() - lastSeenMs) / 60_000));
  if (inactiveMinutes < 1) return "Inactive for less than 1m";
  const days = Math.floor(inactiveMinutes / 1_440);
  const hours = Math.floor((inactiveMinutes % 1_440) / 60);
  const minutes = inactiveMinutes % 60;
  if (days > 0) return `Inactive for ${days}d${hours > 0 ? ` ${hours}h` : ""}`;
  if (hours > 0) return `Inactive for ${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
  return `Inactive for ${minutes}m`;
}

function agentLastSeenMs(lastSeenAt: string | undefined): number {
  const parsed = Date.parse(lastSeenAt ?? "");
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function RecentToolsCard(props: {
  collapsed: boolean;
  count: number;
  icon: IconToken;
  inputRef: RefObject<HTMLInputElement | null>;
  showToolCalls: boolean;
  onShowToolCallsChange: (show: boolean) => void;
  onToggleCollapsed: () => void;
}) {
  const Icon = iconFor(props.icon);
  const toolEventLabel = `${props.count} tool ${props.count === 1 ? "event" : "events"}`;
  return (
    <section aria-label="Diagnostics card: Recent Tools. Status: info" className="diagnostic-card info" tabIndex={0}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <DiagnosticsCardHeader
          title="Recent Tools"
          collapsed={props.collapsed}
          cue={props.collapsed && props.count > 0 ? (
            <span aria-label={toolEventLabel} className="tool-event-flag">
              <Wrench size={14} aria-hidden="true" />
              {props.count}
            </span>
          ) : null}
          onToggle={props.onToggleCollapsed}
        />
        {!props.collapsed ? (
          <>
            <p>{props.count} tool result in today's page.</p>
            <label className="switch-row">
              <span>Show Tool Calls</span>
              <input aria-label="Show Tool Calls" checked={props.showToolCalls} ref={props.inputRef} type="checkbox" onChange={(event) => props.onShowToolCallsChange(event.target.checked)} />
            </label>
            <StatusChip label="Recent Tools" status="info" tone="info" />
          </>
        ) : props.count > 0 ? (
          <p className="tool-collapsed-summary">
            <Wrench size={14} aria-hidden="true" />
            {toolEventLabel}
          </p>
        ) : <p className="collapsed-panel-copy">Collapsed.</p>}
      </div>
    </section>
  );
}

export function PendingApprovalsCard(props: {
  approvalButtonRef: RefObject<HTMLButtonElement | null>;
  approvals: ApprovalView[];
  choices: Record<string, ApprovalChoice>;
  collapsed: boolean;
  icon: IconToken;
  open: boolean;
  sectionRef?: RefObject<HTMLElement | null>;
  pendingCount: number;
  onChoiceChange: (approvalId: string, choice: ApprovalChoice) => void;
  onClose: () => void;
  onJumpToFirstApproval: () => void;
  onSubmit: () => void;
  onToggle: () => void;
  onToggleCollapsed: () => void;
}) {
  const Icon = iconFor(props.icon);
  const tone = props.pendingCount > 0 ? "warning" : "success";
  const approvalRequestLabel = `${props.pendingCount} pending approval ${props.pendingCount === 1 ? "request" : "requests"}`;
  return (
    <div className="approval-popover-wrap">
      <section aria-label={`Diagnostics card: Pending approvals. Status: ${props.pendingCount > 0 ? "pending" : "info"}`} className={`diagnostic-card ${tone}`} ref={props.sectionRef} tabIndex={0}>
        <Icon size={22} aria-hidden="true" />
        <div>
          <DiagnosticsCardHeader
            title="Pending approvals"
            collapsed={props.collapsed}
            cue={props.pendingCount > 0 ? (
              <span aria-label={approvalRequestLabel} className="approval-pending-flag">
                <Flag size={14} aria-hidden="true" />
                {props.pendingCount}
              </span>
            ) : null}
            onToggle={props.onToggleCollapsed}
          />
          {!props.collapsed ? (
            <>
              <p>{props.pendingCount} pending approvals</p>
              <StatusChip label="Pending approvals" status={props.pendingCount > 0 ? "pending" : "info"} tone={tone} />
              <div className="approval-actions">
                <button aria-controls="pending-approvals-popover" aria-expanded={props.open} ref={props.approvalButtonRef} type="button" onClick={props.onToggle}>
                  Review approvals
                </button>
                {props.pendingCount > 0 ? (
                  <button type="button" onClick={props.onJumpToFirstApproval}>
                    Jump to first pending approval
                  </button>
                ) : null}
              </div>
            </>
          ) : props.pendingCount > 0 ? (
            <p className="approval-collapsed-summary">
              <Flag size={14} aria-hidden="true" />
              {approvalRequestLabel}
            </p>
          ) : <p className="collapsed-panel-copy">Collapsed.</p>}
        </div>
      </section>
      <section className="approval-popover" hidden={!props.open} id="pending-approvals-popover" role="region" aria-label="Pending approvals review">
        <header>
          <h3>Pending approvals</h3>
          <button type="button" onClick={props.onClose}>
            Close
          </button>
        </header>
        {props.approvals.length === 0 ? <p>No approvals waiting.</p> : null}
        {props.approvals.map((approval) => (
          <fieldset key={approval.id}>
            <legend>{approval.title}</legend>
            <p>{approval.command || "No command provided."}</p>
            <label>
              <input checked={props.choices[approval.id] === "approve"} name={`approval-${approval.id}`} type="radio" onChange={() => props.onChoiceChange(approval.id, "approve")} />
              Approve
              <span className="visually-hidden"> {approval.id}</span>
            </label>
            <label>
              <input checked={props.choices[approval.id] === "disapprove"} name={`approval-${approval.id}`} type="radio" onChange={() => props.onChoiceChange(approval.id, "disapprove")} />
              Disapprove
              <span className="visually-hidden"> {approval.id}</span>
            </label>
            <label>
              <input checked={(props.choices[approval.id] ?? "defer") === "defer"} name={`approval-${approval.id}`} type="radio" onChange={() => props.onChoiceChange(approval.id, "defer")} />
              Defer
              <span className="visually-hidden"> {approval.id}</span>
            </label>
          </fieldset>
        ))}
        <button type="button" onClick={props.onSubmit}>
          Submit approval decisions
        </button>
      </section>
    </div>
  );
}

export function DiagnosticsCard(props: {
  body: string;
  collapsed: boolean;
  icon: IconToken;
  label: string;
  meta?: string;
  onToggleCollapsed: () => void;
  sectionRef?: RefObject<HTMLElement | null>;
  status: string;
  title: string;
  tone: "success" | "info" | "warning" | "danger";
}) {
  const Icon = iconFor(props.icon);
  return (
    <section aria-label={`Diagnostics card: ${props.label}. Status: ${props.status}`} className={`diagnostic-card ${props.tone}`} ref={props.sectionRef} tabIndex={0}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <DiagnosticsCardHeader title={props.title} collapsed={props.collapsed} onToggle={props.onToggleCollapsed} />
        {!props.collapsed ? (
          <>
            <p>{props.body}</p>
            {props.meta ? <small>{props.meta}</small> : null}
            <StatusChip label={props.label} status={props.status} tone={props.tone} />
          </>
        ) : <p className="collapsed-panel-copy">Collapsed.</p>}
      </div>
    </section>
  );
}

function DiagnosticsCardHeader(props: { collapsed: boolean; cue?: ReactNode; onToggle: () => void; title: string }) {
  return (
    <div className="diagnostic-card-header">
      <div className="diagnostic-card-heading">
        <h3>{props.title}</h3>
        {props.cue}
      </div>
      <button type="button" onClick={props.onToggle}>
        {props.collapsed ? "Expand" : "Collapse"}
      </button>
    </div>
  );
}

export function ShortcutsHelp(props: { open: boolean; onClose: () => void }) {
  return (
    <section className="shortcuts-panel" hidden={!props.open} aria-label="Keyboard shortcuts" role="region">
      <div>
        <HelpCircle size={20} aria-hidden="true" />
        <h2>Keyboard shortcuts</h2>
      </div>
      <dl>
        <dt>/</dt>
        <dd>Focus composer</dd>
        <dt>?</dt>
        <dd>Toggle this help panel</dd>
        <dt>Arrow Up/Down</dt>
        <dd>Move between timeline entries after focusing the timeline</dd>
        <dt>Enter</dt>
        <dd>Open focused event details</dd>
        <dt>Alt+E</dt>
        <dd>Jump to next error entry</dd>
        <dt>Alt+A</dt>
        <dd>Jump to next approval entry</dd>
        <dt>Alt+T</dt>
        <dd>Jump to next tool result entry</dd>
        <dt>Alt+C</dt>
        <dd>Return focus to the composer</dd>
        <dt>Alt+S</dt>
        <dd>Focus journal search</dd>
        <dt>Escape</dt>
        <dd>Close this panel</dd>
      </dl>
      <button type="button" onClick={props.onClose}>
        Close shortcuts
      </button>
    </section>
  );
}

export function SkipLink() {
  return (
    <a className="skip-link" href="#main-content">
      Skip to main content
    </a>
  );
}

export function LiveEventToastStack(props: { toasts: LiveEventToast[]; onToastClick: (toast: LiveEventToast) => void }) {
  if (props.toasts.length === 0) return null;
  return (
    <div className="live-toast-stack" aria-live="polite">
      {props.toasts.slice(0, 3).map((toast) => (
        <button key={toast.id} type="button" onClick={() => props.onToastClick(toast)}>
          {toast.label}
        </button>
      ))}
    </div>
  );
}

export function VisuallyHidden(props: { children: React.ReactNode }) {
  return <span className="visually-hidden">{props.children}</span>;
}

function BrandMark(props: { compact?: boolean; theme: Theme; onClick?: () => void }) {
  const Icon = iconFor(props.theme.icons.brand);
  return (
    <div className={props.compact ? "brand-row compact" : "brand-row"}>
      <Icon size={28} aria-hidden="true" />
      <div>
        <h1>{props.compact ? <button className="brand-link" type="button" onClick={props.onClick}>{props.theme.labels.productTitle}</button> : props.theme.labels.productTitle}</h1>
        {props.compact ? null : props.theme.labels.productSubtitle ? <p>{props.theme.labels.productSubtitle}</p> : <p>{props.theme.labels.archiveTitle}</p>}
      </div>
    </div>
  );
}
