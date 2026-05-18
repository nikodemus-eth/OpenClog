import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { backfillOpenClawSessions, resolveDefaultOpenClawSessionsDir } from "../src/openclaw-session-backfill.js";
import { createSqliteRepository, type OpenClogRepository } from "../src/repository.js";

describe("OpenClaw session backfill", () => {
  const tempDirs: string[] = [];
  const repos: OpenClogRepository[] = [];
  const originalEnv = {
    home: process.env.HOME,
    includeUser: process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_INCLUDE_USER,
    maxFiles: process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_FILES,
    maxMessages: process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_MESSAGES,
    sessionsDir: process.env.OPENCLOG_OPENCLAW_SESSIONS_DIR
  };

  afterEach(() => {
    while (repos.length > 0) repos.pop()?.close();
    while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { force: true, recursive: true });
    process.env.HOME = originalEnv.home;
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_INCLUDE_USER = originalEnv.includeUser;
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_FILES = originalEnv.maxFiles;
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_MESSAGES = originalEnv.maxMessages;
    process.env.OPENCLOG_OPENCLAW_SESSIONS_DIR = originalEnv.sessionsDir;
  });

  test("resolves the default OpenClaw sessions directory under the home folder", () => {
    expect(resolveDefaultOpenClawSessionsDir()).toMatch(/\.openclaw\/agents\/main\/sessions$/);
  });

  test("imports missed assistant messages into the operator's local day", () => {
    const sessionsDir = mkdtempSync(join(tmpdir(), "openclaw-sessions-"));
    tempDirs.push(sessionsDir);
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    writeFileSync(
      join(sessionsDir, "27823a7a-0bee-4ef9-b968-2ea5e2c48929.jsonl"),
      [
        JSON.stringify({ type: "session", id: "18092d8b-27e7-4078-ac23-5ad41c2ad65e", timestamp: "2026-05-16T04:17:15.116Z" }),
        JSON.stringify({
          type: "message",
          id: "7dcae7a5-e2d9-413f-9a2d-359c29018c10",
          timestamp: "2026-05-16T04:17:15.175Z",
          message: {
            role: "assistant",
            content: [{ type: "text", text: "Triage complete.\n\nGmail auth worked." }]
          }
        })
      ].join("\n")
    );

    const result = backfillOpenClawSessions(repo, { sessionsDir, timeZone: "America/Los_Angeles" });

    expect(result).toMatchObject({ filesScanned: 1, messagesImported: 1, skippedLines: 0 });
    expect(repo.getDay("2026-05-15")?.entries).toEqual([
      expect.objectContaining({
        source: "openclaw",
        kind: "assistant_message",
        dayKey: "2026-05-15",
        timestamp: "2026-05-16T04:17:15.175Z",
        body: "Triage complete.\n\nGmail auth worked.",
        backfilled: true,
        sourceLabel: "Backfilled from OpenClaw",
        importedAt: expect.any(String)
      })
    ]);
    expect(repo.getDay("2026-05-16")).toBeNull();
  });

  test("skips tool-only assistant frames and remains idempotent", () => {
    const sessionsDir = mkdtempSync(join(tmpdir(), "openclaw-sessions-"));
    tempDirs.push(sessionsDir);
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    writeFileSync(
      join(sessionsDir, "session.jsonl"),
      [
        JSON.stringify({ type: "session", id: "session-1", timestamp: "2026-05-16T04:00:00.000Z" }),
        JSON.stringify({
          type: "message",
          id: "tool-call-only",
          timestamp: "2026-05-16T04:00:01.000Z",
          message: { role: "assistant", content: [{ type: "toolCall", name: "bash" }] }
        }),
        JSON.stringify({
          type: "message",
          id: "operator-visible",
          timestamp: "2026-05-16T04:17:15.175Z",
          message: { role: "assistant", content: "Visible summary." }
        })
      ].join("\n")
    );

    backfillOpenClawSessions(repo, { sessionsDir, timeZone: "America/Los_Angeles" });
    backfillOpenClawSessions(repo, { sessionsDir, timeZone: "America/Los_Angeles" });

    expect(repo.getDay("2026-05-15")?.entries.map((entry) => entry.body)).toEqual(["Visible summary."]);
  });

  test("includes user messages when requested and records parse errors without aborting the scan", () => {
    const sessionsDir = mkdtempSync(join(tmpdir(), "openclaw-sessions-"));
    tempDirs.push(sessionsDir);
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    writeFileSync(
      join(sessionsDir, "session-a.jsonl"),
      [
        JSON.stringify({ type: "session", id: "session-a", timestamp: "2026-05-16T04:00:00.000Z" }),
        JSON.stringify({
          type: "message",
          id: "user-visible",
          timestamp: "2026-05-16T04:00:01.000Z",
          message: { role: "user", content: "Please summarize the outage." }
        }),
        "{not-json"
      ].join("\n")
    );

    const result = backfillOpenClawSessions(repo, { sessionsDir, includeUserMessages: true, timeZone: "America/Los_Angeles" });

    expect(result.messagesImported).toBe(1);
    expect(result.errors).toEqual([expect.objectContaining({ line: 3, message: expect.any(String) })]);
    expect(repo.getDay("2026-05-15")?.entries).toEqual([
      expect.objectContaining({
        kind: "user_message",
        source: "user",
        body: "Please summarize the outage.",
        backfilled: true
      })
    ]);
  });

  test("scans only the newest bounded files but preserves chronological import order within that window", () => {
    const sessionsDir = mkdtempSync(join(tmpdir(), "openclaw-sessions-"));
    tempDirs.push(sessionsDir);
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    const files = [
      { name: "oldest.jsonl", mtime: new Date("2026-05-16T04:00:00.000Z"), text: "Oldest included." },
      { name: "middle.jsonl", mtime: new Date("2026-05-16T05:00:00.000Z"), text: "Middle included." },
      { name: "newest.jsonl", mtime: new Date("2026-05-16T06:00:00.000Z"), text: "Newest skipped by maxFiles." }
    ];

    for (const [index, file] of files.entries()) {
      const path = join(sessionsDir, file.name);
      writeFileSync(
        path,
        [
          JSON.stringify({ type: "session", id: `session-${index}`, timestamp: file.mtime.toISOString() }),
          JSON.stringify({
            type: "message",
            id: `message-${index}`,
            timestamp: new Date(file.mtime.getTime() + 1000).toISOString(),
            message: { role: "assistant", content: file.text }
          })
        ].join("\n")
      );
      utimesSync(path, file.mtime, file.mtime);
    }

    const result = backfillOpenClawSessions(repo, { sessionsDir, maxFiles: 2, timeZone: "America/Los_Angeles" });
    const importedBodies = repo
      .listDays()
      .flatMap((day) => repo.getDay(day.dayKey)?.entries ?? [])
      .map((entry) => entry.body)
      .filter((body) => body === "Middle included." || body === "Newest skipped by maxFiles.");

    expect(result.filesScanned).toBe(2);
    expect(importedBodies).toEqual(["Middle included.", "Newest skipped by maxFiles."]);
  });

  test("returns an empty result when the sessions directory is missing", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);
    const sessionsDir = join(tmpdir(), `openclaw-sessions-missing-${Date.now()}`);

    expect(backfillOpenClawSessions(repo, { sessionsDir })).toEqual({
      errors: [],
      filesScanned: 0,
      messagesImported: 0,
      sessionsDir,
      skippedLines: 0
    });
  });

  test("stops after the configured message limit across multiple files", () => {
    const sessionsDir = mkdtempSync(join(tmpdir(), "openclaw-sessions-"));
    tempDirs.push(sessionsDir);
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    for (const [index, label] of ["First imported.", "Second imported.", "Never imported."].entries()) {
      const timestamp = new Date(Date.UTC(2026, 4, 16, 4 + index, 0, 0));
      const path = join(sessionsDir, `session-${index}.jsonl`);
      writeFileSync(
        path,
        [
          JSON.stringify({ type: "session", id: `session-${index}`, timestamp: timestamp.toISOString() }),
          JSON.stringify({
            type: "message",
            id: `message-${index}`,
            timestamp: new Date(timestamp.getTime() + 1000).toISOString(),
            message: { role: "assistant", content: label }
          })
        ].join("\n")
      );
      utimesSync(path, timestamp, timestamp);
    }

    const result = backfillOpenClawSessions(repo, { sessionsDir, maxMessages: 2, timeZone: "America/Los_Angeles" });
    const importedBodies = repo
      .listDays()
      .flatMap((day) => repo.getDay(day.dayKey)?.entries ?? [])
      .map((entry) => entry.body)
      .filter((body) => body === "First imported." || body === "Second imported." || body === "Never imported.");

    expect(result.messagesImported).toBe(2);
    expect(result.latestTimestamp).toBe("2026-05-16T05:00:01.000Z");
    expect(importedBodies).toEqual(["First imported.", "Second imported."]);
  });

  test("uses environment fallbacks and skips malformed or non-visible message payloads", () => {
    const sessionsDir = mkdtempSync(join(tmpdir(), "openclaw-sessions-"));
    tempDirs.push(sessionsDir);
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    process.env.OPENCLOG_OPENCLAW_SESSIONS_DIR = sessionsDir;
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_INCLUDE_USER = "1";
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_FILES = "not-a-number";
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_MESSAGES = "also-bad";

    writeFileSync(
      join(sessionsDir, "session.jsonl"),
      [
        JSON.stringify({ type: "session", timestamp: "2026-05-16T04:00:00.000Z" }),
        JSON.stringify({
          type: "message",
          id: "later",
          timestamp: "2026-05-16T05:00:00.000Z",
          message: { role: "assistant", content: "Later imported." }
        }),
        JSON.stringify({
          type: "message",
          id: "earlier",
          timestamp: "2026-05-16T04:59:59.000Z",
          message: { role: "assistant", content: "Earlier imported." }
        }),
        JSON.stringify({
          type: "message",
          id: "user-visible",
          timestamp: "2026-05-16T05:00:01.000Z",
          message: { role: "user", content: "Visible user note." }
        }),
        JSON.stringify({
          type: "message",
          id: "array-message",
          timestamp: "2026-05-16T05:00:02.000Z",
          message: []
        }),
        JSON.stringify({
          type: "message",
          id: "object-content",
          timestamp: "2026-05-16T05:00:03.000Z",
          message: { role: "assistant", content: { text: "Hidden object" } }
        }),
        JSON.stringify({
          type: "message",
          id: "missing-timestamp",
          message: { role: "assistant", content: "No timestamp" }
        })
      ].join("\n")
    );

    const result = backfillOpenClawSessions(repo);
    const importedBodies = repo
      .listDays()
      .flatMap((day) => repo.getDay(day.dayKey)?.entries ?? [])
      .map((entry) => entry.body)
      .filter((body) => body === "Later imported." || body === "Earlier imported." || body === "Visible user note.");

    expect(result.sessionsDir).toBe(sessionsDir);
    expect(result.messagesImported).toBe(3);
    expect(result.skippedLines).toBe(3);
    expect(result.latestTimestamp).toBe("2026-05-16T05:00:01.000Z");
    expect(importedBodies).toEqual(["Earlier imported.", "Later imported.", "Visible user note."]);
  });

  test("honors numeric environment limits and skips user or non-message records when user import is disabled", () => {
    const sessionsDir = mkdtempSync(join(tmpdir(), "openclaw-sessions-"));
    tempDirs.push(sessionsDir);
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    process.env.OPENCLOG_OPENCLAW_SESSIONS_DIR = sessionsDir;
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_INCLUDE_USER = "0";
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_FILES = "1";
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_MESSAGES = "1";

    writeFileSync(
      join(sessionsDir, "session.jsonl"),
      [
        JSON.stringify({ type: "status", timestamp: "2026-05-16T04:00:00.000Z" }),
        JSON.stringify({
          type: "message",
          id: "user-skipped",
          timestamp: "2026-05-16T04:00:01.000Z",
          message: { role: "user", content: "Skip me." }
        }),
        JSON.stringify({
          type: "message",
          id: "assistant-imported",
          timestamp: "2026-05-16T04:00:02.000Z",
          message: { role: "assistant", content: "Import me." }
        })
      ].join("\n")
    );

    const result = backfillOpenClawSessions(repo);
    const importedBodies = repo
      .listDays()
      .flatMap((day) => repo.getDay(day.dayKey)?.entries ?? [])
      .map((entry) => entry.body)
      .filter((body) => body === "Import me." || body === "Skip me.");

    expect(result.filesScanned).toBe(1);
    expect(result.messagesImported).toBe(1);
    expect(result.skippedLines).toBe(1);
    expect(importedBodies).toEqual(["Import me."]);
  });

  test("uses the default home-relative sessions path and stops within a file once the env message limit is reached", () => {
    const fakeHome = mkdtempSync(join(tmpdir(), "openclaw-home-"));
    const sessionsDir = join(fakeHome, ".openclaw", "agents", "main", "sessions");
    tempDirs.push(fakeHome);
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    process.env.HOME = fakeHome;
    delete process.env.OPENCLOG_OPENCLAW_SESSIONS_DIR;
    delete process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_FILES;
    process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_MESSAGES = "1";
    mkdirSync(sessionsDir, { recursive: true });

    writeFileSync(
      join(sessionsDir, "session.jsonl"),
      [
        "",
        JSON.stringify({
          type: "message",
          id: "assistant-imported",
          timestamp: "2026-05-16T04:00:02.000Z",
          message: { role: "assistant", content: "Import from default path." }
        }),
        JSON.stringify({
          type: "message",
          id: "assistant-skipped",
          timestamp: "2026-05-16T04:00:03.000Z",
          message: { role: "assistant", content: "Skipped by maxMessages." }
        })
      ].join("\n")
    );

    const result = backfillOpenClawSessions(repo);
    const importedBodies = repo
      .listDays()
      .flatMap((day) => repo.getDay(day.dayKey)?.entries ?? [])
      .map((entry) => entry.body)
      .filter((body) => body === "Import from default path." || body === "Skipped by maxMessages.");

    expect(result.sessionsDir).toBe(sessionsDir);
    expect(result.messagesImported).toBe(1);
    expect(importedBodies).toEqual(["Import from default path."]);
  });

  test("records string throwables from downstream repository writes", () => {
    const sessionsDir = mkdtempSync(join(tmpdir(), "openclaw-sessions-"));
    tempDirs.push(sessionsDir);
    writeFileSync(
      join(sessionsDir, "session.jsonl"),
      JSON.stringify({
        type: "message",
        id: "assistant-imported",
        timestamp: "2026-05-16T04:00:02.000Z",
        message: { role: "assistant", content: "Import from default path." }
      })
    );

    const result = backfillOpenClawSessions(
      {
        addEntry() {
          throw "boom";
        }
      } as unknown as OpenClogRepository,
      { sessionsDir }
    );

    expect(result.errors).toEqual([expect.objectContaining({ message: "boom" })]);
  });
});
