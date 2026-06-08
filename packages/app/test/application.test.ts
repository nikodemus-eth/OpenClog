import { describe, expect, test } from "vitest";
import type { AlertFinding, AlertRule, CapabilityManifest, DeliveryReceipt, IncidentHandoffPacket, JournalDay, JournalSearchResult, OperatorViewPreset, SavedViewAuditEvent, SessionDrilldown, SummaryJob } from "@openclog/core";
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

function buildBackfilledOpenClawDay(dayKey: string, count: number, latestImportedAt: string): JournalDay {
  return {
    ...buildDay(dayKey, []),
    entries: Array.from({ length: count }, (_, index) => ({
      id: `${dayKey}-openclaw-backfill-${index + 1}`,
      dayKey,
      source: "openclaw" as const,
      sourceLabel: "Backfilled from OpenClaw",
      kind: "assistant_message" as const,
      title: "OpenClaw response",
      body: `Recovered OpenClaw session message ${index + 1}`,
      timestamp: `${dayKey}T22:${String(index).padStart(2, "0")}:00.000Z`,
      status: "info" as const,
      severity: "info" as const,
      sessionId: "openclaw:session:real-log",
      backfilled: true,
      importedAt: index === count - 1 ? latestImportedAt : "2026-05-20T22:17:21.955Z",
      redacted: true
    })),
    metrics: {
      sessionCount: 1,
      messageCount: count,
      toolCallCount: 0,
      approvalCount: 0,
      errorCount: 0
    }
  };
}

describe("OpenClog application layer", () => {
  test("records saved-view deletion audit events when persisted views are removed", () => {
    const savedView: OperatorViewPreset = {
      id: "saved-scope-review",
      label: "Saved scope review",
      searchQuery: "scope missing",
      activeFilters: ["errors"],
      grouped: true,
      drilldown: { tab: "timeline", scrollTop: 0 }
    };
    const savedEvents: SavedViewAuditEvent[] = [];
    const settings = new Map<string, unknown>([
      [
        "settings.v2",
        {
          version: 2,
          theme: "default",
          showToolCalls: true,
          searchPresets: [],
          operatorViews: [savedView]
        }
      ]
    ]);
    const app = createOpenClogApplication({
      repo: {
        getSetting: <T,>(key: string, fallback: T) => (settings.has(key) ? (settings.get(key) as T) : fallback),
        setSetting: (key: string, value: unknown) => {
          settings.set(key, value);
        },
        saveSavedViewAuditEvent: (event: SavedViewAuditEvent) => {
          savedEvents.push(event);
          return event;
        }
      }
    });

    app.updateSettings({ operatorViews: [] });

    expect(savedEvents).toEqual([
      expect.objectContaining({
        viewId: "saved-scope-review",
        label: "Saved scope review",
        action: "deleted",
        detail: "Saved view Saved scope review was deleted."
      })
    ]);
  });

  test("bounds operations-report summary jobs and ledger entries while preserving totals", () => {
    const jobs = Array.from({ length: 125 }, (_, index): SummaryJob => {
      const sequence = String(index + 1).padStart(3, "0");
      return {
        id: `summary-job-${sequence}`,
        dayKey: "2026-05-27",
        status: "completed",
        createdAt: `2026-05-27T12:${String(index % 60).padStart(2, "0")}:00.000Z`,
        startedAt: `2026-05-27T12:${String(index % 60).padStart(2, "0")}:01.000Z`,
        completedAt: `2026-05-27T12:${String(index % 60).padStart(2, "0")}:02.000Z`
      };
    });
    const app = createOpenClogApplication({
      repo: {
        getDay: () => buildDay("2026-05-27", ["entry-1"]),
        listSummaryJobs: () => jobs,
        listDeliveryReceipts: () => [],
        listVerificationReceipts: () => [],
        listNativeRunnerHistory: () => [],
        listIncidentActionRecords: () => [],
        listHealthTimeline: () => [],
        getHealthAggregate: () => ({ createdAt: "2026-05-27T12:00:00.000Z", reconnectCount: 0, staleCount: 0, recoveryCount: 0, adapterFailureCount: 0 }),
        getSloSnapshot: () => ({ createdAt: "2026-05-27T12:00:00.000Z", gatewayFreshnessOk: true, staleSummaryCount: 0, failedDeliveryCount: 0, retryBacklogCount: 0, reconnectHeavyDayCount: 0, baselines: [] }),
        getSetting: () => ({ operatorViews: [] }),
        getLatestOperationsReportSnapshot: () => undefined,
        saveOperationsReportSnapshot: (snapshot) => snapshot,
        listEvidenceDriftObservations: () => [],
        saveEvidenceDriftObservation: (observation) => observation,
        listRouteBudgetObservations: () => [],
        previewRetention: () => ({ keepDays: 1, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0 })
      }
    });

    const report = app.getOperationsBacklog({ dayKey: "2026-05-27" });

    expect(report.summaryJobHistory.totalJobCount).toBe(125);
    expect(report.summaryJobHistory.jobs.length).toBeLessThanOrEqual(50);
    expect(report.operationsLedger.totalEntryCount).toBeGreaterThan(report.operationsLedger.entries.length);
    expect(report.operationsLedger.entries.length).toBeLessThanOrEqual(100);
    const operationsBudget = report.routePerformanceBudgets.find((budget) => budget.route === "/api/operations/report");
    expect(operationsBudget).toMatchObject({ route: "/api/operations/report", observedMs: 450, status: "ok" });
    expect(operationsBudget).not.toHaveProperty("percentileLabel");
    expect(operationsBudget).not.toHaveProperty("percentileValue");
  });

  test("uses a bounded summary-job report slice and records repository query timing", () => {
    const sliceJobs: SummaryJob[] = [
      {
        id: "summary-job-recent",
        dayKey: "2026-05-27",
        status: "queued",
        createdAt: "2026-05-27T12:05:00.000Z"
      }
    ];
    const app = createOpenClogApplication({
      repo: {
        getDay: () => buildDay("2026-05-27", ["entry-1"]),
        listSummaryJobs: () => {
          throw new Error("operations report should use the bounded summary-job slice");
        },
        getSummaryJobReportSlice: () => ({
          jobs: sliceJobs,
          totalJobCount: 125,
          queueDepth: 1,
          oldestWaitingCreatedAt: "2026-05-27T12:05:00.000Z",
          medianCompletionMs: 2000
        }),
        listDeliveryReceipts: () => [],
        listVerificationReceipts: () => [],
        listNativeRunnerHistory: () => [],
        listIncidentActionRecords: () => [],
        listHealthTimeline: () => [],
        getHealthAggregate: () => ({ createdAt: "2026-05-27T12:00:00.000Z", reconnectCount: 0, staleCount: 0, recoveryCount: 0, adapterFailureCount: 0 }),
        getSloSnapshot: () => ({ createdAt: "2026-05-27T12:00:00.000Z", gatewayFreshnessOk: true, staleSummaryCount: 0, failedDeliveryCount: 0, retryBacklogCount: 0, reconnectHeavyDayCount: 0, baselines: [] }),
        getSetting: () => ({ operatorViews: [] }),
        getLatestOperationsReportSnapshot: () => undefined,
        saveOperationsReportSnapshot: (snapshot) => snapshot,
        listEvidenceDriftObservations: () => [],
        saveEvidenceDriftObservation: (observation) => observation,
        listRouteBudgetObservations: () => [],
        previewRetention: () => ({ keepDays: 1, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0 })
      }
    });

    const report = app.getOperationsBacklog({ dayKey: "2026-05-27" });

    expect(report.summaryJobHistory.totalJobCount).toBe(125);
    expect(report.summaryJobHistory.queueDepth).toBe(1);
    expect(report.summaryJobHistory.jobs).toEqual([expect.objectContaining({ id: "summary-job-recent", medianCompletionMs: 2000 })]);
    expect(report.reportAssemblyTiming.slowestSections).toEqual(
      [...report.reportAssemblyTiming.slowestSections].sort((left, right) => right.durationMs - left.durationMs)
    );
    expect(report.reportAssemblyTiming.sections).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "sqlite.getSummaryJobReportSlice", category: "repository_query", rowCount: 1 })])
    );
  });

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

  test("coordinates roadmap reliability contracts from shared application seams", () => {
    const receipts: DeliveryReceipt[] = [
      {
        id: "receipt-failed",
        target: "slack",
        dayKey: "2026-05-04",
        incidentId: "incident-1",
        title: "handoff",
        status: "failed",
        requestedAt: "2026-05-04T12:00:00.000Z",
        completedAt: "2026-05-04T12:00:01.000Z",
        correlationId: "corr-1",
        retryCount: 0,
        idempotencyKey: "incident-1:slack",
        requestFingerprint: "fingerprint-1",
        errorCategory: "missing_config",
        deadLetterReason: "delivery target is not configured"
      }
    ];
    const summaryDay = {
      ...buildDay("2026-05-04", ["entry-a", "entry-b"]),
      generatedSummary: {
        summary: "stale",
        createdAt: "2026-05-04T00:00:00.000Z",
        source: "rules" as const,
        lastEntryIncludedAt: "2026-05-04T00:00:00.000Z",
        latestEntryObservedAt: "2026-05-04T01:00:00.000Z",
        freshnessState: "stale" as const
      }
    };
    const app = createOpenClogApplication({
      repo: {
        getBackendFingerprint: () => ({
          id: "boot-1",
          pid: 1001,
          bootedAt: "2026-05-04T12:00:00.000Z",
          runtimeFingerprint: "runtime-1",
          commitSha: "abc1234",
          buildTimestamp: "2026-05-04T11:59:00.000Z",
          nodeVersion: "v26.0.0"
        }),
        listDeliveryReceipts: () => receipts,
        retryDeliveryReceipt(id) {
          const original = receipts.find((receipt) => receipt.id === id);
          if (!original) throw new Error("receipt_not_found");
          const retry: DeliveryReceipt = {
            ...original,
            id: "receipt-retry",
            status: "failed",
            requestedAt: "2026-05-04T12:02:00.000Z",
            completedAt: "2026-05-04T12:02:01.000Z",
            correlationId: "corr-2",
            retryCount: 1,
            attemptNumber: 2,
            retryOfReceiptId: original.id,
            idempotencyKey: original.idempotencyKey
          };
          receipts.unshift(retry);
          return retry;
        },
        verifyIntegrationTarget: (target) => ({
          id: `receipt-${target}-verify`,
          target,
          dayKey: "2026-05-04",
          title: "dry-run verification",
          status: "delivered",
          requestedAt: "2026-05-04T12:03:00.000Z",
          completedAt: "2026-05-04T12:03:00.000Z",
          correlationId: "corr-verify",
          retryCount: 0,
          attemptNumber: 1,
          dryRun: true,
          requestFingerprint: `verify-${target}`,
          deliveryReference: "dry-run"
        }),
        getDay: () => summaryDay,
        previewRetention: () => ({ keepDays: 1, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0 }),
        listIncidents: () => [{ id: "incident-1", title: "Incident", summary: "Summary", dayKeys: ["2026-05-04"], entryIds: ["entry-a"], createdAt: "2026-05-04T12:00:00.000Z", runbookSuggestions: [], loopProgress: { detect: true, explain: true, recommend: true, act: false, record: false } }],
        listInvestigationNotes: () => [{ id: "note-1", dayKey: "2026-05-04", incidentId: "incident-1", author: "operator", body: "note", linkedEntryIds: ["entry-a"], createdAt: "2026-05-04T12:01:00.000Z", updatedAt: "2026-05-04T12:01:00.000Z" }],
        completeCloseout: () => ({
          id: "closeout-1",
          dayKey: "2026-05-04",
          completedAt: "2026-05-04T12:04:00.000Z",
          blocked: false,
          checklist: ["Generated summary is current."],
          receiptIds: ["receipt-failed"]
        }),
        listVerificationReceipts: () => [
          { id: "verify-1", command: "npm run verify", status: "passed", startedAt: "2026-05-04T12:05:00.000Z", completedAt: "2026-05-04T12:06:00.000Z", summary: "verify passed" }
        ],
        createInvestigationWorkspace: () => ({
          id: "workspace-1",
          dayKeys: ["2026-05-04", "2026-05-05"],
          incidentIds: ["incident-1"],
          createdAt: "2026-05-04T12:07:00.000Z",
          title: "Two day outage",
          summary: "2 days stitched."
        }),
        getInvestigationWorkspace: () => ({
          id: "workspace-1",
          dayKeys: ["2026-05-04", "2026-05-05"],
          incidentIds: ["incident-1"],
          createdAt: "2026-05-04T12:07:00.000Z",
          title: "Two day outage",
          summary: "2 days stitched."
        }),
        getRemoteOpsPolicy: () => ({
          enabled: false,
          environmentLabel: "local",
          allowedOrigins: ["http://127.0.0.1:5173"],
          secretAccess: "fail-closed"
        })
      }
    });

    expect(app.getBackendFingerprint()).toMatchObject({ runtimeFingerprint: "runtime-1", pid: 1001 });
    expect(app.getDeliveryReceipt({ id: "receipt-failed" })).toMatchObject({ requestFingerprint: "fingerprint-1" });
    expect(app.retryDeliveryReceipt({ id: "receipt-failed" })).toMatchObject({ retryOfReceiptId: "receipt-failed", attemptNumber: 2 });
    expect(app.verifyIntegrationTarget({ target: "slack", dayKey: "2026-05-04" })).toMatchObject({ dryRun: true, deliveryReference: "dry-run" });
    expect(app.completeCloseout({ dayKey: "2026-05-04", exportTargets: ["slack"] })).toMatchObject({ blocked: false, receiptIds: ["receipt-failed"] });
    expect(app.listVerificationReceipts()[0]).toMatchObject({ command: "npm run verify", status: "passed" });
    expect(app.createInvestigationWorkspace({ dayKeys: ["2026-05-04", "2026-05-05"], title: "Two day outage" })).toMatchObject({ dayKeys: ["2026-05-04", "2026-05-05"] });
    expect(app.getInvestigationWorkspace({ id: "workspace-1" })).toMatchObject({ id: "workspace-1" });
    expect(app.getRemoteOpsPolicy()).toMatchObject({ enabled: false, secretAccess: "fail-closed" });
  });

  test("does not treat focused verify receipts as the latest full verify for current HEAD freshness", () => {
    const app = createOpenClogApplication({
      repo: {
        getBackendFingerprint: () => ({
          id: "boot-current",
          pid: 1001,
          bootedAt: "2026-05-27T12:00:00.000Z",
          runtimeFingerprint: "runtime-current",
          commitSha: "current123",
          buildTimestamp: "2026-05-27T12:00:00.000Z",
          nodeVersion: "v26.0.0"
        }),
        getDay: () => buildDay("2026-05-27", []),
        listDeliveryReceipts: () => [],
        listVerificationReceipts: () => [
          {
            id: "verify-full-old",
            command: "npm run verify",
            status: "passed",
            startedAt: "2026-05-27T12:01:00.000Z",
            completedAt: "2026-05-27T12:02:00.000Z",
            summary: "Full verify passed before current HEAD.",
            commitSha: "old123"
          },
          {
            id: "verify-gateway-current",
            command: "npm run verify:gateway",
            status: "passed",
            startedAt: "2026-05-27T12:03:00.000Z",
            completedAt: "2026-05-27T12:04:00.000Z",
            summary: "Focused gateway verify passed at current HEAD.",
            commitSha: "current123"
          }
        ]
      }
    });

    const report = (app as never as { getOperationsBacklog(input: { dayKey: string }): { reportFreshness: { latestSuccessfulVerifyPredatesHead?: boolean } } }).getOperationsBacklog({
      dayKey: "2026-05-27"
    });

    expect(report.reportFreshness.latestSuccessfulVerifyPredatesHead).toBe(true);
  });

  test("builds the full 30-item operations backlog report from local evidence", () => {
    const summaryDay: JournalDay = {
      ...buildDay("2026-05-08", ["entry-a", "entry-b", "entry-c"]),
      entries: [
        ...buildDay("2026-05-08", ["entry-a", "entry-b", "entry-c"]).entries,
        {
          id: "entry-backfilled-openclaw",
          dayKey: "2026-05-08",
          source: "openclaw",
          sourceLabel: "Backfilled from OpenClaw",
          kind: "assistant_message",
          title: "Recovered OpenClaw evidence",
          body: "Recovered session note",
          timestamp: "2026-05-08T12:05:00.000Z",
          status: "info",
          severity: "info",
          sessionId: "openclaw:session:1",
          backfilled: true,
          importedAt: "2026-05-08T12:05:00.000Z",
          redacted: true
        }
      ],
      generatedSummary: {
        summary: "Older summary.",
        createdAt: "2026-05-08T12:00:02.000Z",
        source: "rules" as const,
        lastEntryIncludedAt: "2026-05-08T12:00:00.000Z",
        latestEntryObservedAt: "2026-05-08T12:05:00.000Z",
        freshnessState: "stale" as const
      }
    };
    const failedReceipt: DeliveryReceipt = {
      id: "receipt-slack-failed",
      target: "slack",
      dayKey: "2026-05-08",
      incidentId: "incident-1",
      title: "Slack handoff",
      status: "failed",
      requestedAt: "2026-05-08T12:03:00.000Z",
      completedAt: "2026-05-08T12:03:05.000Z",
      correlationId: "corr-slack-1",
      retryCount: 0,
      idempotencyKey: "incident-1:slack",
      requestFingerprint: "fingerprint-1",
      dryRun: true,
      errorCategory: "missing_config",
      deadLetterReason: "delivery target is not configured"
    };
    const app = createOpenClogApplication({
      repo: {
        getBackendFingerprint: () => ({
          id: "boot-1",
          pid: 1001,
          bootedAt: "2026-05-08T12:00:00.000Z",
          runtimeFingerprint: "runtime-1",
          commitSha: "abc1234",
          buildTimestamp: "2026-05-08T11:59:00.000Z",
          nodeVersion: "v26.0.0"
        }),
        getDay: () => summaryDay,
        listDays: () => [{ ...summaryDay, entries: [] }],
        listSummaryJobs: () => [
          {
            id: "summary-job-1",
            dayKey: "2026-05-08",
            status: "completed",
            createdAt: "2026-05-08T12:00:00.000Z",
            startedAt: "2026-05-08T12:00:02.000Z",
            completedAt: "2026-05-08T12:00:07.000Z",
            progressLabel: "Summary generated.",
            generatedSummary: summaryDay.generatedSummary,
            correlationId: "corr-summary-1",
            requestedBy: "local-operator",
            reusedExistingJob: false
          }
        ],
        listDeliveryReceipts: () => [failedReceipt],
        listIncidents: () => [
          {
            id: "incident-1",
            title: "Gateway incident",
            summary: "Gateway scopes missing and delivery failed.",
            dayKeys: ["2026-05-08"],
            entryIds: ["entry-a", "entry-b"],
            createdAt: "2026-05-08T12:02:00.000Z",
            runbookSuggestions: [],
            loopProgress: { detect: true, explain: true, recommend: true, act: false, record: false },
            handoffPacketIds: ["packet-1"]
          }
        ],
        listIncidentActionRecords: () => [
          {
            id: "action-1",
            incidentId: "incident-1",
            kind: "deliver_slack",
            title: "Notify Slack",
            status: "failed",
            summary: "Slack delivery failed closed.",
            createdAt: "2026-05-08T12:03:06.000Z",
            receiptId: "receipt-slack-failed",
            metadata: { correlationId: "corr-slack-1" }
          }
        ],
        listInvestigationNotes: () => [
          { id: "note-1", dayKey: "2026-05-08", incidentId: "incident-1", author: "operator", body: "Validated stale summary.", linkedEntryIds: ["entry-b"], createdAt: "2026-05-08T12:04:00.000Z", updatedAt: "2026-05-08T12:04:00.000Z" }
        ],
        listIncidentHandoffPackets: () => [
          { id: "packet-1", incidentId: "incident-1", dayKey: "2026-05-08", title: "Gateway packet", summary: "Packet", body: "Body", createdAt: "2026-05-08T12:04:30.000Z", deliveryTargets: ["slack"], provenance: { sourceWorkflow: ["manual"], sourceHash: "sha256-packet", importedAt: "2026-05-08T12:04:30.000Z", lineNumbers: [], redactionCount: 0, redactedPaths: [] } }
        ],
        listVerificationReceipts: () => [
          { id: "verify-main", command: "verify", status: "passed", startedAt: "2026-05-08T12:04:00.000Z", completedAt: "2026-05-08T12:04:20.000Z", summary: "Repo verify passed." },
          { id: "smoke-main", command: "test:smoke", status: "passed", startedAt: "2026-05-08T12:04:21.000Z", completedAt: "2026-05-08T12:04:25.000Z", summary: "Smoke verify passed." },
          { id: "verify-gateway-failed", command: "verify:gateway", status: "failed", startedAt: "2026-05-08T12:04:30.000Z", completedAt: "2026-05-08T12:04:50.000Z", summary: "Gateway missing operator.approvals.", commitSha: "abc1222" },
          { id: "verify-gateway", command: "verify:gateway", status: "passed", startedAt: "2026-05-08T12:05:00.000Z", completedAt: "2026-05-08T12:05:30.000Z", summary: "Gateway ready.", commitSha: "abc1234" },
          { id: "verify-desktop", command: "verify:desktop-native", status: "passed", startedAt: "2026-05-08T12:06:00.000Z", completedAt: "2026-05-08T12:06:10.000Z", summary: "Desktop self-check passed." },
          { id: "verify-docs", command: "docs:check", status: "passed", startedAt: "2026-05-08T12:06:30.000Z", completedAt: "2026-05-08T12:06:40.000Z", summary: "Docs check passed.", commitSha: "abc1234" }
        ],
        listNativeRunnerHistory: () => [
          {
            id: "desktop-self-check-local-20260508T120700000Z",
            receiptId: "desktop-self-check:http_127_0_0_1_3000:20260508T120700000Z",
            createdAt: "2026-05-08T12:07:00.000Z",
            generatedAt: "2026-05-08T12:07:00.000Z",
            observedApiBase: "http://127.0.0.1:3000",
            divergenceSummary: "Desktop self-check agrees with public Gateway readiness.",
            status: "passed",
            source: "desktop",
            checks: [
              { id: "api_liveness", status: "ok", detail: "API health responded at http://127.0.0.1:3000/api/health." },
              { id: "gateway_readiness", status: "ok", detail: "Gateway readiness is ready in public health." },
              { id: "launch_agent", status: "ok", detail: "LaunchAgent com.m4.openclog-api is loaded." },
              { id: "sqlite_integrity", status: "ok", detail: "SQLite repository path is present at /Users/m4/OpenClog/openclog.db." },
              { id: "secret_store", status: "ok", detail: "macOS Keychain backend is available for configured delivery secrets." }
            ]
          }
        ],
        listHealthTimeline: () => [
          { id: "health-1", timestamp: "2026-05-08T12:01:00.000Z", category: "stale", title: "Backend fingerprint changed", detail: "Runtime drift observed." },
          { id: "health-2", timestamp: "2026-05-08T12:02:00.000Z", category: "reconnect", title: "Gateway reconnected", detail: "Reconnect attempt completed." }
        ],
        listHealthHistory: () => [
          { id: "hist-1", entryId: "entry-a", dayKey: "2026-05-08", title: "Gateway scope missing", timestamp: "2026-05-08T12:01:00.000Z", category: "gateway_error" }
        ],
        getHealthAggregate: () => ({ createdAt: "2026-05-08T12:06:00.000Z", reconnectCount: 1, staleCount: 1, recoveryCount: 1, adapterFailureCount: 1, latestErrorCategory: "scope" }),
        getSloSnapshot: () => ({
          createdAt: "2026-05-08T12:06:00.000Z",
          gatewayFreshnessOk: true,
          staleSummaryCount: 1,
          failedDeliveryCount: 1,
          retryBacklogCount: 1,
          reconnectHeavyDayCount: 0,
          baselines: [
            { id: "summary-jobs", label: "Summary jobs", current: 340, baseline: 250, status: "breach" },
            { id: "incidents", label: "Incidents", current: 120, baseline: 300, status: "ok" },
            { id: "health", label: "Health", current: 75, baseline: 100, status: "ok" }
          ]
        }),
        getSetting: () => ({
          operatorViews: [
            {
              id: "saved-scope-review",
              label: "Saved scope review",
              searchQuery: "scope missing",
              activeFilters: ["errors"],
              grouped: true,
              hypothesis: "Gateway scope grant is stale.",
              validationSteps: ["Copy missing scopes", "Re-run verify:gateway"]
            }
          ]
        }),
        listPlugins: () => [{ id: "plugin-1", label: "Plugin", version: "0.1.0", capabilities: ["annotation"], readScopes: ["entries"], supportsDryRun: true, reviewBy: "2026-06-08" }],
        listCapabilityManifests: () => [],
        getIntegrityReport: () => ({ ok: true, checkedEntries: 3, mismatchedEntryIds: [], missingRedactedHashes: [] }),
        listIntegrityReports: () => [],
        runIntegrityMonitor: () => ({ id: "integrity-1", createdAt: "2026-05-08T12:06:00.000Z", ok: true, checks: [] }),
        buildMissionReplay: () => ({ incidentId: "incident-1", title: "Gateway replay", generatedAt: "2026-05-08T12:06:00.000Z", steps: [{ id: "step-1", kind: "entry", entryIds: ["entry-a"], timestamp: "2026-05-08T12:00:00.000Z", label: "Gateway event", derived: false, sourceIds: ["entry-a"] }] }),
        buildCorrelationGraph: () => ({
          incidentId: "incident-1",
          nodes: [{ id: "incident-1", type: "incident", label: "Gateway incident" }, { id: "receipt-slack-failed", type: "delivery_receipt", label: "Slack failed" }],
          edges: [{ id: "edge-1", from: "incident-1", to: "receipt-slack-failed", relationship: "exported_to" }]
        }),
        createReplayWorkspace: () => ({ id: "replay-1", sourceDayKey: "2026-05-08", createdAt: "2026-05-08T12:07:00.000Z", entries: summaryDay.entries, notes: [], incidentIds: ["incident-1"], verification: { verified: true, digest: "digest", reasons: [] } }),
        generateOperatorRunbook: () => ({ generatedAt: "2026-05-08T12:07:00.000Z", sections: [{ title: "Delivery failures", items: ["Retry failed delivery with same idempotency key after confirmation."] }] }),
        getRemoteOpsPolicy: () => ({ enabled: false, environmentLabel: "local", allowedOrigins: ["http://127.0.0.1:5173"], secretAccess: "fail-closed" }),
        evaluateAlertRules: () => [{ ruleId: "stale-summary", title: "Stale summary", triggered: true, detail: "Summary is stale." }],
        listSavedViewAuditEvents: () => [
          {
            id: "saved-view-created-1",
            viewId: "saved-scope-review",
            label: "Saved scope review",
            action: "created",
            createdAt: "2026-05-08T12:01:30.000Z",
            detail: "Saved view was created from triage."
          }
        ],
        getLatestOperationsReportSnapshot: () => ({
          id: "previous-report-snapshot",
          scopeKey: "2026-05-08:incident-1",
          generatedAt: "2026-05-08T12:03:00.000Z",
          reportFreshness: {
            status: "older_than_latest_receipt",
            summary: "Older snapshot.",
            reportGeneratedAt: "2026-05-08T12:03:00.000Z",
            latestVerificationReceiptCompletedAt: "2026-05-08T12:04:20.000Z",
            latestVerificationReceiptId: "verify-main",
            latestVerificationReceiptCommand: "verify"
          },
          deliveryFailureCount: 0,
          queueDepth: 0,
          blockedGateCount: 0,
          recoveredEntryCount: 0
        }),
        saveOperationsReportSnapshot: (snapshot) => snapshot,
        listEvidenceDriftObservations: () => [],
        saveEvidenceDriftObservation: (observation) => observation
      } as never
    });

    const report = (app as never as { getOperationsBacklog(input: { dayKey: string; incidentId: string }): unknown }).getOperationsBacklog({
      dayKey: "2026-05-08",
      incidentId: "incident-1"
    }) as {
      summaryJobHistory: {
        jobs: Array<{ queuedForMs: number; runningForMs: number; medianCompletionMs: number; correlationId?: string; requestedBy?: string; reusedExistingJob?: boolean }>;
        days: Array<{ dayKey: string; completedCount: number; failedCount: number; queuedCount: number; runningCount: number }>;
        queueDepth: number;
        oldestWaitingAgeLabel?: string;
      };
      incidentEvidenceChecklist: { ready: boolean; items: Array<{ id: string; present: boolean }> };
      verificationCenter: {
        gates: Array<{ id: string; status: string }>;
        receipts: Array<{ id: string; ageLabel?: string; freshness?: string }>;
        firstBlockedGateId?: string;
        readinessScore: number;
        readinessLabel: string;
        lastSuccessfulVerifyAt?: string;
        lastSuccessfulVerifyAgeLabel?: string;
        lastSuccessfulVerifyFreshness?: string;
        lastSuccessfulGatewayVerifyAt?: string;
        lastSuccessfulDesktopVerifyAt?: string;
        lastSuccessfulDocsCheckAt?: string;
        docsCheckedCommitSha?: string;
      };
      deliveryLedger: { items: Array<{ id: string; sameKeyRetryRequiresConfirmation: boolean; retryPolicy?: { nextAttemptUsesNewIdempotencyKey: boolean } }> };
      evidenceQualityScores: Array<{ incidentId?: string; dayKey?: string; score: number; grade: string }>;
      deliveryTargetHealth: Array<{ target: string; status: string; receiptCount24h: number; failedCount24h: number; trend: string }>;
      incidentTimeline: { startDayKey: string; endDayKey: string; events: Array<{ kind: string }> };
      readinessHistory: { points: Array<{ backendHealthy: boolean; gatewayStatus: string }> };
      guidedIncidentCommand: { stages: Array<{ id: string; complete: boolean; blocked: boolean }> };
      escalationPlaybooks: Array<{ id: string; title: string }>;
      operationsLedger: { entries: Array<{ action: string; correlationId?: string; kind?: string; evidenceIds?: string[] }> };
      reportFreshness: {
        status: string;
        summary: string;
        latestVerificationReceiptId?: string;
        latestVerificationReceiptCommand?: string;
        freshnessThresholdMs?: number;
        staleByMs?: number;
        thresholdBreached?: boolean;
        latestVerificationReceiptCommitSha?: string;
        latestSuccessfulVerifyPredatesHead?: boolean;
      };
      reportAssemblyTiming: {
        totalDurationMs: number;
        sections: Array<{ id: string; durationMs: number }>;
        slowestSections: Array<{ id: string; durationMs: number }>;
      };
      healthzEvidence: {
        reportFreshness: string;
        latestVerificationReceiptCommand?: string;
        freshnessThresholdMs?: number;
        staleByMs?: number;
        thresholdBreached?: boolean;
        latestSmokeCompletedAt?: string;
        queueDepth: number;
        oldestWaitingAgeLabel?: string;
        recoveredEvidenceProvisional: boolean;
        routeBudgetRegressionCount: number;
      };
      reportDiff: { available: boolean; summary: string; changedFields: string[]; previousSnapshotId?: string };
      reportProvenance: { sourceVerificationReceiptIds: string[]; sourceSummaryJobIds: string[]; lineageSummary: string };
      evidenceDrift: { status: string; summary: string; issues: Array<{ id: string }> };
      savedViewAudit: { events: Array<{ id: string; action: string }>; summary: string };
      morningCommand: { headline: string; steps: Array<{ id: string; status: string }> };
      governedSdkManifests: Array<{ id: string; permissions: string[]; supportsDryRun: boolean }>;
      roleAwareSimulations: Array<{ id: string; liveSideEffects: false }>;
      policyRecommendationPacks: Array<{ id: string; recommendations: Array<{ whyThisRecommendation: string }> }>;
      nativeTruthMonitor: { status: string; checks: Array<{ id: string; status: string }>; latestRunner?: { receiptId: string; observedApiBase: string }; history?: unknown[]; divergenceSummary?: string };
      retentionImpact: { removedEntryCount: number; removedDayKeys: string[] };
      activeHypotheses: Array<{ label: string; hypothesis: string; validationSteps: string[] }>;
      nativeCutoverPlan: { status: string; artifactPath: string; nextSteps: string[] };
      attentionNow: Array<{ id: string; severity: string; label: string; evidenceIds: string[]; action: string }>;
      readinessAggregates: Array<{ windowHours: number; reconnectCount: number; staleCount: number; failedDeliveryCount: number; verificationFreshness: string }>;
      routeBudgetRegressions: Array<{ route: string; baselineMs: number; observedMs: number; deltaMs: number; severity: string }>;
      closeoutReadiness: { score: number; label: string; blockers: string[]; requiredEvidenceFresh: boolean };
      verificationReceiptDiffs: Array<{ command: string; failedReceiptId: string; passingReceiptId?: string; status: string; commitChanged: boolean }>;
      exportableViews: Array<{ id: string; label: string; redactedJson: string; evidenceCount: number; unresolvedEvidenceCount: number; staleSummaryCount?: number; newerEvidenceExists?: boolean; lastSuccessfulSummaryAt?: string }>;
      incidentTemplates: Array<{ id: string; title: string; stageNotes: Record<string, string> }>;
      deliveryContractPreviews: Array<{ target: string; dryRunSchema: string[]; liveSchema: string[]; idempotencyFields: string[]; paritySummary: string; missingInDryRun: string[]; missingInLive: string[] }>;
      releaseReadinessGate: { status: string; blockers: string[]; requiredCommands: string[]; narrative: string };
      staleSummaryDayKeys: string[];
      readinessHistory: { points: Array<{ backendHealthy: boolean; gatewayStatus: string; reasonCodes?: string[] }> };
      morningBrief: { headline: string; bullets: string[]; citations?: string[] };
      routeBudgetHistory?: { routes: Array<{ route: string; latestObservedMs: number; baselineObservedMs: number; trendDirection: string; observations: Array<{ observedMs: number }> }> };
      closeoutPacketPreview: { summary: string; blockerSummaries: string[]; lastPassingReceiptIds: string[]; sourceSnapshotId?: string; sourceViewLabel?: string };
      nativeTruthMonitor: { prepOnlyLabel?: string; failureTaxonomy?: Array<{ id: string; category: string }> };
    };

    expect(report.summaryJobHistory.jobs[0]).toMatchObject({
      queuedForMs: 2000,
      runningForMs: 5000,
      medianCompletionMs: 7000,
      correlationId: "corr-summary-1",
      requestedBy: "local-operator",
      reusedExistingJob: false
    });
    expect(report.summaryJobHistory.days).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dayKey: "2026-05-08", completedCount: 1, failedCount: 0, queuedCount: 0, runningCount: 0 })
      ])
    );
    expect(report.summaryJobHistory).toMatchObject({ queueDepth: 0 });
    expect(report.reportFreshness).toMatchObject({
      status: "newer_than_latest_receipt",
      latestVerificationReceiptId: "verify-docs",
      latestVerificationReceiptCommand: "docs:check",
      freshnessThresholdMs: expect.any(Number),
      thresholdBreached: false,
      latestVerificationReceiptCommitSha: "abc1234",
      latestSuccessfulVerifyPredatesHead: false
    });
    expect(report.reportAssemblyTiming.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(report.reportAssemblyTiming.sections.length).toBeGreaterThan(0);
    expect(report.reportAssemblyTiming.slowestSections[0]?.durationMs ?? 0).toBeGreaterThanOrEqual(
      report.reportAssemblyTiming.slowestSections[1]?.durationMs ?? 0
    );
    expect(report.healthzEvidence).toMatchObject({
      reportFreshness: "newer_than_latest_receipt",
      latestVerificationReceiptCommand: "docs:check",
      freshnessThresholdMs: expect.any(Number),
      staleByMs: 0,
      thresholdBreached: false,
      queueDepth: 0,
      recoveredEvidenceProvisional: true,
      routeBudgetRegressionCount: 1
    });
    expect(report.reportDiff).toMatchObject({
      available: true,
      previousSnapshotId: "previous-report-snapshot",
      changedFields: expect.arrayContaining(["delivery failures", "blocked verification gates", "report freshness"])
    });
    expect(report.reportProvenance).toMatchObject({
      sourceVerificationReceiptIds: expect.arrayContaining(["verify-docs", "smoke-main"]),
      sourceSummaryJobIds: ["summary-job-1"]
    });
    expect(report.savedViewAudit).toMatchObject({
      events: [expect.objectContaining({ id: "saved-view-created-1", action: "created" })]
    });
    expect(report.routeBudgetHistory?.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          route: "/api/operations/report",
          trendDirection: expect.stringMatching(/improving|steady|regressing|new/),
          observations: expect.arrayContaining([expect.objectContaining({ source: expect.stringMatching(/fixture|live|report/) })])
        })
      ])
    );
    expect(report.incidentEvidenceChecklist.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "timeline", present: true }),
      expect.objectContaining({ id: "receipts", present: true }),
      expect.objectContaining({ id: "replay", present: true }),
      expect.objectContaining({ id: "correlation", present: true }),
      expect.objectContaining({ id: "notes", present: true }),
      expect.objectContaining({ id: "handoff_packet", present: true })
    ]));
    expect(report.incidentEvidenceChecklist.ready).toBe(true);
    expect(report.verificationCenter.gates).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "summary_freshness", status: "blocked", freshness: "stale", blockingReasons: expect.arrayContaining([expect.stringContaining("Summary")]) }),
      expect.objectContaining({ id: "delivery_dry_runs", status: "blocked", freshness: "stale", nextSafeActions: expect.arrayContaining([expect.stringContaining("dry-run")]) }),
      expect.objectContaining({ id: "gateway_readiness", status: "passed", ageLabel: expect.any(String) })
    ]));
    expect(report.verificationCenter).toMatchObject({
      receipts: expect.arrayContaining([expect.objectContaining({ id: "verify-main", ageLabel: expect.any(String), freshness: expect.any(String) })]),
      readinessScore: expect.any(Number),
      readinessLabel: expect.stringMatching(/ready|warning|blocked/),
      firstBlockedGateId: "summary_freshness",
      lastSuccessfulVerifyAt: "2026-05-08T12:04:20.000Z",
      lastSuccessfulVerifyAgeLabel: expect.any(String),
      lastSuccessfulVerifyFreshness: expect.stringMatching(/fresh|aging|stale|unknown/),
      lastSuccessfulGatewayVerifyAt: "2026-05-08T12:05:30.000Z",
      lastSuccessfulDesktopVerifyAt: "2026-05-08T12:06:10.000Z",
      lastSuccessfulDocsCheckAt: "2026-05-08T12:06:40.000Z",
      docsCheckedCommitSha: "abc1234"
    });
    expect(report.deliveryLedger.items[0]).toMatchObject({
      id: "receipt-slack-failed",
      sameKeyRetryRequiresConfirmation: true,
      retryPolicy: { nextAttemptUsesNewIdempotencyKey: true }
    });
    expect(report.attentionNow).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "stale_summary", severity: "warning", label: expect.stringContaining("Stale summary") }),
        expect.objectContaining({ id: "failed_dry_run_delivery", severity: "critical", evidenceIds: ["receipt-slack-failed"] }),
        expect.objectContaining({
          id: "missing_dry_run_delivery",
          severity: "warning",
          evidenceIds: expect.arrayContaining(["email", "generic-webhook", "github-issue"])
        }),
        expect.objectContaining({ id: "route_budget_regression", severity: "warning", action: expect.stringContaining("Review route") })
      ])
    );
    expect(report.readinessAggregates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ windowHours: 24, reconnectCount: 1, staleCount: 1, failedDeliveryCount: 1 }),
        expect.objectContaining({ windowHours: 168, verificationFreshness: expect.stringMatching(/fresh|aging|stale|unknown/) })
      ])
    );
    expect(report.routeBudgetRegressions).toEqual([
      expect.objectContaining({ route: "/api/summary-jobs", baselineMs: 250, observedMs: 340, deltaMs: 90, severity: "breach" })
    ]);
    const summaryJobsBudget = report.routePerformanceBudgets.find((budget) => budget.route === "/api/summary-jobs");
    expect(summaryJobsBudget).toMatchObject({ route: "/api/summary-jobs", observedMs: 340, status: "breach" });
    expect(summaryJobsBudget).not.toHaveProperty("percentileLabel");
    expect(summaryJobsBudget).not.toHaveProperty("percentileValue");
    expect(report.closeoutReadiness).toMatchObject({
      label: "blocked",
      requiredEvidenceFresh: false,
      blockers: expect.arrayContaining([expect.stringContaining("summary"), expect.stringContaining("dry-run")])
    });
    expect(report.verificationReceiptDiffs).toEqual([
      expect.objectContaining({ command: "verify:gateway", failedReceiptId: "verify-gateway-failed", passingReceiptId: "verify-gateway", commitChanged: true })
    ]);
    expect(report.exportableViews).toEqual([
      expect.objectContaining({
        id: "saved-scope-review",
        label: "Saved scope review",
        evidenceCount: expect.any(Number),
        unresolvedEvidenceCount: expect.any(Number),
        staleSummaryCount: 1,
        lastSuccessfulSummaryAt: "2026-05-08T12:00:07.000Z",
        redactedJson: expect.stringContaining("\"redacted\":true"),
        newerEvidenceExists: expect.any(Boolean),
        handoffSummary: expect.stringContaining("snapshot")
      })
    ]);
    expect(report.staleSummaryDayKeys).toEqual(["2026-05-08"]);
    expect(report.incidentTemplates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "missing-scopes", title: "Missing Gateway scopes", stageNotes: expect.objectContaining({ detect: expect.any(String), record: expect.any(String) }) }),
        expect.objectContaining({ id: "delivery-dead-letter" }),
        expect.objectContaining({ id: "route-budget-regression" })
      ])
    );
    expect(report.deliveryContractPreviews).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: "slack",
          dryRunSchema: expect.arrayContaining(["target", "dayKey", "dryRun"]),
          idempotencyFields: expect.arrayContaining(["idempotencyKey", "requestFingerprint"]),
          paritySummary: expect.stringContaining("missing in dry-run"),
          missingInDryRun: expect.arrayContaining(["title", "body"])
        }),
        expect.objectContaining({ target: "generic-webhook" })
      ])
    );
    expect(report.releaseReadinessGate).toMatchObject({
      status: "blocked",
      requiredCommands: expect.arrayContaining(["verify", "verify:gateway", "docs:check", "verify:desktop-native", "test:smoke", "dry-run delivery"]),
      narrative: expect.stringContaining("Release readiness is blocked")
    });
    expect(report.evidenceDrift).toMatchObject({
      status: "drifting",
      issues: expect.arrayContaining([expect.objectContaining({ id: "report_header_mismatch" })])
    });
    expect(report.morningCommand.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "blocked_gates", status: "blocked" }),
        expect.objectContaining({ id: "recovered_drift", status: "blocked" })
      ])
    );
    expect(report.evidenceQualityScores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ incidentId: "incident-1", score: expect.any(Number), grade: "good" }),
        expect.objectContaining({ dayKey: "2026-05-08", score: expect.any(Number) })
      ])
    );
    expect(report.deliveryTargetHealth).toEqual(
      expect.arrayContaining([expect.objectContaining({ target: "slack", status: "blocked", receiptCount24h: 1, failedCount24h: 1, trend: "degraded" })])
    );
    expect(report.incidentTimeline).toMatchObject({
      startDayKey: "2026-05-08",
      endDayKey: "2026-05-08",
      events: expect.arrayContaining([expect.objectContaining({ kind: "summary_job" }), expect.objectContaining({ kind: "delivery_receipt" })])
    });
    expect(report.readinessHistory.points).toEqual(
      expect.arrayContaining([expect.objectContaining({ backendHealthy: true, gatewayStatus: expect.any(String), reasonCodes: expect.any(Array) })])
    );
    expect(report.guidedIncidentCommand.stages).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "detect", complete: true }), expect.objectContaining({ id: "record" })])
    );
    expect(report.escalationPlaybooks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "stale-summary" }), expect.objectContaining({ id: "failed-dry-run" })])
    );
    expect(report.operationsLedger.entries.map((entry) => entry.action)).toEqual(expect.arrayContaining(["summary.completed", "delivery.failed", "incident.action.failed", "native.self_check.passed"]));
    expect(report.operationsLedger.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "native_runner",
          evidenceIds: ["desktop-self-check:http_127_0_0_1_3000:20260508T120700000Z"]
        })
      ])
    );
    expect(report.governedSdkManifests).toEqual(expect.arrayContaining([expect.objectContaining({ id: "slack", permissions: ["delivery:slack"], supportsDryRun: true })]));
    expect(report.roleAwareSimulations.every((simulation) => simulation.liveSideEffects === false)).toBe(true);
    expect(report.policyRecommendationPacks.find((pack) => pack.id === "failed-summaries")?.recommendations[0].whyThisRecommendation).toContain("evidence");
    expect(report.nativeTruthMonitor).toMatchObject({
      latestRunner: {
        receiptId: "desktop-self-check:http_127_0_0_1_3000:20260508T120700000Z",
        observedApiBase: "http://127.0.0.1:3000"
      },
      history: expect.any(Array),
      divergenceSummary: "Desktop self-check agrees with public Gateway readiness.",
      prepOnlyLabel: expect.stringContaining("prep evidence")
    });
    expect(report.nativeTruthMonitor.checks).toEqual(expect.arrayContaining([expect.objectContaining({ id: "backend_fingerprint", status: "passed" }), expect.objectContaining({ id: "launch_agent", status: "passed" })]));
    expect(report.nativeTruthMonitor.failureTaxonomy).toEqual(expect.any(Array));
    expect(report.retentionImpact).toMatchObject({ removedEntryCount: 0, removedDayKeys: [] });
    expect(report.activeHypotheses).toEqual([expect.objectContaining({ label: "Saved scope review", hypothesis: "Gateway scope grant is stale." })]);
    expect(report.morningBrief.citations).toEqual(expect.arrayContaining(["stale_summary", "receipt-slack-failed"]));
    expect(report.nativeCutoverPlan).toMatchObject({
      status: "prep",
      artifactPath: "docs/openclog-native-cutover.md",
      nextSteps: expect.arrayContaining(["Keep Fastify as policy/report authority until native policy parity is proven with fresh receipts."])
    });
    expect(report.closeoutPacketPreview).toMatchObject({
      sourceSnapshotId: expect.any(String),
      sourceViewLabel: "Saved scope review"
    });
  });

  test("merges attention item acknowledgement and snooze state into the operations report", () => {
    const attentionStates = new Map<
      string,
      {
        acknowledgedAt?: string;
        acknowledgedBy?: string;
        snoozeUntil?: string;
      }
    >([
      [
        "stale_summary",
        {
          acknowledgedAt: "2026-05-08T12:30:00.000Z",
          acknowledgedBy: "local-operator",
          snoozeUntil: "2026-05-08T13:30:00.000Z"
        }
      ]
    ]);
    const staleDay: JournalDay = {
      ...buildDay("2026-05-08", ["entry-1"]),
      entries: [
        {
          id: "entry-1",
          dayKey: "2026-05-08",
          source: "system",
          kind: "system_status",
          title: "Entry entry-1",
          body: "Body entry-1",
          timestamp: "2026-05-08T12:05:00.000Z",
          status: "info",
          severity: "info",
          redacted: true
        }
      ],
      generatedSummary: {
        summary: "Older summary",
        createdAt: "2026-05-08T00:00:00.000Z",
        source: "rules"
      }
    };
    const app = createOpenClogApplication({
      repo: {
        getDay: () => staleDay,
        listDeliveryReceipts: () => [],
        listVerificationReceipts: () => [],
        listNativeRunnerHistory: () => [],
        listIncidentActionRecords: () => [],
        listHealthTimeline: () => [],
        getHealthAggregate: () => ({ createdAt: "2026-05-08T12:40:00.000Z", reconnectCount: 0, staleCount: 0, recoveryCount: 0, adapterFailureCount: 0 }),
        getSloSnapshot: () => ({ createdAt: "2026-05-08T12:40:00.000Z", gatewayFreshnessOk: true, staleSummaryCount: 1, failedDeliveryCount: 0, retryBacklogCount: 0, reconnectHeavyDayCount: 0, baselines: [] }),
        getSetting: () => ({ operatorViews: [] }),
        getLatestOperationsReportSnapshot: () => undefined,
        saveOperationsReportSnapshot: (snapshot) => snapshot,
        listEvidenceDriftObservations: () => [],
        saveEvidenceDriftObservation: (observation) => observation,
        listRouteBudgetObservations: () => [],
        previewRetention: () => ({ keepDays: 1, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0 }),
        getAttentionItemState: (id: string) => attentionStates.get(id),
        listDays: () => [{ ...staleDay, entries: undefined } as Omit<JournalDay, "entries">]
      }
    });

    const report = app.getOperationsBacklog({ dayKey: "2026-05-08" });
    const staleSummary = report.attentionNow.find((item) => item.id === "stale_summary");

    expect(staleSummary).toMatchObject({
      acknowledgedAt: "2026-05-08T12:30:00.000Z",
      acknowledgedBy: "local-operator",
      snoozeUntil: "2026-05-08T13:30:00.000Z"
    });
  });

  test("summarizes recovered OpenClaw evidence across days for the operations report", () => {
    const may20Backfill = {
      ...buildBackfilledOpenClawDay("2026-05-20", 69, "2026-05-20T22:30:01.601Z"),
      generatedSummary: {
        summary: "Recovered summary",
        createdAt: "2026-05-20T22:10:00.000Z",
        source: "rules" as const,
        lastEntryIncludedAt: "2026-05-20T22:10:00.000Z",
        latestEntryObservedAt: "2026-05-20T22:30:01.601Z",
        freshnessState: "stale" as const,
        newerEvidenceArrived: true,
        newerEvidenceReason: "Recovered OpenClaw imports landed after the last summary."
      }
    };
    const app = createOpenClogApplication({
      repo: {
        getDay: (dayKey: string) => (dayKey === "2026-05-20" ? may20Backfill : null),
        listDays: () => [{ ...may20Backfill, entries: [] }]
      }
    });

    const report = (app as never as { getOperationsBacklog(input: { dayKey: string }): unknown }).getOperationsBacklog({
      dayKey: "2026-05-20"
    }) as {
      recoveredEvidenceSummary?: {
        entryCount: number;
        dayCount: number;
        dayKeys: string[];
        latestImportedAt?: string;
        sourceLabel: string;
        provisionalMetrics?: boolean;
        cacheStateLabel?: string;
      };
    };

    expect(report.recoveredEvidenceSummary).toMatchObject({
      entryCount: 69,
      dayCount: 1,
      dayKeys: ["2026-05-20"],
      latestImportedAt: "2026-05-20T22:30:01.601Z",
      sourceLabel: "Backfilled from OpenClaw",
      provisionalMetrics: true,
      cacheStateLabel: "Recovered evidence changed after the last successful summary."
    });
  });

  test("imports newsletter monitoring decisions as redacted notes and incident handoff packets", () => {
    const notes: Array<{ id: string; body: string; dayKey: string; incidentId?: string; author: string; linkedEntryIds: string[]; createdAt: string; updatedAt: string }> = [];
    const packets: IncidentHandoffPacket[] = [];
    const incidents: Array<{ id: string; title: string; summary: string; dayKeys: string[]; entryIds: string[]; createdAt: string; runbookSuggestions: [] }> = [];
    const contexts = new Map<string, { note?: string; summary?: string; updatedAt: string }>();
    const app = createOpenClogApplication({
      repo: {
        saveInvestigationNote(note) {
          notes.push(note);
          return note;
        },
        listInvestigationNotes: () => notes,
        saveIncident(incident) {
          incidents.push({ ...incident, runbookSuggestions: [] });
          return incident;
        },
        saveIncidentHandoffPacket(packet) {
          packets.push(packet);
          return packet;
        },
        listIncidentHandoffPackets: () => packets,
        setPinnedDayContext(dayKey, context, now = new Date("2026-05-08T12:00:00.000Z")) {
          const next = { ...context, updatedAt: now.toISOString() };
          contexts.set(dayKey, next);
          return next;
        }
      }
    });

    const imported = app.importMonitoringDecisions({
      dayKey: "2026-05-08",
      importedAt: "2026-05-08T12:00:00.000Z",
      markdown: [
        "# newsletter-monitoring.md",
        "## Gmail",
        "- Decision: keep Oregon AI governance as an operator note; token=secret-token",
        "## blogwatcher",
        "- High-signal: surface Process Swarm outage as incident handoff for OpenClaw review",
        "## OpenClaw",
        "- Quiet triage complete: no 403 items surfaced"
      ].join("\n"),
      sourcePath: "/Users/m4/newsletter-monitoring.md",
      sourceWorkflow: ["gmail", "blogwatcher", "openclaw"]
    });

    expect(imported.decisions).toHaveLength(3);
    expect(imported.decisions[0].body).toContain("token=[REDACTED_SECRET]");
    expect(imported.provenance).toMatchObject({
      sourceWorkflow: ["gmail", "blogwatcher", "openclaw"],
      sourcePath: "/Users/m4/newsletter-monitoring.md",
      sourceHash: expect.stringMatching(/^sha256-/)
    });
    expect(notes).toHaveLength(3);
    expect(notes.map((note) => note.body).join("\n")).not.toContain("secret-token");
    expect(packets).toHaveLength(1);
    expect(packets[0]).toMatchObject({
      dayKey: "2026-05-08",
      title: expect.stringContaining("Process Swarm outage"),
      deliveryTargets: ["github-issue", "slack", "email"],
      provenance: { lineNumbers: [5] }
    });
    expect(incidents).toHaveLength(1);
    expect(contexts.get("2026-05-08")).toMatchObject({
      summary: "Monitoring import: 3 decision(s), 1 handoff packet(s).",
      note: expect.stringContaining("newsletter-monitoring.md")
    });
  });

  test("builds a fail-closed capability registry from local manifests, actions, delivery targets, plugins, and governance surfaces", () => {
    const manifests: CapabilityManifest[] = [
      {
        id: "incident-action:deliver_slack",
        kind: "incident_action",
        label: "Notify Slack",
        purpose: "Send incident handoff packets to Slack.",
        version: "2026.05.08",
        permissions: ["delivery:slack"],
        failureModes: ["missing_config"],
        auditProvenance: ["journal_delivery_receipts"],
        approvalSignature: "local-openclog:incident-action:deliver_slack",
        reviewBy: "2026-06-08",
        source: "local_manifest",
        actionId: "deliver_slack"
      },
      {
        id: "delivery:email",
        kind: "delivery_target",
        label: "Email",
        purpose: "Send email handoffs.",
        version: "2026.05.08",
        permissions: ["delivery:email"],
        failureModes: ["missing_config"],
        auditProvenance: ["journal_delivery_receipts"],
        reviewBy: "2026-06-08",
        source: "local_manifest",
        deliveryTarget: "email"
      },
      {
        id: "incident-action:create_github_issue",
        kind: "incident_action",
        label: "Create GitHub issue",
        purpose: "Create a GitHub issue from the local incident handoff.",
        version: "2026.05.08",
        permissions: ["delivery:github-issue"],
        failureModes: ["missing_config"],
        auditProvenance: ["journal_delivery_receipts"],
        reviewBy: "2026-06-08",
        source: "local_manifest",
        actionId: "create_github_issue"
      }
    ];
    const app = createOpenClogApplication({
      repo: {
        listCapabilityManifests: () => manifests,
        listPlugins: () => [
          {
            id: "plugin-1",
            label: "Plugin",
            version: "0.1.0",
            capabilities: ["annotation"],
            readScopes: ["entries"],
            validationStatus: "valid",
            approvalSignature: "local-openclog:plugin:plugin-1",
            reviewBy: "2026-06-08"
          }
        ],
        listIncidentRulePacks: () => [],
        listDeliveryReceipts: () => [],
        listIncidentActionRecords: () => [],
        getIntegrityReport: () => ({ ok: true, checkedEntries: 0, mismatchedEntryIds: [], missingRedactedHashes: [] }),
        listInvestigationNotes: () => [],
        evaluateAlertRules: () => [],
        getIncident: () => ({
          id: "incident-1",
          title: "Incident",
          summary: "Summary",
          dayKeys: ["2026-05-08"],
          entryIds: ["entry-a"],
          createdAt: "2026-05-08T12:00:00.000Z",
          runbookSuggestions: []
        }),
        getDay: () => ({
          ...buildDay("2026-05-08", ["entry-a"])
        })
      }
    });

    const capabilities = app.listCapabilities({ now: "2026-05-08T12:00:00.000Z" });

    expect(capabilities.map((item) => item.id)).toEqual(expect.arrayContaining(["incident-action:deliver_slack", "delivery:email", "plugin:plugin-1"]));
    expect(capabilities.find((item) => item.id === "incident-action:deliver_slack")?.useGate).toMatchObject({ allowed: true, status: "available", blockers: [] });
    expect(capabilities.find((item) => item.id === "delivery:email")?.useGate).toMatchObject({
      allowed: false,
      status: "blocked",
      blockers: expect.arrayContaining(["approval signature missing"])
    });
    expect(app.getCapability({ capabilityId: "plugin:plugin-1", now: "2026-05-08T12:00:00.000Z" })).toMatchObject({
      id: "plugin:plugin-1",
      useGate: { allowed: true }
    });
    expect(() => app.assertCapabilityReady({ capabilityId: "delivery:email", now: "2026-05-08T12:00:00.000Z" })).toThrow(
      /capability_blocked:delivery:email/
    );
    expect(app.getIncidentWorkspace({ incidentId: "incident-1" }).loop.act.find((action) => action.id === "deliver_slack")).toMatchObject({
      capabilityId: "incident-action:deliver_slack",
      availability: "degraded",
      reason: expect.stringContaining("Evidence is incomplete")
    });
    expect(app.getIncidentWorkspace({ incidentId: "incident-1" }).loop.act.find((action) => action.id === "create_github_issue")).toMatchObject({
      capabilityId: "incident-action:create_github_issue",
      availability: "blocked",
      reason: expect.stringContaining("approval signature missing")
    });
  });
});
