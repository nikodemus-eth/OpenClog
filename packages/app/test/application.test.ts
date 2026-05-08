import { describe, expect, test } from "vitest";
import type { AlertFinding, AlertRule, CapabilityManifest, DeliveryReceipt, IncidentHandoffPacket, JournalDay, JournalSearchResult, SessionDrilldown } from "@openclog/core";
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
            idempotencyKey: `${original.id}:retry:2`
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
