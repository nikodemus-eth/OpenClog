import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { normalizeGatewayEvent, type GatewayEventLike } from "@openclog/core";
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

interface OpenClawSessionRecord {
  id?: unknown;
  message?: unknown;
  timestamp?: unknown;
  type?: unknown;
}

export function resolveDefaultOpenClawSessionsDir(): string {
  return join(homedir(), ".openclaw", "agents", "main", "sessions");
}

export function backfillOpenClawSessions(repo: OpenClogRepository, options: OpenClawSessionBackfillOptions = {}): OpenClawSessionBackfillResult {
  const sessionsDir = options.sessionsDir ?? process.env.OPENCLOG_OPENCLAW_SESSIONS_DIR ?? resolveDefaultOpenClawSessionsDir();
  const includeUserMessages = options.includeUserMessages ?? process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_INCLUDE_USER === "1";
  const maxMessages = options.maxMessages ?? parsePositiveInt(process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_MESSAGES, 200);
  const importedAt = new Date().toISOString();
  const result: OpenClawSessionBackfillResult = { errors: [], filesScanned: 0, messagesImported: 0, sessionsDir, skippedLines: 0 };
  if (!existsSync(sessionsDir)) return result;

  for (const file of recentSessionFiles(sessionsDir, options.maxFiles ?? parsePositiveInt(process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_FILES, 40))) {
    if (result.messagesImported >= maxMessages) break;
    result.filesScanned += 1;
    let sessionKey = `openclaw:session:${basename(file, ".jsonl")}`;
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      if (result.messagesImported >= maxMessages) break;
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
        repo.addEntry(entry, event);
        result.messagesImported += 1;
        result.latestTimestamp = maxTimestamp(result.latestTimestamp, entry.timestamp);
      } catch (error) {
        result.errors.push({
          file,
          line: index + 1,
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }
  return result;
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

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
