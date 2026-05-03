import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import type React from "react";
import {
  AlertTriangle,
  AtSign,
  Download,
  FileText,
  Hash,
  HelpCircle,
  Paperclip,
  Plus,
  Search,
  Settings,
  Send,
  SlidersHorizontal
} from "lucide-react";
import {
  buildTimelineDisplayItems,
  displayProductCopy,
  entryBelongsToGroup,
  formatTimelineGroupSummary,
  getTheme,
  themeGroups,
  sampleJournalDay,
  type AgentActivity,
  type ApprovalView,
  type IconToken,
  type JournalDay,
  type JournalEntry,
  type OpenClogTheme,
  type ThemeFamily,
  type TimelineDisplayItem,
  type ThemeId
} from "@openclog/core";
import { iconFor } from "./icons.js";
import { timelineDisplayText } from "./event-display.js";
import { StatusChip } from "./StatusChip.js";
import { themeVars } from "./theme-style.js";

export type Theme = OpenClogTheme;

export interface GatewayViewState {
  status: "ready" | "blocked" | "degraded";
  missingScopes: string[];
  stale: boolean;
}

export type ApprovalChoice = "approve" | "disapprove" | "defer";

export interface LiveEventToast {
  dayKey: string;
  entryId: string;
  id: string;
  kind: JournalEntry["kind"];
  label: string;
}

interface AppShellProps {
  children: React.ReactNode;
  day: JournalDay;
  days: Array<Omit<JournalDay, "entries">>;
  diagnosticsProps: Omit<DiagnosticsPanelProps, "day" | "gateway" | "theme">;
  gateway: GatewayViewState;
  liveEventToasts: LiveEventToast[];
  shortcutsOpen: boolean;
  shellActionStatus: string;
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  mainRef: RefObject<HTMLElement | null>;
  themeSelectorRef: RefObject<HTMLSelectElement | null>;
  onAgentActivityFocus: () => void;
  onApprovalsFocus: () => void;
  onComposerFocus: () => void;
  onDaySelect: (dayKey: string) => void;
  onGatewayFocus: () => void;
  onMainFocus: () => void;
  onShortcutsToggle: () => void;
  onShortcutsClose: () => void;
  onThemeChange: (themeId: ThemeId) => void;
  onThemeFamilySelect: (family: ThemeFamily) => void;
  onThemeFocus: () => void;
  onTimelineFocus: () => void;
  onToolFilterFocus: () => void;
  onToastClick: (toast: LiveEventToast) => void;
}

export function AppShell(props: AppShellProps) {
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
      data-theme={props.themeId}
      data-theme-use-case={props.theme.useCase}
      data-timeline-layout={props.theme.timelineLayoutMode}
      data-timeline-style={props.theme.timelineStyle}
      style={themeVars(props.theme)}
    >
      <SkipLink />
      <header className="app-header" aria-label="OpenClog operator shell">
        <TopAppBar
          theme={props.theme}
          onComposerFocus={props.onComposerFocus}
          onGatewayFocus={props.onGatewayFocus}
          onMainFocus={props.onMainFocus}
          onShortcutsToggle={props.onShortcutsToggle}
          onThemeFocus={props.onThemeFocus}
          onTimelineFocus={props.onTimelineFocus}
          onToolFilterFocus={props.onToolFilterFocus}
          shellActionStatus={props.shellActionStatus}
        />
      </header>
      <Sidebar
        days={props.days}
        selectedDayKey={props.day.dayKey}
        theme={props.theme}
        themeId={props.themeId}
        themeIds={props.themeIds}
        themeSelectorRef={props.themeSelectorRef}
        onDaySelect={props.onDaySelect}
        onAgentActivityFocus={props.onAgentActivityFocus}
        onApprovalsFocus={props.onApprovalsFocus}
        onGatewayFocus={props.onGatewayFocus}
        onNewEntry={props.onComposerFocus}
        onThemeFamilySelect={props.onThemeFamilySelect}
        onThemeChange={props.onThemeChange}
      />
      <main id="main-content" className="journal-page" aria-label="Daily page" data-theme={props.themeId} ref={props.mainRef} tabIndex={-1}>
        {props.children}
      </main>
      <DiagnosticsPanel {...props.diagnosticsProps} day={props.day} gateway={props.gateway} theme={props.theme} />
      <ShortcutsHelp open={props.shortcutsOpen} onClose={props.onShortcutsClose} />
      <LiveEventToastStack toasts={props.liveEventToasts} onToastClick={props.onToastClick} />
    </div>
  );
}

function TopAppBar(props: {
  theme: Theme;
  onComposerFocus: () => void;
  onGatewayFocus: () => void;
  onMainFocus: () => void;
  onShortcutsToggle: () => void;
  onThemeFocus: () => void;
  onTimelineFocus: () => void;
  onToolFilterFocus: () => void;
  shellActionStatus: string;
}) {
  const navItems = [
    { label: "Journal", onClick: props.onMainFocus },
    { label: "Command", onClick: props.onComposerFocus },
    { label: "Network", onClick: props.onGatewayFocus },
    { label: "Logs", onClick: props.onTimelineFocus }
  ];
  const utilityItems = [
    { label: "Settings", icon: Settings, onClick: props.onThemeFocus },
    { label: "Tool filter settings", icon: SlidersHorizontal, onClick: props.onToolFilterFocus },
    { label: "Keyboard shortcuts", icon: HelpCircle, onClick: props.onShortcutsToggle }
  ];
  return (
    <div className="top-app-bar">
      <BrandMark theme={props.theme} compact />
      <nav aria-label="Primary shell navigation" className="top-nav">
        {navItems.map((item) => (
          <button key={item.label} type="button" onClick={item.onClick}>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="top-utility" aria-label="Shell utilities">
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
        <OperatorAvatar />
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
  days: Array<Omit<JournalDay, "entries">>;
  selectedDayKey: string;
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  themeSelectorRef: RefObject<HTMLSelectElement | null>;
  onAgentActivityFocus: () => void;
  onApprovalsFocus: () => void;
  onDaySelect: (dayKey: string) => void;
  onGatewayFocus: () => void;
  onNewEntry: () => void;
  onThemeFamilySelect: (family: ThemeFamily) => void;
  onThemeChange: (themeId: ThemeId) => void;
}) {
  return (
    <aside className="sidebar left-rail" aria-label={props.theme.labels.archiveTitle}>
      <OperatorConsoleHeader onNewEntry={props.onNewEntry} />
      <RailGroupNav activeFamily={props.theme.family} onThemeFamilySelect={props.onThemeFamilySelect} />
      <label className="search-box">
        <Search size={18} aria-hidden="true" />
        <input aria-label="Search days" placeholder="Search days" />
      </label>
      <DayArchive days={props.days} selectedDayKey={props.selectedDayKey} theme={props.theme} onDaySelect={props.onDaySelect} />
      <ThemeSelector selectRef={props.themeSelectorRef} theme={props.theme} themeId={props.themeId} themeIds={props.themeIds} onThemeChange={props.onThemeChange} />
      {props.theme.labels.statusFooter ? <p className="theme-footer">{props.theme.labels.statusFooter}</p> : null}
      <RailSystemShortcuts onAgentActivityFocus={props.onAgentActivityFocus} onApprovalsFocus={props.onApprovalsFocus} onGatewayFocus={props.onGatewayFocus} />
    </aside>
  );
}

function OperatorConsoleHeader(props: { onNewEntry: () => void }) {
  return (
    <div className="operator-console">
      <strong>Operator Console</strong>
      <p>Station 04-B</p>
      <button type="button" onClick={props.onNewEntry}>
        <Plus size={18} aria-hidden="true" />
        New Entry
      </button>
    </div>
  );
}

const familyShortcutIcons = {
  accessibility: HelpCircle,
  core: FileText,
  "news-media": Hash,
  "os-desktop": Settings,
  "social-community": AtSign
} satisfies Record<ThemeFamily, typeof FileText>;

function RailGroupNav(props: { activeFamily: ThemeFamily; onThemeFamilySelect: (family: ThemeFamily) => void }) {
  return (
    <nav className="rail-group-nav" aria-label="Family shortcuts">
      <p>Groups</p>
      {themeGroups.map((group) => {
        const Icon = familyShortcutIcons[group.family];
        const active = group.family === props.activeFamily;
        return (
          <button
            aria-pressed={active}
            key={group.label}
            className={active ? "active" : undefined}
            type="button"
            onClick={() => props.onThemeFamilySelect(group.family)}
          >
            <Icon size={18} aria-hidden="true" />
            {familyShortcutLabel(group.family)}
          </button>
        );
      })}
    </nav>
  );
}

function familyShortcutLabel(family: ThemeFamily): string {
  if (family === "news-media") return "News";
  if (family === "social-community") return "Social";
  if (family === "os-desktop") return "OS";
  if (family === "accessibility") return "Accessibility";
  return "Core";
}

function RailSystemShortcuts(props: { onAgentActivityFocus: () => void; onApprovalsFocus: () => void; onGatewayFocus: () => void }) {
  const shortcuts = [
    { label: "Network", icon: Hash, onClick: props.onGatewayFocus },
    { label: "Monitors", icon: SlidersHorizontal, onClick: props.onAgentActivityFocus },
    { label: "Security", icon: AlertTriangle, onClick: props.onApprovalsFocus }
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
  days: Array<Omit<JournalDay, "entries">>;
  selectedDayKey: string;
  theme: Theme;
  onDaySelect: (dayKey: string) => void;
}) {
  const items = props.days.length > 0 ? props.days : [sampleJournalDay];
  return (
    <nav className="day-list" aria-label={props.theme.labels.archiveTitle}>
      {items.map((item) => {
        const selected = item.dayKey === props.selectedDayKey;
        const title = displayProductCopy(item.title);
        return (
        <button
          aria-current={selected ? "date" : undefined}
          aria-label={`${item.dateLabel}. ${title}. ${selected ? props.theme.labels.selectedDayStatus : "Archived day"}. ${item.metrics.errorCount > 0 ? "Status: degraded" : "Status: active"}`}
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
        </button>
        );
      })}
    </nav>
  );
}

export function ThemeSelector(props: {
  selectRef?: RefObject<HTMLSelectElement | null>;
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  onThemeChange: (themeId: ThemeId) => void;
}) {
  return (
    <label className="theme-picker">
      <span>Theme picker: {props.theme.labels.themeLabel}</span>
      <select aria-label="Theme" ref={props.selectRef} value={props.themeId} onChange={(event) => props.onThemeChange(event.target.value as ThemeId)}>
        {themeGroups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.themeIds.map((id) => (
              <option key={id} value={id}>
                {getTheme(id).displayName}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

export function Composer(props: {
  composer: string;
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
          <button type="button" onClick={props.onSend}>
            <Send size={18} aria-hidden="true" />
            {props.theme.labels.send}
          </button>
        </div>
      </div>
      <p aria-live="polite" className={props.notice.includes("blocked") || props.notice.includes("Command") ? "notice warning" : "notice"}>
        {props.notice}
      </p>
    </section>
  );
}

export function GatewayReadinessBanner(props: { gateway: GatewayViewState; theme: Theme }) {
  const status = props.gateway.status === "ready" && !props.gateway.stale ? "success" : props.gateway.status === "blocked" ? "danger" : "warning";
  return (
    <section className={`readiness-banner ${status}`} aria-label={`Gateway readiness: ${props.gateway.status}`} aria-live="polite">
      <StatusChip label="Gateway readiness" status={props.gateway.status} tone={status} />
      <p>
        {props.gateway.status === "ready"
          ? "OpenClaw Gateway ready with required operator scopes."
          : props.gateway.stale
            ? "OpenClaw Gateway state is stale or degraded."
            : "OpenClaw Gateway is missing required operator scopes."}
      </p>
    </section>
  );
}

export function DayHeader(props: { day: JournalDay; theme: Theme; onExport: () => void }) {
  return (
    <header className="day-header">
      <div>
        <p>{props.day.dateLabel}</p>
        <h2>{props.theme.labels.mainTitle}</h2>
        {props.theme.labels.productSubtitle ? <p className="theme-subtitle">{props.theme.labels.productSubtitle}</p> : null}
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
  targetEntryId: string | null;
  timelineRef: RefObject<HTMLOListElement | null>;
  onGroupedChange: (grouped: boolean) => void;
  onTargetHandled: () => void;
  onToggleEntry: (entryId: string) => void;
}) {
  const { day, expandedEntryId, grouped, targetEntryId, timelineRef, onGroupedChange, onTargetHandled, onToggleEntry } = props;
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
  day: JournalDay;
  gatewayCardRef: RefObject<HTMLElement | null>;
  gateway: GatewayViewState;
  showToolCalls: boolean;
  toolFilterRef: RefObject<HTMLInputElement | null>;
  theme: Theme;
  onApprovalChoiceChange: (approvalId: string, choice: ApprovalChoice) => void;
  onApprovalSubmit: () => void;
  onCloseApprovals: () => void;
  onJumpToFirstApproval: () => void;
  onShowToolCallsChange: (show: boolean) => void;
  onToggleApprovals: () => void;
}

export function DiagnosticsPanel(props: DiagnosticsPanelProps) {
  const gatewayTone = props.gateway.status === "ready" && !props.gateway.stale ? "success" : props.gateway.status === "blocked" ? "danger" : "warning";
  return (
    <aside className="sidebar right-rail" aria-label={props.theme.labels.diagnosticsTitle}>
      <h2>{props.theme.labels.diagnosticsTitle}</h2>
      <DiagnosticsCard
        body={props.gateway.stale ? "OpenClaw Gateway state is stale until reconnect." : "OpenClaw Gateway state is current."}
        icon={props.theme.icons.gateway}
        label="Gateway"
        meta={props.gateway.missingScopes.length > 0 ? `Missing scopes: ${props.gateway.missingScopes.join(", ")}` : "All required scopes negotiated"}
        sectionRef={props.gatewayCardRef}
        status={props.gateway.status}
        title={`Gateway ${props.gateway.status}`}
        tone={gatewayTone}
      />
      <AgentActivityCard agents={props.agentActivity} icon={props.theme.icons.activity} sectionRef={props.agentActivityCardRef} />
      <RecentToolsCard count={props.day.metrics.toolCallCount} icon={props.theme.icons.tools} inputRef={props.toolFilterRef} showToolCalls={props.showToolCalls} onShowToolCallsChange={props.onShowToolCallsChange} />
      <PendingApprovalsCard
        approvalButtonRef={props.approvalButtonRef}
        approvals={props.approvals}
        choices={props.approvalChoices}
        icon={props.theme.icons.approvals}
        open={props.approvalsOpen}
        sectionRef={props.approvalsCardRef}
        pendingCount={props.approvals.length}
        onChoiceChange={props.onApprovalChoiceChange}
        onClose={props.onCloseApprovals}
        onJumpToFirstApproval={props.onJumpToFirstApproval}
        onSubmit={props.onApprovalSubmit}
        onToggle={props.onToggleApprovals}
      />
    </aside>
  );
}

export function AgentActivityCard(props: { agents: AgentActivity[]; icon: IconToken; sectionRef?: RefObject<HTMLElement | null> }) {
  const Icon = iconFor(props.icon);
  const agents = useMemo(() => sortAgentsForDisplay(props.agents), [props.agents]);
  return (
    <section aria-label="Diagnostics card: Agent Activity. Status: info" className="diagnostic-card info" ref={props.sectionRef} tabIndex={0}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <h3>Agent Activity</h3>
        {agents.length === 0 ? <p>No agent activity for this day.</p> : null}
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
  count: number;
  icon: IconToken;
  inputRef: RefObject<HTMLInputElement | null>;
  showToolCalls: boolean;
  onShowToolCallsChange: (show: boolean) => void;
}) {
  const Icon = iconFor(props.icon);
  return (
    <section aria-label="Diagnostics card: Recent Tools. Status: info" className="diagnostic-card info" tabIndex={0}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <h3>Recent Tools</h3>
        <p>{props.count} tool result in today's page.</p>
        <label className="switch-row">
          <span>Show Tool Calls</span>
          <input aria-label="Show Tool Calls" checked={props.showToolCalls} ref={props.inputRef} type="checkbox" onChange={(event) => props.onShowToolCallsChange(event.target.checked)} />
        </label>
        <StatusChip label="Recent Tools" status="info" tone="info" />
      </div>
    </section>
  );
}

export function PendingApprovalsCard(props: {
  approvalButtonRef: RefObject<HTMLButtonElement | null>;
  approvals: ApprovalView[];
  choices: Record<string, ApprovalChoice>;
  icon: IconToken;
  open: boolean;
  sectionRef?: RefObject<HTMLElement | null>;
  pendingCount: number;
  onChoiceChange: (approvalId: string, choice: ApprovalChoice) => void;
  onClose: () => void;
  onJumpToFirstApproval: () => void;
  onSubmit: () => void;
  onToggle: () => void;
}) {
  const Icon = iconFor(props.icon);
  const tone = props.pendingCount > 0 ? "warning" : "success";
  return (
    <div className="approval-popover-wrap">
      <section aria-label={`Diagnostics card: Pending approvals. Status: ${props.pendingCount > 0 ? "pending" : "info"}`} className={`diagnostic-card ${tone}`} ref={props.sectionRef} tabIndex={0}>
        <Icon size={22} aria-hidden="true" />
        <div>
          <h3>Pending approvals</h3>
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
  icon: IconToken;
  label: string;
  meta?: string;
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
        <h3>{props.title}</h3>
        <p>{props.body}</p>
        {props.meta ? <small>{props.meta}</small> : null}
        <StatusChip label={props.label} status={props.status} tone={props.tone} />
      </div>
    </section>
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

function BrandMark(props: { compact?: boolean; theme: Theme }) {
  const Icon = iconFor(props.theme.icons.brand);
  return (
    <div className={props.compact ? "brand-row compact" : "brand-row"}>
      <Icon size={28} aria-hidden="true" />
      <div>
        <h1>{props.theme.labels.productTitle}</h1>
        {props.compact ? null : props.theme.labels.productSubtitle ? <p>{props.theme.labels.productSubtitle}</p> : <p>{props.theme.labels.archiveTitle}</p>}
      </div>
    </div>
  );
}
