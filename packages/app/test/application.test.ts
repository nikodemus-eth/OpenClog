import { describe, expect, test } from "vitest";
import type { AlertFinding, AlertRule, JournalDay, JournalSearchResult, SessionDrilldown } from "@openclog/core";
import { createOpenClogApplication } from "../src/index.js";

function buildDay(dayKey: string, entryIds: string[]): JournalDay {
  return {
    dayKey,
    title: `Day ${dayKey}`,
    dateLabel: dayKey,
    entries: entryIds.map((id, index) => ({
      id,
      dayKey,
      source: "system",
      kind: "system_status",
      title: `Entry ${id}`,
      body: `Body ${id}`,
      timestamp: `${dayKey}T0${index}:00:00.000Z`,
      status: "info",
      severity: "info",
      redacted: true
    })),
    metrics: {
      sessionCount: 0,
      messageCount: 0,
      toolCallCount: 0,
      approvalCount: 0,
      errorCount: 0
    }
  };
}

describe("OpenClog application layer", () => {
  test("paginates search results and drilldowns with stable cursors", () => {
    const searchResults = [
      {
        entryId: "entry-3",
        dayKey: "2026-05-04",
        title: "Third",
        bodyPreview: "third",
        matchSnippet: "third snippet",
        matchFieldHints: ["body"],
        kind: "error",
        status: "failed"
      },
      {
        entryId: "entry-2",
        dayKey: "2026-05-04",
        title: "Second",
        bodyPreview: "second",
        matchSnippet: "second snippet",
        matchFieldHints: ["toolName", "status"],
        kind: "tool_result",
        status: "failed"
      },
      {
        entryId: "entry-1",
        dayKey: "2026-05-03",
        title: "First",
        bodyPreview: "first",
        matchSnippet: "first snippet",
        matchFieldHints: ["title"],
        kind: "system_status",
        status: "info"
      }
    ] satisfies JournalSearchResult[];
    const drilldown: SessionDrilldown = {
      sessionKey: "agent:hugin:main",
      entries: buildDay("2026-05-04", ["entry-1", "entry-2", "entry-3"]).entries,
      toolCount: 1,
      approvalCount: 0,
      reconnectCount: 1
    };
    const app = createOpenClogApplication({
      repo: {
        searchEntries: () => searchResults,
        getDrilldown: () => drilldown
      }
    });

    const firstSearchPage = app.searchEntries({ query: "entry", limit: 2 });
    const secondSearchPage = app.searchEntries({ query: "entry", limit: 2, cursor: firstSearchPage.nextCursor });
    const firstDrilldownPage = app.getSessionDrilldown({ sessionKey: "agent:hugin:main", limit: 2 });
    const secondDrilldownPage = app.getSessionDrilldown({
      sessionKey: "agent:hugin:main",
      limit: 2,
      cursor: firstDrilldownPage.nextCursor
    });

    expect(firstSearchPage).toMatchObject({
      items: [searchResults[0], searchResults[1]],
      nextCursor: "2"
    });
    expect(firstSearchPage.items[0]).toMatchObject({
      matchSnippet: "third snippet",
      matchFieldHints: ["body"]
    });
    expect(secondSearchPage).toMatchObject({
      items: [searchResults[2]],
      nextCursor: undefined
    });
    expect(firstDrilldownPage).toMatchObject({
      sessionKey: "agent:hugin:main",
      entries: drilldown.entries.slice(0, 2),
      nextCursor: "2"
    });
    expect(secondDrilldownPage).toMatchObject({
      sessionKey: "agent:hugin:main",
      entries: drilldown.entries.slice(2),
      nextCursor: undefined
    });
  });

  test("applies retention snapshots and rolls them back", () => {
    const days = [buildDay("2026-05-04", ["today"]), buildDay("2026-05-03", ["yesterday"])];
    const snapshots = new Map<string, unknown>();
    const app = createOpenClogApplication({
      repo: {
        listDays: () => days.map((day) => ({ ...day, entries: undefined })).map(({ entries: _entries, ...summary }) => summary),
        getDay: (dayKey: string) => days.find((day) => day.dayKey === dayKey) ?? null,
        previewRetention: () => ({
          keepDays: 1,
          removedDayKeys: ["2026-05-03"],
          removedEntryCount: 1,
          removedSummaryCount: 0,
          removedAuditCount: 0
        }),
        deleteDays(dayKeys: string[]) {
          for (const dayKey of dayKeys) {
            const index = days.findIndex((day) => day.dayKey === dayKey);
            if (index >= 0) days.splice(index, 1);
          }
        },
        saveRetentionSnapshot(snapshot: unknown & { id: string }) {
          snapshots.set(snapshot.id, snapshot);
          return snapshot;
        },
        getRetentionSnapshot(id: string) {
          return snapshots.get(id);
        },
        restoreRetentionSnapshot(snapshot: { days: JournalDay[] }) {
          days.splice(0, days.length, ...snapshot.days);
        }
      }
    });

    const applied = app.applyRetention({
      keepDays: 1,
      includeAudit: true,
      includeRedactedEvents: true,
      includeSummaries: true
    });

    expect(applied.preview.removedDayKeys).toEqual(["2026-05-03"]);
    expect(days.map((day) => day.dayKey)).toEqual(["2026-05-04"]);

    const rolledBack = app.rollbackRetention(applied.id);

    expect(rolledBack.restoredDayKeys).toEqual(["2026-05-04", "2026-05-03"]);
    expect(days.map((day) => day.dayKey)).toEqual(["2026-05-04", "2026-05-03"]);
  });

  test("tracks alert acknowledgement and snooze state while preserving findings", () => {
    const rules: AlertRule[] = [{ id: "reconnect-storm", kind: "reconnect_storm", title: "Reconnect storm", threshold: 2, enabled: true }];
    const findings: AlertFinding[] = [{ ruleId: "reconnect-storm", title: "Reconnect storm", triggered: true, detail: "Reconnect storm triggered." }];
    const alertState = new Map<string, { acknowledgedAt?: string; snoozedUntil?: string }>();
    const app = createOpenClogApplication({
      repo: {
        listAlertRules: () => rules,
        evaluateAlertRules: () => findings,
        setAlertState(ruleId: string, state: { acknowledgedAt?: string; snoozedUntil?: string }) {
          alertState.set(ruleId, state);
          return { ruleId, ...state };
        },
        getAlertState(ruleId: string) {
          return alertState.get(ruleId);
        }
      }
    });

    app.acknowledgeAlert({ ruleId: "reconnect-storm", acknowledgedAt: "2026-05-04T12:00:00.000Z" });
    app.snoozeAlert({ ruleId: "reconnect-storm", snoozedUntil: "2026-05-04T13:00:00.000Z" });
    const alerts = app.listAlerts({ dayKey: "2026-05-04" });

    expect(alerts).toMatchObject({
      rules,
      findings: [
        {
          ruleId: "reconnect-storm",
          triggered: true,
          acknowledgedAt: "2026-05-04T12:00:00.000Z",
          snoozedUntil: "2026-05-04T13:00:00.000Z"
        }
      ]
    });
  });

  test("builds incident workspace, investigation notes, bundle diffs, and closeout plans", () => {
    const incident = {
      id: "incident-1",
      title: "Gateway instability",
      summary: "Captured unstable reconnect period.",
      dayKeys: ["2026-05-04"],
      entryIds: ["entry-a", "entry-b"],
      createdAt: "2026-05-04T12:00:00.000Z",
      runbookSuggestions: [{ id: "gateway-check", title: "Check Gateway listener health", summary: "Verify listener", reason: "Reconnect observed" }]
    };
    const notes: Array<{ id: string; body: string; dayKey: string; incidentId?: string; author: string; linkedEntryIds: string[]; createdAt: string; updatedAt: string }> = [];
    const day = {
      ...buildDay("2026-05-04", ["entry-a", "entry-b"]),
      generatedSummary: { summary: "0 failures, 0 approvals.", createdAt: "2026-05-04T01:00:00.000Z", source: "rules" as const }
    };
    const app = createOpenClogApplication({
      repo: {
        getIncident: () => incident,
        listIncidents: () => [incident],
        getDay: () => day,
        listInvestigationNotes: (filter?: { incidentId?: string }) => notes.filter((note) => !filter?.incidentId || note.incidentId === filter.incidentId),
        saveInvestigationNote(note) {
          notes.push(note);
          return note;
        },
        evaluateAlertRules: () => [{ ruleId: "reconnect-storm", title: "Reconnect storm", triggered: true, detail: "Triggered" }],
        previewRetention: () => ({
          keepDays: 1,
          removedDayKeys: ["2026-05-03"],
          removedEntryCount: 2,
          removedSummaryCount: 1,
          removedAuditCount: 1
        })
      }
    });

    const saved = app.saveInvestigationNote({
      dayKey: "2026-05-04",
      incidentId: "incident-1",
      body: "Operator captured the reconnect sequence.",
      linkedEntryIds: ["entry-a"]
    });
    const workspace = app.getIncidentWorkspace({ incidentId: "incident-1" });
    const diff = app.diffReplayBundles({
      left: {
        manifest: { dayKey: "2026-05-03", version: "0.1.0" },
        day: { dayKey: "2026-05-03", summary: "before", entries: [{ id: "entry-a" }] },
        markdown: "# before"
      },
      right: {
        manifest: { dayKey: "2026-05-04", version: "0.1.1" },
        day: { dayKey: "2026-05-04", summary: "after", entries: [{ id: "entry-a" }, { id: "entry-b" }] },
        markdown: "# after"
      }
    });
    const closeout = app.buildCloseoutPlan({ dayKey: "2026-05-04", keepDays: 1, exportTargets: ["github-issue", "markdown-vault"] });

    expect(saved).toMatchObject({
      incidentId: "incident-1",
      body: "Operator captured the reconnect sequence.",
      linkedEntryIds: ["entry-a"]
    });
    expect(workspace).toMatchObject({
      incident,
      entries: [expect.objectContaining({ id: "entry-a" }), expect.objectContaining({ id: "entry-b" })],
      notes: [expect.objectContaining({ body: "Operator captured the reconnect sequence." })],
      alertFindings: [expect.objectContaining({ ruleId: "reconnect-storm", triggered: true })]
    });
    expect(workspace.suggestedNextActions).toContain("Check Gateway listener health");
    expect(diff).toMatchObject({
      changeClass: "evidence_shape",
      leftDayKey: "2026-05-03",
      rightDayKey: "2026-05-04",
      addedEntryIds: ["entry-b"],
      removedEntryIds: [],
      summaryChanged: true,
      markdownChanged: true,
      entryCountDelta: 1,
      changedManifestFields: expect.arrayContaining(["dayKey", "version"])
    });
    expect(closeout).toMatchObject({
      dayKey: "2026-05-04",
      incidentCount: 1,
      noteCount: 1,
      exportTargets: ["github-issue", "markdown-vault"]
    });
    expect(closeout.checklist).toContain("Generated summary is current.");
  });

  test("serves governance, delivery, replay, correlation, and plugin application methods", () => {
    const app = createOpenClogApplication({
      repo: {
        listRetentionClasses: () => [
          { id: "entries", label: "Journal entries", description: "Primary redacted evidence.", policy: { keepDays: 30, includeRollback: true }, updatedAt: "2026-05-04T00:00:00.000Z" }
        ],
        saveRetentionClass: (retentionClass) => retentionClass,
        previewRetentionByClass: () => [
          { classId: "entries", label: "Journal entries", impact: { beforeCount: 3, afterCount: 2, removedCount: 1, affectedIds: ["entry-1"] } }
        ],
        deliverIntegration: (target) => ({
          id: `receipt-${target}`,
          target,
          dayKey: "2026-05-04",
          title: "handoff",
          status: "failed",
          requestedAt: "2026-05-04T12:00:00.000Z",
          completedAt: "2026-05-04T12:00:01.000Z",
          errorCategory: "missing_config"
        }),
        listDeliveryReceipts: () => [
          {
            id: "receipt-slack",
            target: "slack",
            dayKey: "2026-05-04",
            title: "handoff",
            status: "failed",
            requestedAt: "2026-05-04T12:00:00.000Z",
            completedAt: "2026-05-04T12:00:01.000Z",
            errorCategory: "missing_config"
          }
        ],
        getLineage: () => ({
          entryId: "entry-1",
          rawEventHash: "hash-1",
          incidentIds: ["incident-1"],
          replayIds: ["replay:incident-1"],
          bundleExportIds: ["bundle-1"],
          deliveryReceiptIds: ["receipt-slack"]
        }),
        listSummaryProfiles: () => [{ id: "escalation", label: "Escalation summary", audience: "incident commander", instructions: "Summarize operator risk." }],
        generateSummaryProfile: () => ({
          profileId: "escalation",
          title: "Escalation summary",
          summary: "Escalation summary text.",
          citations: [{ entryId: "entry-1", title: "Entry 1", timestamp: "2026-05-04T12:00:00.000Z" }],
          createdAt: "2026-05-04T12:01:00.000Z"
        }),
        runIntegrityMonitor: () => ({
          id: "report-1",
          createdAt: "2026-05-04T12:02:00.000Z",
          ok: true,
          checks: [{ id: "schema_health", ok: true, detail: "ok" }]
        }),
        listIntegrityReports: () => [{ id: "report-1", createdAt: "2026-05-04T12:02:00.000Z", ok: true, checks: [{ id: "schema_health", ok: true, detail: "ok" }] }],
        getAnalytics: () => ({
          createdAt: "2026-05-04T12:03:00.000Z",
          noisyTools: [{ toolName: "get_repository_status", count: 2 }],
          reconnectHeavyDays: [{ dayKey: "2026-05-04", reconnectCount: 1 }],
          approvalHotspots: [{ dayKey: "2026-05-04", approvalCount: 1 }],
          recurringFailureClasses: [{ label: "tool_failure", count: 1 }]
        }),
        buildMissionReplay: () => ({
          incidentId: "incident-1",
          title: "Replay",
          generatedAt: "2026-05-04T12:04:00.000Z",
          steps: [{ id: "step-1", kind: "entry", entryIds: ["entry-1"], timestamp: "2026-05-04T12:00:00.000Z", label: "Entry 1", derived: false, sourceIds: ["entry-1"] }]
        }),
        buildCorrelationGraph: () => ({
          incidentId: "incident-1",
          nodes: [{ id: "incident-1", type: "incident", label: "Incident" }],
          edges: []
        }),
        listPlugins: () => [{ id: "plugin-1", label: "Plugin", version: "0.1.0", capabilities: ["annotation"], readScopes: ["entries"] }],
        registerPlugin: (plugin) => plugin,
        runPlugin: (pluginId) => ({ id: "run-1", pluginId, status: "completed", createdAt: "2026-05-04T12:05:00.000Z", summary: "Plugin completed." }),
        listHealthTimeline: () => [{ id: "timeline-1", timestamp: "2026-05-04T12:06:00.000Z", category: "reconnect", title: "Gateway reconnected", detail: "reconnect observed." }]
      }
    });

    expect(app.listRetentionClasses()).toHaveLength(1);
    expect(app.saveRetentionClass({ id: "entries", keepDays: 14 })).toMatchObject({ id: "entries", policy: { keepDays: 14, includeRollback: true } });
    expect(app.previewRetentionByClass()[0].impact.removedCount).toBe(1);
    expect(app.deliverIntegration({ target: "slack", dayKey: "2026-05-04" })).toMatchObject({ target: "slack", status: "failed" });
    expect(app.listDeliveryReceipts().items).toHaveLength(1);
    expect(app.getLineage({ entryId: "entry-1" })).toMatchObject({ incidentIds: ["incident-1"] });
    expect(app.listSummaryProfiles()).toHaveLength(1);
    expect(app.generateSummaryProfile({ profileId: "escalation", dayKey: "2026-05-04" }).citations).toHaveLength(1);
    expect(app.runIntegrityMonitor()).toMatchObject({ ok: true });
    expect(app.listIntegrityReports()).toHaveLength(1);
    expect(app.getAnalytics().noisyTools[0]).toMatchObject({ toolName: "get_repository_status" });
    expect(app.buildMissionReplay({ incidentId: "incident-1" }).steps).toHaveLength(1);
    expect(app.buildCorrelationGraph({ incidentId: "incident-1" }).nodes).toHaveLength(1);
    expect(app.listPlugins()).toHaveLength(1);
    expect(app.registerPlugin({ id: "plugin-2", label: "Plugin 2", version: "0.1.0", capabilities: ["annotation"], readScopes: ["entries"] })).toMatchObject({ id: "plugin-2" });
    expect(app.runPlugin({ pluginId: "plugin-1" })).toMatchObject({ status: "completed" });
    expect(app.listHealthTimeline({ limit: 5 }).items[0]).toMatchObject({ category: "reconnect" });
  });
});
