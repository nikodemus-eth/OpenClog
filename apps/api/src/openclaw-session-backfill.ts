import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { normalizeGatewayEvent, type GatewayEventLike, type JournalEntry } from "@openclog/core";
import type { OpenClogRepository } from "./repository.js";

export interface OpenClawSessionBackfillOptions {
  includeUserMessages?: boolean;
  maxFiles?: number;
  maxMessages?: number;
  sessionsDir?: string;
  timeZone?: string;
}

export interface OpenClawSessionBackfillResult {
  errors: Array<{ file: string; line: number; message: string }>;
  filesScanned: number;
  latestTimestamp?: string;
  messagesImported: number;
  sessionsDir: string;
  skippedLines: number;
}

export interface OpenClawSessionBackfillScheduleOptions extends OpenClawSessionBackfillOptions {
  delayMs?: number;
  enabled?: boolean;
  logger?: Pick<Console, "error">;
  runBackfill?: () => OpenClawSessionBackfillResult;
}

export interface OpenClawSessionBackfillSchedule {
  completed: Promise<OpenClawSessionBackfillResult | undefined>;
  scheduled: boolean;
}

interface OpenClawSessionRecord {
  id?: unknown;
  message?: unknown;
  timestamp?: unknown;
  type?: unknown;
}

interface PendingBackfillEntry {
  entry: JournalEntry;
  event: GatewayEventLike;
  file: string;
  line: number;
}

export function resolveDefaultOpenClawSessionsDir(): string {
  return join(homedir(), ".openclaw", "agents", "main", "sessions");
}

export function scheduleOpenClawSessionBackfill(
  repo: OpenClogRepository,
  options: OpenClawSessionBackfillScheduleOptions = {}
): OpenClawSessionBackfillSchedule {
  const enabled = options.enabled ?? process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL !== "0";
  if (!enabled) return { completed: Promise.resolve(undefined), scheduled: false };
  const delayMs = Math.max(0, options.delayMs ?? parsePositiveInt(process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_DELAY_MS, 1000));
  const logger = options.logger ?? console;
  const completed = new Promise<OpenClawSessionBackfillResult>((resolve) => {
    setTimeout(() => {
      let result: OpenClawSessionBackfillResult;
      try {
        result = options.runBackfill?.() ?? backfillOpenClawSessions(repo, options);
      } catch (error) {
        const sessionsDir = options.sessionsDir ?? process.env.OPENCLOG_OPENCLAW_SESSIONS_DIR ?? resolveDefaultOpenClawSessionsDir();
        result = {
          errors: [{ file: "startup", line: 0, message: throwableMessage(error) }],
          filesScanned: 0,
          messagesImported: 0,
          sessionsDir,
          skippedLines: 0
        };
      }
      logBackfillResult(result, logger);
      resolve(result);
    }, delayMs);
  });
  return { completed, scheduled: true };
}

export function backfillOpenClawSessions(repo: OpenClogRepository, options: OpenClawSessionBackfillOptions = {}): OpenClawSessionBackfillResult {
  const sessionsDir = options.sessionsDir ?? process.env.OPENCLOG_OPENCLAW_SESSIONS_DIR ?? resolveDefaultOpenClawSessionsDir();
  const includeUserMessages = options.includeUserMessages ?? process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_INCLUDE_USER === "1";
  const maxMessages = options.maxMessages ?? parsePositiveInt(process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_MESSAGES, 200);
  const importedAt = new Date().toISOString();
  const result: OpenClawSessionBackfillResult = { errors: [], filesScanned: 0, messagesImported: 0, sessionsDir, skippedLines: 0 };
  const pendingEntries: PendingBackfillEntry[] = [];
  if (!existsSync(sessionsDir)) return result;

  for (const file of recentSessionFiles(sessionsDir, options.maxFiles ?? parsePositiveInt(process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_FILES, 40))) {
    if (pendingEntries.length >= maxMessages) break;
    result.filesScanned += 1;
    let sessionKey = `openclaw:session:${basename(file, ".jsonl")}`;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (pendingEntries.length >= maxMessages) break;
      const line = lines[index];
      if (!line.trim()) continue;
      try {
        const record = JSON.parse(line) as OpenClawSessionRecord;
        if (record.type === "session") {
          sessionKey = `openclaw:session:${stringValue(record.id) || basename(file, ".jsonl")}`;
          continue;
        }
        const event = sessionMessageEvent(record, sessionKey, includeUserMessages, importedAt);
        if (!event) {
          if (record.type === "message") result.skippedLines += 1;
          continue;
        }
        const entry = normalizeGatewayEvent(event, { timeZone: options.timeZone ?? process.env.OPENCLOG_OPERATOR_TIME_ZONE });
        pendingEntries.push({ entry, event, file, line: index + 1 });
      } catch (error) {
        result.errors.push({
          file,
          line: index + 1,
          message: throwableMessage(error)
        });
      }
    }
  }
  persistBackfillEntries(repo, pendingEntries, result);
  return result;
}

function persistBackfillEntries(repo: OpenClogRepository, pendingEntries: PendingBackfillEntry[], result: OpenClawSessionBackfillResult): void {
  if (pendingEntries.length === 0) return;
  if (typeof repo.addEntries === "function") {
    try {
      const entries = repo.addEntries(pendingEntries.map((item) => ({ entry: item.entry, sourceEvent: item.event })));
      for (const entry of entries) {
        result.messagesImported += 1;
        result.latestTimestamp = maxTimestamp(result.latestTimestamp, entry.timestamp);
      }
      return;
    } catch (error) {
      result.errors.push({
        file: "bulk-write",
        line: 0,
        message: throwableMessage(error)
      });
      return;
    }
  }
  for (const item of pendingEntries) {
    try {
      repo.addEntry(item.entry, item.event);
      result.messagesImported += 1;
      result.latestTimestamp = maxTimestamp(result.latestTimestamp, item.entry.timestamp);
    } catch (error) {
      result.errors.push({
        file: item.file,
        line: item.line,
        message: throwableMessage(error)
      });
    }
  }
}

function logBackfillResult(result: OpenClawSessionBackfillResult, logger: Pick<Console, "error">): void {
  if (result.messagesImported === 0 && result.errors.length === 0) return;
  logger.error(
    `OpenClog OpenClaw session backfill: imported ${result.messagesImported} message(s) from ${result.filesScanned} file(s)` +
      (result.latestTimestamp ? ` through ${result.latestTimestamp}` : "") +
      (result.errors.length > 0 ? ` with ${result.errors.length} parse error(s)` : "")
  );
}

function recentSessionFiles(sessionsDir: string, maxFiles: number): string[] {
  return readdirSync(sessionsDir)
    .filter((file) => file.endsWith(".jsonl") && !file.endsWith(".trajectory.jsonl"))
    .map((file) => {
      const path = join(sessionsDir, file);
      return { path, mtimeMs: statSync(path).mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, maxFiles)
    .sort((left, right) => left.mtimeMs - right.mtimeMs)
    .map((file) => file.path);
}

function sessionMessageEvent(record: OpenClawSessionRecord, sessionKey: string, includeUserMessages: boolean, importedAt: string): GatewayEventLike | null {
  if (record.type !== "message") return null;
  const message = asRecord(record.message);
  const role = stringValue(message.role);
  if (role !== "assistant" && role !== "user") return null;
  if (role === "user" && !includeUserMessages) return null;
  const text = contentText(message.content);
  if (!text.trim()) return null;
  const timestamp = stringValue(record.timestamp) || stringValue(message.timestamp);
  if (!timestamp) return null;
  const messageId = stringValue(record.id);
  return {
    event: "session.message",
    payload: {
      message: { content: text, role, timestamp },
      importedAt,
      messageId,
      sessionKey,
      source: "openclaw-session-jsonl"
    }
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      const block = asRecord(item);
      return stringValue(block.text) || stringValue(block.content);
    })
    .filter(Boolean)
    .join("\n");
}

function maxTimestamp(left: string | undefined, right: string): string {
  return !left || right > left ? right : left;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function throwableMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
