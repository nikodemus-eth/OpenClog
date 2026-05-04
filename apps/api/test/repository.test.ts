import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, test } from "vitest";
import { createSqliteRepository } from "../src/repository.js";
import { journalTableNames } from "../src/schema.js";
import { sampleJournalDay, toPersistableRedactedEvent, type JournalDay } from "@openclog/core";

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
      source: "tool",
      kind: "tool_result",
      title: "Tool finished",
      body: "done",
      timestamp: "2026-05-08T10:00:00.000Z",
      status: "success",
      severity: "info",
      sessionId: "agent:hugin:main",
      approvalId: "approval-8",
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
  });

  test("returns empty incidents and profiles when none exist", () => {
    const repo = createSqliteRepository(":memory:");
    repos.push(repo);

    expect(repo.listProfiles()).toEqual([]);
    expect(repo.listIncidents()).toEqual([]);
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
