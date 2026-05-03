import type React from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Radio,
  Search,
  Send,
  ShieldAlert,
  Wrench,
  XCircle
} from "lucide-react";
import { getTheme, sampleJournalDay, type JournalDay, type ThemeId } from "@openclog/core";

type Theme = ReturnType<typeof getTheme>;

export interface GatewayViewState {
  status: "ready" | "blocked" | "degraded";
  missingScopes: string[];
  stale: boolean;
}

export function LeftRail(props: {
  days: Array<Omit<JournalDay, "entries">>;
  theme: Theme;
  themeId: ThemeId;
  themeIds: ThemeId[];
  onThemeChange: (themeId: ThemeId) => void;
}) {
  return (
    <aside className="sidebar left-rail" aria-label={props.theme.labels.archiveTitle}>
      <div className="brand-row">
        <BookOpen size={24} aria-hidden="true" />
        <div>
          <h1>{props.theme.labels.appTitle}</h1>
          <p>{props.theme.labels.archiveTitle}</p>
        </div>
      </div>
      <label className="search-box">
        <Search size={16} aria-hidden="true" />
        <input aria-label="Search days" placeholder="Search days" />
      </label>
      <nav className="day-list" aria-label="Day archive">
        {(props.days.length > 0 ? props.days : [sampleJournalDay]).map((item) => (
          <button className="day-row selected" key={item.dayKey} type="button">
            <span>{item.dateLabel}</span>
            <strong>{item.title}</strong>
            <small>{item.metrics.errorCount > 0 ? "Degraded" : "Active"}</small>
          </button>
        ))}
      </nav>
      <label className="theme-picker">
        <span>Theme</span>
        <select aria-label="Theme" value={props.themeId} onChange={(event) => props.onThemeChange(event.target.value as ThemeId)}>
          {props.themeIds.map((id) => (
            <option key={id} value={id}>
              {getTheme(id).name}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}

export function ComposerPanel(props: {
  composer: string;
  notice: string;
  theme: Theme;
  onComposerChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="composer">
      <label>
        <span>{props.theme.labels.composerPrompt}</span>
        <div className="composer-row">
          <input
            aria-label="Composer input"
            value={props.composer}
            onChange={(event) => props.onComposerChange(event.target.value)}
            placeholder="Ask OpenClaw or write something..."
          />
          <button type="button" onClick={props.onSend}>
            <Send size={18} aria-hidden="true" />
            Send
          </button>
        </div>
      </label>
      <p className={props.notice.includes("blocked") || props.notice.includes("Command") ? "notice warning" : "notice"}>{props.notice}</p>
    </div>
  );
}

export function DailyPage(props: { composer: React.ReactNode; day: JournalDay; theme: Theme; onExport: () => void }) {
  return (
    <section className="journal-page" aria-label="Daily page">
      {props.composer}
      <header className="day-header">
        <div>
          <p>{props.day.dateLabel}</p>
          <h2>{props.theme.labels.todayTitle}</h2>
        </div>
        <button type="button" onClick={props.onExport}>
          <Download size={18} aria-hidden="true" />
          Export day
        </button>
      </header>
      <p className="summary">{props.day.summary}</p>
      <Timeline day={props.day} />
    </section>
  );
}

export function DiagnosticsRail(props: { day: JournalDay; gateway: GatewayViewState; theme: Theme }) {
  return (
    <aside className="sidebar right-rail" aria-label={props.theme.labels.diagnosticsTitle}>
      <h2>{props.theme.labels.diagnosticsTitle}</h2>
      <section className="diagnostic-card alert">
        <ShieldAlert size={20} aria-hidden="true" />
        <div>
          <h3>Gateway {props.gateway.status}</h3>
          <p>{props.gateway.stale ? "State is stale until Gateway reconnects." : "Gateway state is current."}</p>
          <small>{props.gateway.missingScopes.join(", ") || "All required scopes negotiated"}</small>
        </div>
      </section>
      <section className="diagnostic-card">
        <Radio size={20} aria-hidden="true" />
        <div>
          <h3>Agent Activity</h3>
          <p>{props.day.metrics.sessionCount} active session tracked locally.</p>
        </div>
      </section>
      <section className="diagnostic-card">
        <Wrench size={20} aria-hidden="true" />
        <div>
          <h3>Recent Tools</h3>
          <p>{props.day.metrics.toolCallCount} tool result in today's page.</p>
        </div>
      </section>
      <section className="diagnostic-card approval">
        {props.day.metrics.approvalCount > 0 ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
        <div>
          <h3>Pending approvals</h3>
          <p>{props.day.metrics.approvalCount} approval surface remains visible in every theme.</p>
        </div>
      </section>
    </aside>
  );
}

export function themeVars(theme: Theme): React.CSSProperties {
  return {
    "--app-bg": theme.palette.appBg,
    "--page-bg": theme.palette.pageBg,
    "--panel-bg": theme.palette.panelBg,
    "--card-bg": theme.palette.cardBg,
    "--text": theme.palette.text,
    "--muted": theme.palette.mutedText,
    "--border": theme.palette.border,
    "--accent": theme.palette.accent,
    "--accent-2": theme.palette.accent2,
    "--success": theme.palette.success,
    "--warning": theme.palette.warning,
    "--danger": theme.palette.danger
  } as React.CSSProperties;
}

function Timeline(props: { day: JournalDay }) {
  return (
    <ol className="timeline">
      {props.day.entries.map((entry) => (
        <li className={`entry-card ${entry.severity ?? "info"}`} key={entry.id}>
          <time>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
          <div className="entry-icon">{entry.severity === "warning" ? <AlertTriangle size={18} /> : <FileText size={18} />}</div>
          <div>
            <h3>{entry.title}</h3>
            <p>{entry.body}</p>
            {entry.toolName ? <small>{entry.toolName}</small> : null}
          </div>
          <span className="status-pill">{entry.status ?? "info"}</span>
        </li>
      ))}
    </ol>
  );
}
