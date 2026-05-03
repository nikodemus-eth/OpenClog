import { useEffect, useMemo, useRef, type RefObject } from "react";
import type React from "react";
import {
  AlertTriangle,
  Download,
  FileText,
  HelpCircle,
  Search,
  Send
} from "lucide-react";
import {
  getTheme,
  themeGroups,
  sampleJournalDay,
  type AgentActivity,
  type ApprovalView,
  type IconToken,
  type JournalDay,
  type JournalEntry,
  type OpenClogTheme,
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
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  onDaySelect: (dayKey: string) => void;
  onShortcutsClose: () => void;
  onThemeChange: (themeId: ThemeId) => void;
  onToastClick: (toast: LiveEventToast) => void;
}

export function AppShell(props: AppShellProps) {
  return (
    <div
      className="app-shell"
      data-accessibility-profile={props.theme.accessibilityProfile}
      data-card-style={props.theme.cardStyle}
      data-density={props.theme.density}
      data-diagnostics-style={props.theme.diagnosticsStyle}
      data-family={props.theme.family}
      data-motion={props.theme.motionProfile}
      data-theme={props.themeId}
      data-timeline-style={props.theme.timelineStyle}
      style={themeVars(props.theme)}
    >
      <SkipLink />
      <header className="app-header" aria-label="OpenClog identity">
        <BrandMark theme={props.theme} />
      </header>
      <Sidebar
        days={props.days}
        selectedDayKey={props.day.dayKey}
        theme={props.theme}
        themeId={props.themeId}
        themeIds={props.themeIds}
        onDaySelect={props.onDaySelect}
        onThemeChange={props.onThemeChange}
      />
      <main id="main-content" className="journal-page" aria-label="Daily page" data-theme={props.themeId} tabIndex={-1}>
        {props.children}
      </main>
      <DiagnosticsPanel {...props.diagnosticsProps} day={props.day} gateway={props.gateway} theme={props.theme} />
      <ShortcutsHelp open={props.shortcutsOpen} onClose={props.onShortcutsClose} />
      <LiveEventToastStack toasts={props.liveEventToasts} onToastClick={props.onToastClick} />
    </div>
  );
}

export function Sidebar(props: {
  days: Array<Omit<JournalDay, "entries">>;
  selectedDayKey: string;
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  onDaySelect: (dayKey: string) => void;
  onThemeChange: (themeId: ThemeId) => void;
}) {
  return (
    <aside className="sidebar left-rail" aria-label={props.theme.labels.archiveTitle}>
      <div className="sidebar-brand">
        <BrandMark theme={props.theme} />
      </div>
      <label className="search-box">
        <Search size={18} aria-hidden="true" />
        <input aria-label="Search days" placeholder="Search days" />
      </label>
      <DayArchive days={props.days} selectedDayKey={props.selectedDayKey} theme={props.theme} onDaySelect={props.onDaySelect} />
      <ThemeSelector theme={props.theme} themeId={props.themeId} themeIds={props.themeIds} onThemeChange={props.onThemeChange} />
      {props.theme.labels.statusFooter ? <p className="theme-footer">{props.theme.labels.statusFooter}</p> : null}
    </aside>
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
        return (
        <button
          aria-current={selected ? "date" : undefined}
          aria-label={`${item.dateLabel}. ${item.title}. ${selected ? props.theme.labels.selectedDayStatus : "Archived day"}. ${item.metrics.errorCount > 0 ? "Status: degraded" : "Status: active"}`}
          className={selected ? "day-row selected" : "day-row"}
          key={item.dayKey}
          onClick={() => props.onDaySelect(item.dayKey)}
          type="button"
        >
          <span>{item.dateLabel}</span>
          <strong>{item.title}</strong>
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
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  onThemeChange: (themeId: ThemeId) => void;
}) {
  return (
    <label className="theme-picker">
      <span>Theme picker: {props.theme.labels.themeLabel}</span>
      <select aria-label="Theme" value={props.themeId} onChange={(event) => props.onThemeChange(event.target.value as ThemeId)}>
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
  inputRef: React.RefObject<HTMLInputElement | null>;
  notice: string;
  theme: Theme;
  onComposerChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <section className="composer" aria-label="Composer">
      <label>
        <span>{props.theme.labels.composerPrompt}</span>
        <div className="composer-row">
          <input
            aria-label="Composer input"
            ref={props.inputRef}
            value={props.composer}
            onChange={(event) => props.onComposerChange(event.target.value)}
            placeholder="Ask OpenClog or write something..."
          />
          <button type="button" onClick={props.onSend}>
            <Send size={18} aria-hidden="true" />
            {props.theme.labels.send}
          </button>
        </div>
      </label>
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
  targetEntryId: string | null;
  onTargetHandled: () => void;
  onToggleEntry: (entryId: string) => void;
}) {
  const refs = useRef(new Map<string, HTMLDivElement>());
  const orderedEntries = useMemo(
    () =>
      props.day.entries
        .map((entry, index) => ({ entry, index }))
        .sort((left, right) => {
          const timestampOrder = Date.parse(right.entry.timestamp) - Date.parse(left.entry.timestamp);
          return timestampOrder === 0 ? left.index - right.index : timestampOrder;
        })
        .map(({ entry }) => entry),
    [props.day.entries]
  );
  const entryIds = useMemo(() => orderedEntries.map((entry) => entry.id), [orderedEntries]);

  useEffect(() => {
    if (!props.targetEntryId) return;
    const target = refs.current.get(props.targetEntryId);
    if (!target) return;
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    target.focus();
    props.onTargetHandled();
  }, [props.targetEntryId, props.onTargetHandled]);

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
      props.onToggleEntry(entry.id);
    }
  }

  return (
    <ol className="timeline" aria-label="Timeline entries" tabIndex={0} onKeyDown={handleTimelineKeyDown}>
      {orderedEntries.map((entry, index) => (
        <TimelineEntryCard
          entry={entry}
          expanded={props.expandedEntryId === entry.id}
          index={index}
          key={entry.id}
          setRef={(node) => {
            if (node) refs.current.set(entry.id, node);
            else refs.current.delete(entry.id);
          }}
          onKeyDown={(event) => handleEntryKeyDown(event, entry, index)}
          onToggle={() => props.onToggleEntry(entry.id)}
        />
      ))}
    </ol>
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
        aria-label={`Timeline entry ${props.index + 1}: ${props.entry.title}. Status: ${props.entry.status ?? "info"}`}
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
          <h3>{props.entry.title}</h3>
          <p>{display.body}</p>
          {display.hasMore ? <small>Preview shown. Open this entry for the full redacted text.</small> : null}
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
  approvals: ApprovalView[];
  approvalsOpen: boolean;
  approvalButtonRef: RefObject<HTMLButtonElement | null>;
  approvalChoices: Record<string, ApprovalChoice>;
  day: JournalDay;
  gateway: GatewayViewState;
  showToolCalls: boolean;
  theme: Theme;
  onApprovalChoiceChange: (approvalId: string, choice: ApprovalChoice) => void;
  onApprovalSubmit: () => void;
  onCloseApprovals: () => void;
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
        status={props.gateway.status}
        title={`Gateway ${props.gateway.status}`}
        tone={gatewayTone}
      />
      <AgentActivityCard agents={props.agentActivity} icon={props.theme.icons.activity} />
      <RecentToolsCard count={props.day.metrics.toolCallCount} icon={props.theme.icons.tools} showToolCalls={props.showToolCalls} onShowToolCallsChange={props.onShowToolCallsChange} />
      <PendingApprovalsCard
        approvalButtonRef={props.approvalButtonRef}
        approvals={props.approvals}
        choices={props.approvalChoices}
        icon={props.theme.icons.approvals}
        open={props.approvalsOpen}
        pendingCount={props.approvals.length}
        onChoiceChange={props.onApprovalChoiceChange}
        onClose={props.onCloseApprovals}
        onSubmit={props.onApprovalSubmit}
        onToggle={props.onToggleApprovals}
      />
    </aside>
  );
}

export function AgentActivityCard(props: { agents: AgentActivity[]; icon: IconToken }) {
  const Icon = iconFor(props.icon);
  const agents = useMemo(() => sortAgentsForDisplay(props.agents), [props.agents]);
  return (
    <section aria-label="Diagnostics card: Agent Activity. Status: info" className="diagnostic-card info" tabIndex={0}>
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

export function RecentToolsCard(props: { count: number; icon: IconToken; showToolCalls: boolean; onShowToolCallsChange: (show: boolean) => void }) {
  const Icon = iconFor(props.icon);
  return (
    <section aria-label="Diagnostics card: Recent Tools. Status: info" className="diagnostic-card info" tabIndex={0}>
      <Icon size={22} aria-hidden="true" />
      <div>
        <h3>Recent Tools</h3>
        <p>{props.count} tool result in today's page.</p>
        <label className="switch-row">
          <span>Show Tool Calls</span>
          <input aria-label="Show Tool Calls" checked={props.showToolCalls} type="checkbox" onChange={(event) => props.onShowToolCallsChange(event.target.checked)} />
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
  pendingCount: number;
  onChoiceChange: (approvalId: string, choice: ApprovalChoice) => void;
  onClose: () => void;
  onSubmit: () => void;
  onToggle: () => void;
}) {
  const Icon = iconFor(props.icon);
  const tone = props.pendingCount > 0 ? "warning" : "success";
  return (
    <div className="approval-popover-wrap">
      <button
        aria-controls="pending-approvals-popover"
        aria-expanded={props.open}
        aria-label={`Pending approvals. ${props.pendingCount} pending approvals`}
        className={`diagnostic-card diagnostic-button ${tone}`}
        onClick={props.onToggle}
        ref={props.approvalButtonRef}
        type="button"
      >
        <Icon size={22} aria-hidden="true" />
        <span>
          <h3>Pending approvals</h3>
          <p>{props.pendingCount} pending approvals</p>
          <StatusChip label="Pending approvals" status={props.pendingCount > 0 ? "pending" : "info"} tone={tone} />
        </span>
      </button>
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
  status: string;
  title: string;
  tone: "success" | "info" | "warning" | "danger";
}) {
  const Icon = iconFor(props.icon);
  return (
    <section aria-label={`Diagnostics card: ${props.label}. Status: ${props.status}`} className={`diagnostic-card ${props.tone}`} tabIndex={0}>
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

function BrandMark(props: { theme: Theme }) {
  const Icon = iconFor(props.theme.icons.brand);
  return (
    <div className="brand-row">
      <Icon size={28} aria-hidden="true" />
      <div>
        <h1>{props.theme.labels.productTitle}</h1>
        {props.theme.labels.productSubtitle ? <p>{props.theme.labels.productSubtitle}</p> : <p>{props.theme.labels.archiveTitle}</p>}
      </div>
    </div>
  );
}
