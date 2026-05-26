import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, test } from "vitest";
import { createSqliteRepository } from "../src/repository.js";
import { journalTableNames } from "../src/schema.js";
import { buildVerificationReceiptId, runAndRecordVerification } from "../src/verification-receipts.js";
import { sampleJournalDay, toPersistableRedactedEvent, type JournalDay, type VerificationReceipt } from "@openclog/core";

describe("SQLite repository", () => {
  const repos: Array<{ close: () => void }> = [];
  const tempDirs: string[] = [];

  afterEach(() => {
    while (repos.length > 0) repos.pop()?.close();
    while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { force: true, recursive: true });
  });

  test("creates required tables and idempotently stores redacted events", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);
    const event = toPersistableRedactedEvent({ event: "session.message", payload: { text: "token=abc" } });

    repo.upsertDay(sampleJournalDay);
    repo.storeRedactedEvent("entry-1", event);
    repo.storeRedactedEvent("entry-1", event);

    expect(repo.getDay(sampleJournalDay.dayKey)?.entries.length).toBe(sampleJournalDay.entries.length);
    expect(repo.countRedactedEvents()).toBe(1);
    expect(repo.searchEntries("redacted event")).toEqual([
      expect.objectContaining({ entryId: "entry-1", title: "Redacted event" })
    ]);
    expect(repo.getIntegrityReport()).toMatchObject({ missingRedactedHashes: [] });
    expect(repo.listTables()).toEqual([...journalTableNames]);
  });

  test("searches quoted OpenClaw backfill provenance and import timestamps", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    repo.addEntry({
      id: "backfilled-openclaw-entry",
      dayKey: "2026-05-20",
      source: "openclaw",
      kind: "assistant_message",
      title: "OpenClaw response",
      body: "Recovered operator note",
      timestamp: "2026-05-20T22:00:23.406Z",
      status: "info",
      severity: "info",
      sessionId: "openclaw:session:real-log",
      sourceLabel: "Backfilled from OpenClaw",
      backfilled: true,
      importedAt: "2026-05-20T22:17:21.955Z",
      redacted: true
    });

    expect(repo.searchEntries('"Backfilled from OpenClaw"')).toEqual([
      expect.objectContaining({
        entryId: "backfilled-openclaw-entry",
        matchFieldHints: expect.arrayContaining(["sourceLabel", "provenance"]),
        matchSnippet: expect.stringContaining("sourceLabel")
      })
    ]);
    expect(repo.searchEntries("2026-05-20T22:17")).toEqual([
      expect.objectContaining({
        entryId: "backfilled-openclaw-entry",
        matchFieldHints: expect.arrayContaining(["importedAt"])
      })
    ]);
  });

  test("reports corrupted integrity rows when hashes or entry ids drift", () => {
    const dir = mkdtempSync(join(tmpdir(), "openclog-repo-"));
    tempDirs.push(dir);
    const filename = join(dir, "openclog.db");
    const repo = createSqliteRepository(filename);
    repos.push(repo);
    const event = toPersistableRedactedEvent({ event: "session.message", payload: { text: "token=abc" } });

    repo.storeRedactedEvent("entry-1", event);

    const db = new DatabaseSync(filename);
    db.exec(`
      UPDATE journal_entries
      SET raw_event_hash = NULL,
          entry_json = '{"id":"different-id","dayKey":"2026-05-02","source":"gateway","kind":"system_status","title":"Redacted event","timestamp":"2026-05-02T12:00:00.000Z","status":"info","severity":"info","redacted":true}'
      WHERE id = 'entry-1'
    `);
    db.close();

    expect(repo.getIntegrityReport()).toMatchObject({
      ok: false,
      mismatchedEntryIds: ["entry-1"],
      missingRedactedHashes: ["entry-1"]
    });
  });

  test("lists day summaries, returns null for missing days, and creates notes on the requested date", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    const entry = repo.addNote("follow up on approvals", new Date("2026-05-03T08:15:00.000Z"));
    const days = repo.listDays();

    expect(entry.dayKey).toBe("2026-05-03");
    expect(repo.getDay("does-not-exist")).toBeNull();
    expect(repo.getDay("2026-05-03")).toMatchObject({
      dayKey: "2026-05-03",
      entries: [expect.objectContaining({ body: "follow up on approvals", kind: "note" })]
    });
    expect(days.map((day) => day.dayKey)).toEqual(["2026-05-03", sampleJournalDay.dayKey]);
  });

  test("persists sparse day and entry fields without inventing raw data", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);
    const sparseDay: JournalDay = {
      dayKey: "2026-05-04",
      title: "Sparse journal day",
      dateLabel: "Monday, May 4, 2026",
      entries: [
        {
          id: "sparse-entry",
          dayKey: "2026-05-04",
          source: "system",
          kind: "summary",
          title: "No payload fields",
          timestamp: "2026-05-04T12:00:00.000Z",
          redacted: false
        }
      ],
      metrics: { sessionCount: 0, messageCount: 0, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
    };

    repo.addAudit("journal.checked", {});
    repo.upsertDay(sparseDay);

    expect(repo.getDay("2026-05-04")).toMatchObject({
      summary: undefined,
      entries: [expect.objectContaining({ id: "sparse-entry", redacted: false })]
    });
    expect(repo.listDays().find((day) => day.dayKey === "2026-05-04")).toMatchObject({ summary: undefined });
  });

  test("lists stored incidents and profiles once created", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    repo.upsertDay(sampleJournalDay);
    repo.saveIncident({
      id: "incident-1",
      title: "Stored incident",
      summary: "Stored summary",
      dayKeys: ["2026-05-02"],
      entryIds: ["entry-1"],
      createdAt: "2026-05-04T12:00:00.000Z",
      runbookSuggestions: []
    });
    repo.saveInvestigationNote({
      id: "note-1",
      dayKey: "2026-05-02",
      incidentId: "incident-1",
      author: "local-user",
      body: "Evidence reviewed.",
      linkedEntryIds: [],
      createdAt: "2026-05-04T12:00:00.000Z",
      updatedAt: "2026-05-04T12:00:00.000Z"
    });
    repo.upsertProfile({ id: "night-ops", label: "Night Ops", gatewayUrl: "ws://127.0.0.1:18789" });
    repo.setSetting("selectedProfileId", "night-ops");

    expect(repo.listIncidents()).toEqual([
      expect.objectContaining({ id: "incident-1", title: "Stored incident" })
    ]);
    expect(repo.listProfiles()).toEqual([
      expect.objectContaining({ id: "night-ops", label: "Night Ops" })
    ]);
    expect(repo.listDays().find((day) => day.dayKey === "2026-05-02")?.evidenceCompleteness).toMatchObject({
      label: "Evidence 3/4",
      summaryPresent: true,
      notesPresent: true,
      bundlePresent: false,
      incidentPresent: true
    });
    expect(repo.getSetting("selectedProfileId", "default")).toBe("night-ops");
  });

  test("derives incidents, runbook suggestions, retention previews, and search edge cases", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    repo.addEntry({
      id: "derived-error",
      dayKey: "2026-05-05",
      source: "tool",
      kind: "tool_result",
      title: "Tool failed",
      body: "Gateway reconnect required",
      timestamp: "2026-05-05T10:00:00.000Z",
      status: "failed",
      severity: "error",
      redacted: true
    });
    repo.addEntry({
      id: "derived-approval",
      dayKey: "2026-05-05",
      source: "system",
      kind: "approval_requested",
      title: "Approval requested",
      body: "Needs approval",
      timestamp: "2026-05-05T10:01:00.000Z",
      status: "pending",
      severity: "warning",
      redacted: true
    });
    repo.addEntry({
      id: "sparse-searchable",
      dayKey: "2026-05-05",
      source: "system",
      kind: "summary",
      title: "Sparse searchable entry",
      timestamp: "2026-05-05T10:02:00.000Z",
      redacted: true
    });
    repo.upsertAlertRule({ id: "approval-backlog", kind: "approval_backlog", title: "Approval backlog", threshold: 1, enabled: true });
    repo.upsertAlertRule({ id: "tool-failure-spike", kind: "tool_failure_spike", title: "Tool failures", threshold: 1, enabled: false });

    const incidents = repo.listIncidents();
    const emptySearch = repo.searchEntries("   ");
    const sparseSearch = repo.searchEntries("sparse searchable");
    const preview = repo.previewRetention({ keepDays: 1, includeAudit: false, includeRedactedEvents: false, includeSummaries: false });
    const findings = repo.evaluateAlertRules("2026-05-05");
    const missingSummary = repo.generateSummary("missing-day", new Date("2026-05-05T11:00:00.000Z"));
    const fallbackFindings = repo.evaluateAlertRules("missing-day");
    const fallbackIntegration = repo.buildIntegrationPayload("incident-doc", "missing-day");

    expect(incidents).toEqual([
      expect.objectContaining({
        title: "Error narrative",
        runbookSuggestions: expect.arrayContaining([
          expect.objectContaining({ id: "gateway-reconnect-check" }),
          expect.objectContaining({ id: "approval-backlog-review" })
        ])
      })
    ]);
    expect(emptySearch).toEqual([]);
    expect(sparseSearch).toEqual([expect.objectContaining({ entryId: "sparse-searchable" })]);
    expect(preview).toMatchObject({
      keepDays: 1,
      removedSummaryCount: 0,
      removedAuditCount: 0
    });
    expect(missingSummary.summary).toContain("0 failures");
    expect(findings).toEqual([
      expect.objectContaining({ ruleId: "approval-backlog", triggered: true }),
      expect.objectContaining({ ruleId: "tool-failure-spike", triggered: false })
    ]);
    expect(fallbackFindings).toEqual([
      expect.objectContaining({ ruleId: "approval-backlog", triggered: false }),
      expect.objectContaining({ ruleId: "tool-failure-spike", triggered: false })
    ]);
    expect(fallbackIntegration).toMatchObject({
      target: "incident-doc",
      title: "OpenClog Journal handoff for missing-day",
      body: expect.stringContaining("# OpenClog Journal")
    });
  });

  test("refreshes generated summaries on later entry writes", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    repo.addEntry({
      id: "summary-base",
      dayKey: "2026-05-07",
      source: "system",
      kind: "session_started",
      title: "Session started",
      body: "Open session",
      timestamp: "2026-05-07T09:00:00.000Z",
      status: "info",
      severity: "info",
      redacted: true
    });

    const firstSummary = repo.getDay("2026-05-07")?.generatedSummary?.summary;

    repo.addEntry({
      id: "summary-failure",
      dayKey: "2026-05-07",
      source: "tool",
      kind: "tool_result",
      title: "Tool failed",
      body: "timeout",
      timestamp: "2026-05-07T09:01:00.000Z",
      status: "failed",
      severity: "error",
      redacted: true
    });

    expect(firstSummary).toContain("0 failures");
    expect(repo.getDay("2026-05-07")?.generatedSummary?.summary).toContain("1 failure");
  });

  test("drilldown includes approval lifecycle entries correlated by approval id", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    repo.addEntry({
      id: "session-tool",
      dayKey: "2026-05-08",
      source: "openclaw",
      sourceLabel: "Backfilled from OpenClaw",
      kind: "assistant_message",
      title: "OpenClaw response",
      body: "Recovered summary",
      timestamp: "2026-05-08T10:00:00.000Z",
      status: "info",
      severity: "info",
      sessionId: "agent:hugin:main",
      approvalId: "approval-8",
      backfilled: true,
      importedAt: "2026-05-17T16:00:00.000Z",
      redacted: true
    });
    repo.addEntry({
      id: "approval-requested",
      dayKey: "2026-05-08",
      source: "gateway",
      kind: "approval_requested",
      title: "Approval requested",
      body: "rm -rf /tmp/demo",
      timestamp: "2026-05-08T10:01:00.000Z",
      status: "pending",
      severity: "warning",
      approvalId: "approval-8",
      redacted: true
    });
    repo.addEntry({
      id: "approval-resolved",
      dayKey: "2026-05-08",
      source: "gateway",
      kind: "approval_resolved",
      title: "Approval resolved",
      body: "allow-once",
      timestamp: "2026-05-08T10:02:00.000Z",
      status: "approved",
      severity: "info",
      approvalId: "approval-8",
      redacted: true
    });
    repo.addEntry({
      id: "session-reconnect",
      dayKey: "2026-05-08",
      source: "system",
      kind: "system_status",
      title: "Gateway reconnected",
      body: "Recovered after timeout",
      timestamp: "2026-05-08T10:03:00.000Z",
      status: "success",
      severity: "warning",
      sessionId: "agent:hugin:main",
      redacted: true
    });

    const drilldown = repo.getDrilldown("agent:hugin:main");

    expect(drilldown.entries.map((entry) => entry.id)).toEqual(["session-tool", "approval-requested", "approval-resolved", "session-reconnect"]);
    expect(drilldown.approvalCount).toBe(1);
    expect(drilldown.reconnectCount).toBe(1);
    expect(drilldown.provenance).toEqual({
      backfilled: true,
      sourceLabel: "Backfilled from OpenClaw",
      importedAt: "2026-05-17T16:00:00.000Z"
    });
  });

  test("returns empty incidents and profiles when none exist", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    expect(repo.listProfiles()).toEqual([]);
    expect(repo.listIncidents()).toEqual([]);
  });

  test("persists explicit verification receipts instead of returning placeholders", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);
    const receipt: VerificationReceipt = {
      id: "verify-real-1",
      command: "npm run verify",
      status: "passed",
      startedAt: "2026-05-10T10:00:00.000Z",
      completedAt: "2026-05-10T10:01:00.000Z",
      summary: "real verify passed",
      artifactPath: "output/verification/verify-real-1.json",
      commitSha: "abc1234"
    };

    const saved = repo.saveVerificationReceipt(receipt);

    expect(saved).toEqual(receipt);
    expect(repo.listVerificationReceipts()).toEqual([receipt]);
  });

  test("persists operations report snapshots, saved-view audit events, and evidence drift observations", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    const savedAudit = repo.saveSavedViewAuditEvent({
      id: "saved-view-created-1",
      viewId: "failed-deliveries-and-stale-summaries",
      label: "Stale summaries plus failed deliveries",
      action: "created",
      createdAt: "2026-05-25T10:00:00.000Z",
      detail: "Saved view was created from morning triage."
    });
    const snapshot = repo.saveOperationsReportSnapshot({
      id: "report-snapshot-1",
      scopeKey: "2026-05-25:incident-1",
      generatedAt: "2026-05-25T10:01:00.000Z",
      reportFreshness: {
        status: "newer_than_latest_receipt",
        summary: "Operations report is newer than the latest verification receipt.",
        reportGeneratedAt: "2026-05-25T10:01:00.000Z",
        latestVerificationReceiptCompletedAt: "2026-05-25T09:59:00.000Z",
        latestVerificationReceiptId: "verify-1",
        latestVerificationReceiptCommand: "npm run verify"
      },
      deliveryFailureCount: 2,
      queueDepth: 1,
      blockedGateCount: 1,
      recoveredEntryCount: 4
    });
    const observation = repo.saveEvidenceDriftObservation({
      id: "drift-1",
      scopeKey: "2026-05-25:incident-1",
      createdAt: "2026-05-25T10:02:00.000Z",
      report: {
        status: "drifting",
        summary: "Recovered evidence changed after the latest summary boundary.",
        issues: [{ id: "report_header_mismatch", severity: "warning", summary: "Recovered evidence summary is provisional." }],
        observationCount: 1
      }
    });

    expect(savedAudit).toMatchObject({ viewId: "failed-deliveries-and-stale-summaries", action: "created" });
    expect(repo.listSavedViewAuditEvents()).toEqual([savedAudit]);
    expect(snapshot).toMatchObject({ scopeKey: "2026-05-25:incident-1", queueDepth: 1, recoveredEntryCount: 4 });
    expect(repo.getLatestOperationsReportSnapshot("2026-05-25:incident-1")).toEqual(snapshot);
    expect(observation).toMatchObject({ scopeKey: "2026-05-25:incident-1", report: { status: "drifting" } });
    expect(repo.listEvidenceDriftObservations("2026-05-25:incident-1")).toEqual([observation]);
  });

  test("records real command receipts through the local verification runner", { timeout: 15000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), "openclog-verify-runner-"));
    tempDirs.push(dir);
    const filename = join(dir, "openclog.db");
    const repo = createSqliteRepository(filename);
    repos.push(repo);

    execFileSync(
      "npx",
      [
        "tsx",
        "scripts/run-and-record-verification.ts",
        "--label",
        "npm run docs:check",
        "--db",
        filename,
        "--",
        process.execPath,
        "-e",
        "console.log('runner ok')"
      ],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    expect(repo.listVerificationReceipts()).toEqual([
      expect.objectContaining({
        command: "npm run docs:check",
        status: "passed",
        summary: expect.stringContaining("exited 0")
      })
    ]);
  });

  test("records failed command receipts and preserves the failing exit code", { timeout: 15000 }, () => {
    const dir = mkdtempSync(join(tmpdir(), "openclog-verify-runner-fail-"));
    tempDirs.push(dir);
    const filename = join(dir, "openclog.db");
    const repo = createSqliteRepository(filename);
    repos.push(repo);
    let status = 0;

    try {
      execFileSync(
        "npx",
        [
          "tsx",
          "scripts/run-and-record-verification.ts",
          "--label",
          "npm run verify:gateway",
          "--db",
          filename,
          "--",
          process.execPath,
          "-e",
          "process.exit(7)"
        ],
        { cwd: process.cwd(), encoding: "utf8" }
      );
    } catch (error) {
      status = typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : -1;
    }

    expect(status).toBe(7);
    expect(repo.listVerificationReceipts()).toEqual([
      expect.objectContaining({
        command: "npm run verify:gateway",
        status: "failed",
        summary: expect.stringContaining("exited 7")
      })
    ]);
  });

  test("records direct helper pass, failure, signal, start error, and non-git receipts", () => {
    expect(buildVerificationReceiptId("!!!", "2026-05-10T10:02:03.004Z")).toBe("verification-verification-20260510T100203004Z");
    const dir = mkdtempSync(join(tmpdir(), "openclog-verify-helper-"));
    tempDirs.push(dir);
    const filename = join(dir, "openclog.db");
    expect(() => runAndRecordVerification({ args: [], dbPath: filename, label: "npm run verify" })).toThrow("verification_command_required");

    const passed = runAndRecordVerification({
      args: [process.execPath, "-e", "process.exit(0)"],
      dbPath: filename,
      label: "npm run docs:check",
      now: dates("2026-05-10T12:00:00.000Z", "2026-05-10T12:00:01.000Z")
    });
    const failed = runAndRecordVerification({
      args: [process.execPath, "-e", "process.exit(9)"],
      dbPath: filename,
      label: "npm run verify:gateway",
      now: dates("2026-05-10T12:01:00.000Z", "2026-05-10T12:01:01.000Z")
    });
    const signaled = runAndRecordVerification({
      args: [process.execPath, "-e", "process.kill(process.pid, 'SIGTERM')"],
      dbPath: filename,
      label: "npm run verify:desktop-native",
      now: dates("2026-05-10T12:02:00.000Z", "2026-05-10T12:02:01.000Z")
    });
    const startError = runAndRecordVerification({
      args: ["openclog-command-that-does-not-exist"],
      cwd: dir,
      dbPath: filename,
      label: "npm run test:visual",
      now: dates("2026-05-10T12:03:00.000Z", "2026-05-10T12:03:01.000Z")
    });

    expect(passed).toMatchObject({ exitCode: 0, receipt: { command: "npm run docs:check", status: "passed", summary: "npm run docs:check exited 0" } });
    expect(passed.receipt.commitSha).toEqual(expect.any(String));
    expect(failed).toMatchObject({ exitCode: 9, receipt: { command: "npm run verify:gateway", status: "failed", summary: "npm run verify:gateway exited 9" } });
    expect(signaled).toMatchObject({ exitCode: 1, receipt: { command: "npm run verify:desktop-native", status: "failed", summary: "npm run verify:desktop-native terminated by SIGTERM" } });
    expect(startError).toMatchObject({ exitCode: 1, receipt: { command: "npm run test:visual", status: "failed" } });
    expect(startError.receipt.summary).toContain("failed to start");
    expect(startError.receipt.commitSha).toBeUndefined();
  });

  test("omits commit metadata when git resolves to an empty value", () => {
    const dir = mkdtempSync(join(tmpdir(), "openclog-verify-empty-git-"));
    tempDirs.push(dir);
    const fakeGit = join(dir, "git");
    writeFileSync(fakeGit, "#!/bin/sh\nexit 0\n");
    chmodSync(fakeGit, 0o755);
    const filename = join(dir, "openclog.db");
    const originalPath = process.env.PATH;
    process.env.PATH = `${dir}:${originalPath ?? ""}`;
    try {
      const result = runAndRecordVerification({
        args: [process.execPath, "-e", "process.exit(0)"],
        dbPath: filename,
        label: "npm run verify"
      });
      expect(result.receipt).toMatchObject({ command: "npm run verify", status: "passed" });
      expect(result.receipt.commitSha).toBeUndefined();
    } finally {
      process.env.PATH = originalPath;
    }
  });

  test("hydrates generated summaries, retention counts, and reconnect/tool alert branches", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    repo.addEntry({
      id: "reconnect-only",
      dayKey: "2026-05-06",
      source: "system",
      kind: "system_status",
      title: "Gateway reconnected",
      body: "Recovered cleanly",
      timestamp: "2026-05-06T10:00:00.000Z",
      status: "success",
      severity: "warning",
      redacted: true
    });
    repo.addEntry({
      id: "tool-failure",
      dayKey: "2026-05-06",
      source: "tool",
      kind: "tool_result",
      title: "Tool failed",
      body: "failed once",
      timestamp: "2026-05-06T10:01:00.000Z",
      status: "failed",
      severity: "error",
      redacted: true
    });
    repo.generateSummary("2026-05-06", new Date("2026-05-06T11:00:00.000Z"));
    repo.upsertAlertRule({ id: "reconnect-storm", kind: "reconnect_storm", title: "Reconnect storm", threshold: 1, enabled: true });
    repo.upsertAlertRule({ id: "tool-failure-spike", kind: "tool_failure_spike", title: "Tool failures", threshold: 1, enabled: true });

    const day = repo.getDay("2026-05-06");
    const incidents = repo.listIncidents();
    const preview = repo.previewRetention({ keepDays: 0, includeAudit: true, includeRedactedEvents: true, includeSummaries: true });
    const findings = repo.evaluateAlertRules("2026-05-06");

    expect(day?.generatedSummary).toMatchObject({ summary: expect.stringContaining("1 failure, 0 approvals, 1 tool event") });
    expect(incidents).toEqual([
      expect.objectContaining({
        title: "Operational instability narrative",
        runbookSuggestions: [expect.objectContaining({ id: "gateway-reconnect-check" })]
      })
    ]);
    expect(preview).toMatchObject({
      removedSummaryCount: 1
    });
    expect(findings).toEqual([
      expect.objectContaining({ ruleId: "reconnect-storm", triggered: true }),
      expect.objectContaining({ ruleId: "tool-failure-spike", triggered: true })
    ]);
  });

  test("ignores resolved approvals when deriving incidents and runbook guidance", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    repo.addEntry({
      id: "approval-open",
      dayKey: "2026-05-09",
      source: "gateway",
      kind: "approval_requested",
      title: "Approval requested",
      body: "needs review",
      timestamp: "2026-05-09T10:00:00.000Z",
      status: "pending",
      severity: "warning",
      approvalId: "approval-9",
      redacted: true
    });
    repo.addEntry({
      id: "approval-closed",
      dayKey: "2026-05-09",
      source: "gateway",
      kind: "approval_resolved",
      title: "Approval resolved",
      body: "allow-once",
      timestamp: "2026-05-09T10:01:00.000Z",
      status: "approved",
      severity: "info",
      approvalId: "approval-9",
      redacted: true
    });

    expect(repo.listIncidents()).toEqual([]);
  });
});

function dates(...values: string[]): () => Date {
  let index = 0;
  return () => new Date(values[Math.min(index++, values.length - 1)]!);
}
