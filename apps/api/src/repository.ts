import { DatabaseSync } from "node:sqlite";
import type { JournalDay, JournalEntry, PersistableRedactedEvent } from "@openclog/core";
import { sampleJournalDay } from "@openclog/core";

export interface OpenClogRepository {
  addAudit(action: string, metadata: Record<string, unknown>): void;
  addNote(body: string, now?: Date): JournalEntry;
  close(): void;
  countRedactedEvents(): number;
  getDay(dayKey: string): JournalDay | null;
  listDays(): Omit<JournalDay, "entries">[];
  listTables(): string[];
  storeRedactedEvent(entryId: string, event: PersistableRedactedEvent): void;
  upsertDay(day: JournalDay): void;
}

export function createSqliteRepository(filename: string): OpenClogRepository {
  const db = new DatabaseSync(filename);
  migrate(db);
  const repo: OpenClogRepository = {
    addAudit(action, metadata) {
      db.prepare("INSERT INTO journal_audit_log (id, action, actor, target_type, target_id, timestamp, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
        crypto.randomUUID(),
        action,
        "local-user",
        String(metadata.target_type ?? "journal"),
        typeof metadata.target_id === "string" ? metadata.target_id : null,
        new Date().toISOString(),
        JSON.stringify(metadata)
      );
    },
    addNote(body, now = new Date("2026-05-02T12:30:00.000Z")) {
      const dayKey = formatDay(now);
      const day = repo.getDay(dayKey) ?? emptyDay(dayKey);
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        dayKey: day.dayKey,
        source: "user",
        kind: "note",
        title: "Manual note",
        body,
        timestamp: now.toISOString(),
        status: "info",
        severity: "info",
        redacted: true
      };
      repo.upsertDay({ ...day, entries: [...day.entries, entry] });
      repo.addAudit("note.created", { target_type: "entry", target_id: entry.id });
      return entry;
    },
    close() {
      db.close();
    },
    countRedactedEvents() {
      const row = db.prepare("SELECT COUNT(*) AS count FROM journal_entries WHERE raw_event_hash IS NOT NULL").get() as { count: number };
      return Number(row.count);
    },
    getDay(dayKey) {
      const row = db.prepare("SELECT day_key, title, date_label, summary, metrics_json FROM journal_days WHERE day_key = ?").get(dayKey);
      if (!row) return null;
      const entries = db
        .prepare("SELECT entry_json FROM journal_entries WHERE day_key = ? ORDER BY timestamp ASC")
        .all(dayKey)
        .map((entryRow) => JSON.parse(String(entryRow.entry_json)) as JournalEntry);
      return {
        dayKey: String(row.day_key),
        title: String(row.title),
        dateLabel: String(row.date_label),
        summary: typeof row.summary === "string" ? row.summary : undefined,
        metrics: JSON.parse(String(row.metrics_json)) as JournalDay["metrics"],
        entries
      };
    },
    listDays() {
      return db
        .prepare("SELECT day_key, title, date_label, summary, metrics_json FROM journal_days ORDER BY day_key DESC")
        .all()
        .map((row) => ({
          dayKey: String(row.day_key),
          title: String(row.title),
          dateLabel: String(row.date_label),
          summary: typeof row.summary === "string" ? row.summary : undefined,
          metrics: JSON.parse(String(row.metrics_json)) as JournalDay["metrics"]
        }));
    },
    listTables() {
      return db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'journal_%' ORDER BY name ASC")
        .all()
        .map((row) => String(row.name));
    },
    storeRedactedEvent(entryId, event) {
      db.prepare(
        `INSERT INTO journal_entries (
          id, day_key, session_id, source, kind, title, body, timestamp, status, severity,
          actor_label, tool_name, approval_id, raw_event_redacted_json, raw_event_hash,
          redaction_report_json, redacted, entry_json
        ) VALUES (?, ?, NULL, 'gateway', 'system_status', 'Redacted event', NULL, ?, 'info', 'info', NULL, NULL, NULL, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
          raw_event_redacted_json = excluded.raw_event_redacted_json,
          raw_event_hash = excluded.raw_event_hash,
          redaction_report_json = excluded.redaction_report_json`
      ).run(
        entryId,
        "2026-05-02",
        "2026-05-02T12:00:00.000Z",
        event.raw_event_redacted_json,
        event.raw_event_hash,
        event.redaction_report_json,
        JSON.stringify({
          id: entryId,
          dayKey: "2026-05-02",
          source: "gateway",
          kind: "system_status",
          title: "Redacted event",
          timestamp: "2026-05-02T12:00:00.000Z",
          status: "info",
          severity: "info",
          rawEventHash: event.raw_event_hash,
          redacted: true
        } satisfies JournalEntry)
      );
    },
    upsertDay(day) {
      db.prepare(
        "INSERT INTO journal_days (day_key, title, date_label, summary, metrics_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(day_key) DO UPDATE SET title = excluded.title, date_label = excluded.date_label, summary = excluded.summary, metrics_json = excluded.metrics_json, updated_at = excluded.updated_at"
      ).run(day.dayKey, day.title, day.dateLabel, day.summary ?? null, JSON.stringify(day.metrics), new Date().toISOString(), new Date().toISOString());
      for (const entry of day.entries) upsertEntry(db, entry);
    }
  };
  repo.upsertDay(sampleJournalDay);
  return repo;
}

function upsertEntry(db: DatabaseSync, entry: JournalEntry): void {
  db.prepare(
    `INSERT INTO journal_entries (
      id, day_key, session_id, source, kind, title, body, timestamp, status, severity,
      actor_label, tool_name, approval_id, raw_event_redacted_json, raw_event_hash,
      redaction_report_json, redacted, entry_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET entry_json = excluded.entry_json`
  ).run(
    entry.id,
    entry.dayKey,
    entry.sessionId ?? null,
    entry.source,
    entry.kind,
    entry.title,
    entry.body ?? null,
    entry.timestamp,
    entry.status ?? null,
    entry.severity ?? null,
    entry.actorLabel ?? null,
    entry.toolName ?? null,
    entry.approvalId ?? null,
    entry.rawEventHash ?? null,
    entry.redacted ? 1 : 0,
    JSON.stringify(entry)
  );
}

function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS journal_days (
      day_key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date_label TEXT NOT NULL,
      summary TEXT,
      metrics_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      day_key TEXT NOT NULL,
      session_id TEXT,
      source TEXT NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      timestamp TEXT NOT NULL,
      status TEXT,
      severity TEXT,
      actor_label TEXT,
      tool_name TEXT,
      approval_id TEXT,
      raw_event_redacted_json TEXT,
      raw_event_hash TEXT,
      redaction_report_json TEXT,
      redacted INTEGER NOT NULL DEFAULT 1,
      entry_json TEXT NOT NULL,
      FOREIGN KEY (day_key) REFERENCES journal_days(day_key)
    );
    CREATE INDEX IF NOT EXISTS idx_journal_entries_day_time ON journal_entries(day_key, timestamp);
    CREATE TABLE IF NOT EXISTS journal_entry_artifacts (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL, artifact_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_sessions (id TEXT PRIMARY KEY, session_key TEXT NOT NULL, day_key TEXT NOT NULL, session_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_approvals (id TEXT PRIMARY KEY, entry_id TEXT, status TEXT NOT NULL, requested_at TEXT NOT NULL, resolved_at TEXT, resolved_by TEXT, request_json TEXT, result_json TEXT);
    CREATE TABLE IF NOT EXISTS journal_daily_summaries (day_key TEXT PRIMARY KEY, summary TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS journal_audit_log (id TEXT PRIMARY KEY, action TEXT NOT NULL, actor TEXT NOT NULL, target_type TEXT NOT NULL, target_id TEXT, timestamp TEXT NOT NULL, metadata_json TEXT);
  `);
}

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function emptyDay(dayKey: string): JournalDay {
  return {
    dayKey,
    title: "OpenClaw Journal",
    dateLabel: dayKey,
    summary: "",
    entries: [],
    metrics: { sessionCount: 0, messageCount: 0, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
  };
}
