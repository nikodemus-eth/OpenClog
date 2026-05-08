import type { Page } from "@playwright/test";
import type { AgentActivity, JournalDay, JournalEntry } from "@openclog/core";

export interface ApiFixtureOptions {
  agents?: AgentActivity[];
  approvalCount?: number;
  bundleDay?: JournalDay;
  dayTitle?: string;
  emptyAdvancedState?: boolean;
  extraEntries?: JournalEntry[];
  healthBackendMode?: "full" | "missing";
  gatewayDetails?: Record<string, unknown>;
  gatewayStatus?: "ready" | "blocked" | "degraded";
  failReplayCorrelation?: boolean;
  searchResults?: Array<{
    bodyPreview: string;
    dayKey: string;
    entryId: string;
    kind: string;
    status?: string;
    title: string;
  }>;
  settingsTheme?: string;
  streamEntry?: JournalEntry;
}

export async function setFixtureTheme(page: Page, theme: string): Promise<void> {
  await page.evaluate(async (nextTheme) => {
    await fetch("/api/settings", {
      body: JSON.stringify({ theme: nextTheme }),
      headers: { "content-type": "application/json" },
      method: "PUT"
    });
  }, theme);
  await page.reload();
}

export async function installApiFixtures(page: Page, options: ApiFixtureOptions = {}): Promise<{ resolvedApprovals: Array<{ decision: string; id: string }> }> {
  const gatewayStatus = options.gatewayStatus ?? "degraded";
  const approvalCount = options.approvalCount ?? 0;
  const missingScopes = gatewayStatus === "ready" ? [] : ["operator.approvals"];
  const resolvedApprovals: Array<{ decision: string; id: string }> = [];
  let theme = options.settingsTheme ?? "default";
  let showToolCalls = true;
  let searchPresets: Array<{ id: string; label: string; query: string }> = [];
  let operatorViews: Array<{ id: string; label: string; dayKey?: string; searchQuery: string; activeFilters: string[]; grouped: boolean }> = [];
  let retentionApplied = false;
  let summaryJobPollCount = 0;
  const alertStates = new Map<string, { acknowledgedAt?: string; snoozedUntil?: string }>();
  const backend = {
    id: "fixture-runtime",
    runtimeFingerprint: "fixture-runtime",
    pid: 4321,
    bootedAt: "2026-05-04T11:59:00.000Z",
    commitSha: "abc1234",
    buildTimestamp: "2026-05-04T12:00:00.000Z",
    nodeVersion: "v24.0.0"
  };
  const dayTwo = buildDay({
    dayKey: "2026-05-02",
    dateLabel: "Saturday, May 2, 2026",
    summary: "OpenClog is watching local activity in degraded mode until Gateway scopes are available.",
    approvalCount,
    gatewayStatus
  });
  const dayThree = buildDay({
    dayKey: "2026-05-03",
    dateLabel: "2026-05-03",
    summary: "May 3 log entries from OpenClaw are available.",
    approvalCount,
    gatewayStatus,
    title: options.dayTitle
  });
  if (options.extraEntries) dayThree.entries.push(...options.extraEntries);
  if (options.streamEntry) dayThree.entries.push(options.streamEntry);
  const incidents = options.emptyAdvancedState
    ? []
    : [{ id: "incident-1", title: "Operational instability narrative", summary: "Derived incident summary.", dayKeys: ["2026-05-03"], entryIds: [dayThree.entries[0].id], createdAt: "2026-05-04T12:04:00.000Z", runbookSuggestions: [{ id: "gateway-check", title: "Check Gateway listener health", summary: "Verify listener", reason: "Reconnect observed" }], loopProgress: { detect: true, explain: true, recommend: true, act: false, record: false } }];
  const investigationNotes = options.emptyAdvancedState
    ? []
    : [{ id: "note-1", dayKey: "2026-05-03", incidentId: "incident-1", author: "local-user", body: "Initial operator note.", linkedEntryIds: [dayThree.entries[0].id], createdAt: "2026-05-04T12:05:00.000Z", updatedAt: "2026-05-04T12:05:00.000Z" }];
  await page.route("**/api/health", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        backend: options.healthBackendMode === "missing" ? null : backend,
        gateway: {
          status: gatewayStatus,
          role: "operator",
          scopes: gatewayStatus === "ready" ? ["operator.read", "operator.write", "operator.approvals"] : ["operator.read", "operator.write"],
          missingScopes,
          scopeNegotiation: {
            have: gatewayStatus === "ready" ? ["operator.read", "operator.write", "operator.approvals"] : ["operator.read", "operator.write"],
            missing: missingScopes
          },
          targetReachable: true,
          stale: gatewayStatus !== "ready",
          reconnectCount: gatewayStatus === "ready" ? 2 : 0,
          lastLiveEventAt: "2026-05-03T12:06:00.000Z",
          lastSuccessfulSyncAt: "2026-05-03T12:06:00.000Z",
          ...options.gatewayDetails
        }
      }
    });
  });
  await page.route("**/api/health/history?**", async (route) => {
    await route.fulfill({
      json: {
        history:
          (options.gatewayDetails?.recentHistory as unknown[]) ??
          [{ id: "health-1", entryId: "2026-05-03-entry-1", dayKey: "2026-05-03", title: "Gateway reconnected", timestamp: "2026-05-03T12:05:00.000Z", category: "reconnect" }]
      }
    });
  });
  await page.route("**/api/health/timeline?**", async (route) => {
    await route.fulfill({
      json: {
        timeline: [
          { id: "timeline-1", timestamp: "2026-05-03T12:05:00.000Z", category: "reconnect", title: "Gateway reconnected", detail: "reconnect observed for 2026-05-03." }
        ]
      }
    });
  });
  await page.route("**/api/version", async (route) => {
    await route.fulfill({ json: { version: "0.1.0", ...backend } });
  });
  await page.route("**/api/stream", async (route) => {
    const eventBody = options.streamEntry
      ? `retry: 30000\nevent: journal\ndata: ${JSON.stringify({ entry: options.streamEntry, day: dayThree })}\n\n`
      : "";
    await route.fulfill({
      headers: {
        "cache-control": "no-cache",
        "content-type": "text/event-stream"
      },
      body: `: fixture stream available\n\n${eventBody}`
    });
  });
  await page.route("**/api/settings", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as {
        theme?: string;
        showToolCalls?: boolean;
        searchPresets?: Array<{ id: string; label: string; query: string }>;
        operatorViews?: Array<{ id: string; label: string; dayKey?: string; searchQuery: string; activeFilters: string[]; grouped: boolean }>;
      };
      if (typeof body.theme === "string") theme = body.theme;
      if (typeof body.showToolCalls === "boolean") showToolCalls = body.showToolCalls;
      if (Array.isArray(body.searchPresets)) searchPresets = body.searchPresets;
      if (Array.isArray(body.operatorViews)) operatorViews = body.operatorViews;
      await route.fulfill({ json: { ok: true, settings: { version: 2, theme, showToolCalls, searchPresets, operatorViews } } });
      return;
    }
    await route.fulfill({ json: { settings: { version: 2, theme, showToolCalls, searchPresets, operatorViews, gateway: { status: gatewayStatus } } } });
  });
  await page.route("**/api/sessions?**", async (route) => {
    await route.fulfill({
      json: {
        agents: options.agents ?? [
          { id: "agent:hugin:main", label: "Hugin", status: "working", summary: "Answering the current prompt", sessionKey: "agent:hugin:main", lastSeenAt: "2026-05-02T12:05:00.000Z" },
          { id: "agent:munin:main", label: "Munin", status: "idle", summary: "Standing by", sessionKey: "agent:munin:main" }
        ]
      }
    });
  });
  await page.route("**/api/approvals", async (route) => {
    await route.fulfill({
      json: {
        approvals: [
          { id: "approval-1", title: "Approval requested", command: "npm test", status: "pending", requestedAt: "2026-05-02T12:03:00.000Z", sessionKey: "agent:hugin:main" },
          { id: "approval-2", title: "Approval requested", command: "git status", status: "pending", requestedAt: "2026-05-02T12:04:00.000Z", sessionKey: "agent:munin:main" },
          { id: "approval-3", title: "Approval requested", command: "defer me", status: "pending", requestedAt: "2026-05-02T12:05:00.000Z" }
        ].slice(0, approvalCount)
      }
    });
  });
  await page.route("**/api/approvals/*/resolve", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").at(-2) ?? "";
    const body = route.request().postDataJSON() as { decision: string };
    resolvedApprovals.push({ id, decision: body.decision });
    await route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/days", async (route) => {
    await route.fulfill({
      json: {
        days: retentionApplied ? [summaryFor(dayThree)] : [summaryFor(dayThree), summaryFor(dayTwo)]
      }
    });
  });
  await page.route("**/api/days/2026-05-02", async (route) => {
    await route.fulfill({ json: { day: dayTwo } });
  });
  await page.route("**/api/days/2026-05-03", async (route) => {
    await route.fulfill({ json: { day: dayThree } });
  });
  await page.route("**/api/days/*/context", async (route) => {
    const body = route.request().postDataJSON() as { note?: string; summary?: string };
    await route.fulfill({ json: { ok: true, context: { ...body, updatedAt: "2026-05-04T12:01:00.000Z" } } });
  });
  await page.route("**/api/days/*/generate-summary", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        generatedSummary: {
          summary: "1 failure, 1 approval, 1 tool event, 2 total journal entries.",
          createdAt: "2026-05-04T12:02:00.000Z",
          source: "rules",
          lastEntryIncludedAt: "2026-05-03T12:02:00.000Z",
          latestEntryObservedAt: "2026-05-03T12:02:00.000Z",
          freshnessState: "fresh"
        }
      }
    });
  });
  await page.route("**/api/days/*/summary-jobs", async (route) => {
    summaryJobPollCount = 0;
    await route.fulfill({
      json: {
        ok: true,
        job: {
          id: "summary-job-fixture",
          dayKey: "2026-05-03",
          status: "queued",
          createdAt: "2026-05-04T12:02:00.000Z",
          progressLabel: "Summary job queued for local evidence review."
        }
      }
    });
  });
  await page.route("**/api/summary-jobs/*", async (route) => {
    summaryJobPollCount += 1;
    const running = summaryJobPollCount === 1;
    await route.fulfill({
      json: {
        ok: true,
        job: running
          ? {
              id: "summary-job-fixture",
              dayKey: "2026-05-03",
              status: "running",
              createdAt: "2026-05-04T12:02:00.000Z",
              startedAt: "2026-05-04T12:02:01.000Z",
              progressLabel: "Summary job running against local evidence."
            }
          : {
              id: "summary-job-fixture",
              dayKey: "2026-05-03",
              status: "completed",
              createdAt: "2026-05-04T12:02:00.000Z",
              startedAt: "2026-05-04T12:02:01.000Z",
              completedAt: "2026-05-04T12:02:02.000Z",
              progressLabel: "Summary generated from current journal evidence.",
              generatedSummary: {
                summary: "1 failure, 1 approval, 1 tool event, 3 total journal entries.",
                createdAt: "2026-05-04T12:02:02.000Z",
                source: "rules",
                lastEntryIncludedAt: "2026-05-03T12:04:00.000Z",
                latestEntryObservedAt: "2026-05-03T12:04:00.000Z",
                freshnessState: "fresh"
              }
            }
      }
    });
  });
  await page.route("**/api/composer", async (route) => {
    const body = route.request().postDataJSON() as { text: string };
    if (body.text.startsWith("/config")) {
      await route.fulfill({ status: 403, json: { error: "composer_command_blocked", message: "Command blocked" } });
      return;
    }
    await route.fulfill({ json: { mode: "note", body: body.text.replace("/note ", "") } });
  });
  await page.route("**/api/days/*/export?format=markdown", async (route) => {
    await route.fulfill({
      headers: { "content-type": "text/markdown", "content-disposition": "attachment; filename=openclog-day.md" },
      body: "# OpenClog Journal\n"
    });
  });
  await page.route("**/api/days/*/export/bundle", async (route) => {
    await route.fulfill({
      json: {
        manifest: { dayKey: "2026-05-03", exportedAt: "2026-05-04T12:03:00.000Z", version: "0.1.0", signature: { algorithm: "sha256", digest: "bundle-digest-123" } },
        day: options.bundleDay ?? dayThree,
        markdown: "# OpenClog Journal\n"
      }
    });
  });
  await page.route("**/api/search?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q") ?? "";
    await route.fulfill({
      json: {
        query,
        results:
          options.searchResults ??
          [
            {
              entryId: `${dayThree.dayKey}-entry-2`,
              dayKey: dayThree.dayKey,
              title: "Tool call",
              bodyPreview: `Called get_repository_status for ${dayThree.dayKey}.`,
              matchSnippet: `Matched in body: Called get_repository_status for ${dayThree.dayKey}.`,
              matchFieldHints: ["body"],
              kind: "tool_result",
              status: "success"
            }
          ],
        nextCursor: undefined
      }
    });
  });
  await page.route("**/api/sessions/*", async (route) => {
    await route.fulfill({
      json: {
        sessionKey: "agent:hugin:main",
        entries: dayThree.entries,
        toolCount: 1,
        approvalCount,
        reconnectCount: gatewayStatus === "ready" ? 1 : 0,
        sanitizedSummary: "Session agent:hugin:main, 3 entries, 1 tools, 1 approvals, 1 reconnects, latest event 2026-05-03T12:04:00.000Z"
      }
    });
  });
  await page.route("**/api/integrity-check", async (route) => {
    await route.fulfill({ json: { ok: true, report: { ok: true, checkedEntries: dayThree.entries.length, mismatchedEntryIds: [], missingRedactedHashes: [] } } });
  });
  await page.route("**/api/retention/preview", async (route) => {
    await route.fulfill({ json: { ok: true, preview: { keepDays: 1, removedDayKeys: ["2026-05-02"], removedEntryCount: 2, removedSummaryCount: 1, removedAuditCount: 1, removedIncidentCount: 1, removedAlertCount: 1, removedBundleCount: 1 } } });
  });
  await page.route("**/api/retention/apply", async (route) => {
    retentionApplied = true;
    await route.fulfill({
      json: {
        ok: true,
        snapshot: {
          id: "retention-fixture-1",
          createdAt: "2026-05-04T12:13:00.000Z",
          preview: {
            keepDays: 1,
            removedDayKeys: ["2026-05-02"],
            removedEntryCount: 2,
            removedSummaryCount: 1,
            removedAuditCount: 1,
            removedIncidentCount: 1,
            removedAlertCount: 1,
            removedBundleCount: 1
          },
          days: [dayThree, dayTwo]
        }
      }
    });
  });
  await page.route("**/api/retention/rollback/*", async (route) => {
    retentionApplied = false;
    await route.fulfill({ json: { ok: true, restoredDayKeys: ["2026-05-03", "2026-05-02"] } });
  });
  await page.route("**/api/retention/classes", async (route) => {
    if (route.request().method() === "PUT") {
      const id = new URL(route.request().url()).pathname.split("/").at(-1) ?? "entries";
      await route.fulfill({ json: { ok: true, retentionClass: { id, label: "Journal entries", description: "Primary redacted evidence.", policy: { keepDays: 14, includeRollback: true }, updatedAt: "2026-05-04T12:06:00.000Z" } } });
      return;
    }
    await route.fulfill({
      json: {
        classes: [
          { id: "entries", label: "Journal entries", description: "Primary redacted evidence.", policy: { keepDays: 30, includeRollback: true }, updatedAt: "2026-05-04T12:05:00.000Z" }
        ]
      }
    });
  });
  await page.route("**/api/retention/preview-by-class", async (route) => {
    await route.fulfill({ json: { ok: true, previews: [{ classId: "entries", label: "Journal entries", impact: { beforeCount: 4, afterCount: 2, removedCount: 2, affectedIds: ["a", "b"] } }] } });
  });
  await page.route("**/api/incidents", async (route) => {
    await route.fulfill({
      json: { incidents }
    });
  });
  await page.route("**/api/incident-mode", async (route) => {
    await route.fulfill({ json: { ok: true, incident: { id: "incident-snapshot", title: "Incident snapshot for Saturday, May 3, 2026", summary: "Captured focused entries.", dayKeys: ["2026-05-03"], entryIds: [dayThree.entries[0].id], createdAt: "2026-05-04T12:05:00.000Z", runbookSuggestions: [], loopProgress: { detect: true, explain: true, recommend: false, act: false, record: false } } } });
  });
  await page.route("**/api/incidents/*/workspace", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        workspace: {
          incident: incidents[0] ?? { id: "incident-1", title: "Operational instability narrative", summary: "Derived incident summary.", dayKeys: ["2026-05-03"], entryIds: [dayThree.entries[0].id], createdAt: "2026-05-04T12:04:00.000Z", runbookSuggestions: [] },
          entries: dayThree.entries.slice(0, 2),
          alertFindings: gatewayStatus === "ready" ? [{ ruleId: "reconnect-storm", title: "Reconnect storm", triggered: true, detail: "Reconnect storm triggered for 2026-05-03." }] : [],
          generatedSummary: { summary: "1 failure, 1 approval, 1 tool event, 2 total journal entries.", createdAt: "2026-05-04T12:02:00.000Z", source: "rules", lastEntryIncludedAt: "2026-05-03T12:02:00.000Z", latestEntryObservedAt: "2026-05-03T12:02:00.000Z", freshnessState: "fresh" },
          notes: investigationNotes,
          sessionKeys: ["agent:hugin:main"],
          suggestedNextActions: ["Check Gateway listener health", "Review active alert findings before export."],
          loop: {
            detect: {
              title: "Operational instability narrative",
              summary: "2 linked entries across 1 day(s); 1 active alert finding(s).",
              affectedDayKeys: ["2026-05-03"],
              sessionKeys: ["agent:hugin:main"],
              linkedEntryIds: [dayThree.entries[0].id],
              evidence: ["Reconnect evidence: Gateway ready.", "1 session key(s) linked."]
            },
            explain: {
              category: "reconnect_storm",
              title: "Gateway reconnect storm",
              summary: "Repeated reconnect evidence suggests unstable listener continuity.",
              evidence: ["Reconnect evidence: Gateway ready."],
              degraded: false
            },
            recommend: [
              { id: "notify-operator", title: "Notify downstream operators through the delivery surfaces.", rationale: "Reconnect instability can invalidate fresh-state assumptions.", priority: "high", actionId: "deliver_slack" },
              { id: "record-note", title: "Capture an operator note before closeout.", rationale: "Preserves the local interpretation of degraded continuity.", priority: "high", actionId: "save_note" }
            ],
            act: [
              { id: "rebuild_visible_state", label: "Rebuild state", description: "Rebuild visible state from persisted evidence and current subscriptions.", availability: "available", confirmation: "none" },
              { id: "open_raw_logs", label: "Open raw logs", description: "Review the raw log-oriented evidence path for this incident.", availability: "available", confirmation: "none" },
              { id: "deliver_slack", label: "Notify Slack", description: "Send the incident packet through the Slack delivery target.", availability: "available", confirmation: "confirm" },
              { id: "save_note", label: "Save note", description: "Attach a new operator investigation note to this incident.", availability: "available", confirmation: "none" }
            ],
            record: {
              noteCount: investigationNotes.length,
              latestReceiptIds: [],
              actionRecords: []
            }
          }
        }
      }
    });
  });
  await page.route("**/api/incidents/*/actions/*", async (route) => {
    const segments = new URL(route.request().url()).pathname.split("/");
    const actionId = segments.at(-1) ?? "save_note";
    const body = route.request().postDataJSON() as { body?: string };
    await route.fulfill({
      json: {
        ok: true,
        actionRecord: {
          id: `record-${actionId}`,
          incidentId: "incident-1",
          kind: actionId,
          title: actionId.replaceAll("_", " "),
          status: "completed",
          summary: actionId === "save_note" ? "Investigation note recorded." : `${actionId} completed.`,
          createdAt: "2026-05-04T12:06:30.000Z"
        },
        ...(actionId === "save_note"
          ? {
              note: {
                id: "note-created",
                dayKey: "2026-05-03",
                incidentId: "incident-1",
                author: "local-user",
                body: body.body ?? "",
                linkedEntryIds: [dayThree.entries[0].id],
                createdAt: "2026-05-04T12:06:00.000Z",
                updatedAt: "2026-05-04T12:06:00.000Z"
              }
            }
          : {}),
        nextWorkspace: {
          incident: incidents[0] ?? { id: "incident-1", title: "Operational instability narrative", summary: "Derived incident summary.", dayKeys: ["2026-05-03"], entryIds: [dayThree.entries[0].id], createdAt: "2026-05-04T12:04:00.000Z", runbookSuggestions: [] },
          entries: dayThree.entries.slice(0, 2),
          alertFindings: gatewayStatus === "ready" ? [{ ruleId: "reconnect-storm", title: "Reconnect storm", triggered: true, detail: "Reconnect storm triggered for 2026-05-03." }] : [],
          generatedSummary: { summary: "1 failure, 1 approval, 1 tool event, 2 total journal entries.", createdAt: "2026-05-04T12:02:00.000Z", source: "rules", lastEntryIncludedAt: "2026-05-03T12:02:00.000Z", latestEntryObservedAt: "2026-05-03T12:02:00.000Z", freshnessState: "fresh" },
          notes: investigationNotes,
          sessionKeys: ["agent:hugin:main"],
          suggestedNextActions: ["Check Gateway listener health"],
          loop: {
            detect: { title: "Operational instability narrative", summary: "2 linked entries across 1 day(s); 1 active alert finding(s).", affectedDayKeys: ["2026-05-03"], sessionKeys: ["agent:hugin:main"], linkedEntryIds: [dayThree.entries[0].id], evidence: ["Reconnect evidence: Gateway ready."] },
            explain: { category: "reconnect_storm", title: "Gateway reconnect storm", summary: "Repeated reconnect evidence suggests unstable listener continuity.", evidence: ["Reconnect evidence: Gateway ready."], degraded: false },
            recommend: [{ id: "record-note", title: "Capture an operator note before closeout.", rationale: "Preserves the local interpretation of degraded continuity.", priority: "high", actionId: "save_note" }],
            act: [{ id: "save_note", label: "Save note", description: "Attach a new operator investigation note to this incident.", availability: "available", confirmation: "none" }],
            record: { noteCount: 1, latestReceiptIds: [], actionRecords: [{ id: `record-${actionId}`, incidentId: "incident-1", kind: actionId, title: actionId.replaceAll("_", " "), status: "completed", summary: actionId === "save_note" ? "Investigation note recorded." : `${actionId} completed.`, createdAt: "2026-05-04T12:06:30.000Z" }] }
          }
        }
      }
    });
  });
  await page.route("**/api/lineage/*", async (route) => {
    const entryId = new URL(route.request().url()).pathname.split("/").at(-1) ?? "entry-1";
    await route.fulfill({
      json: {
        lineage: {
          entryId,
          rawEventHash: "hash-1",
          incidentIds: ["incident-1"],
          replayIds: ["replay:incident-1"],
          bundleExportIds: ["bundle-1"],
          deliveryReceiptIds: ["receipt-1"]
        }
      }
    });
  });
  await page.route("**/api/summaries/profiles", async (route) => {
    await route.fulfill({
      json: {
        profiles: [
          { id: "default-operator", label: "Default operator summary", audience: "operator", instructions: "Summarize the day for the next operator shift." },
          { id: "escalation", label: "Escalation summary", audience: "incident commander", instructions: "Summarize operator risk and the most important evidence." }
        ]
      }
    });
  });
  await page.route("**/api/summaries/profiles/*/generate", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        summary: {
          profileId: "escalation",
          title: "Escalation summary 2026-05-03",
          summary: "Escalation summary for 2026-05-03. Evidence includes 1 failures, 1 approvals, and 1 tool events. Cited entries: 2026-05-03-entry-1.",
          citations: [{ entryId: "2026-05-03-entry-1", title: "Session started", timestamp: "2026-05-03T12:01:00.000Z" }],
          createdAt: "2026-05-04T12:07:00.000Z"
        }
      }
    });
  });
  await page.route("**/api/integrity-monitor/run", async (route) => {
    await route.fulfill({ json: { ok: true, report: { id: "report-1", createdAt: "2026-05-04T12:08:00.000Z", ok: true, checks: [{ id: "schema_health", ok: true, detail: "Expected governance tables are present." }] } } });
  });
  await page.route("**/api/integrity-monitor/reports", async (route) => {
    await route.fulfill({ json: { reports: [{ id: "report-1", createdAt: "2026-05-04T12:08:00.000Z", ok: true, checks: [{ id: "schema_health", ok: true, detail: "Expected governance tables are present." }] }] } });
  });
  await page.route("**/api/analytics", async (route) => {
    await route.fulfill({ json: { analytics: { createdAt: "2026-05-04T12:09:00.000Z", noisyTools: [{ toolName: "get_repository_status", count: 2 }], reconnectHeavyDays: [{ dayKey: "2026-05-03", reconnectCount: 1 }], approvalHotspots: [{ dayKey: "2026-05-03", approvalCount: 1 }], recurringFailureClasses: [{ label: "tool_failure", count: 1 }] } } });
  });
  await page.route("**/api/replay/*", async (route) => {
    if (options.failReplayCorrelation) {
      await route.fulfill({ status: 503, json: { error: "replay_unavailable" } });
      return;
    }
    await route.fulfill({ json: { replay: { incidentId: "incident-1", title: "Operational instability narrative", generatedAt: "2026-05-04T12:10:00.000Z", steps: [{ id: "step-1", kind: "entry", entryIds: ["2026-05-03-entry-1"], timestamp: "2026-05-03T12:01:00.000Z", label: "Session started", derived: false, sourceIds: ["2026-05-03-entry-1"] }] } } });
  });
  await page.route("**/api/correlation/*", async (route) => {
    if (options.failReplayCorrelation) {
      await route.fulfill({ status: 503, json: { error: "correlation_unavailable" } });
      return;
    }
    await route.fulfill({ json: { graph: { incidentId: "incident-1", nodes: [{ id: "incident-1", type: "incident", label: "Operational instability narrative" }, { id: "2026-05-03-entry-1", type: "entry", label: "Session started" }], edges: [{ id: "edge-1", from: "incident-1", to: "2026-05-03-entry-1", relationship: "includes" }] } } });
  });
  await page.route("**/api/plugins", async (route) => {
    await route.fulfill({ json: { plugins: [] } });
  });
  await page.route("**/api/capabilities", async (route) => {
    await route.fulfill({
      json: {
        capabilities: [
          buildCapability("delivery:slack", "Slack", "delivery_target", "delivery:slack"),
          buildCapability("delivery:generic-webhook", "Generic webhook", "delivery_target", "delivery:generic-webhook"),
          buildCapability("delivery:email", "Email", "delivery_target", "delivery:email"),
          buildCapability("incident-action:deliver_slack", "Notify Slack", "incident_action", "delivery:slack"),
          buildCapability("governance:integrity-monitor", "Integrity monitor", "governance_surface", "integrity:write")
        ]
      }
    });
  });
  await page.route("**/api/plugins/register", async (route) => {
    await route.fulfill({ json: { ok: true, plugin: { id: "local-annotation-plugin", label: "Local Annotation Plugin", version: "0.1.0", capabilities: ["annotation"], readScopes: ["entries", "incidents", "notes"] } } });
  });
  await page.route("**/api/plugins/*/run", async (route) => {
    await route.fulfill({ json: { ok: true, result: { id: "plugin-run-1", pluginId: "local-annotation-plugin", status: "completed", createdAt: "2026-05-04T12:11:00.000Z", summary: "Plugin Local Annotation Plugin ran with annotation capability boundaries." } } });
  });
  await page.route("**/api/integrations/receipts?**", async (route) => {
    await route.fulfill({
      json: {
        receipts: [
          {
            id: "receipt-1",
            target: "slack",
            dayKey: "2026-05-03",
            title: "OpenClog Journal handoff",
            status: "failed",
            requestedAt: "2026-05-04T12:12:00.000Z",
            completedAt: "2026-05-04T12:12:01.000Z",
            correlationId: "corr-slack",
            retryCount: 0,
            attemptNumber: 1,
            idempotencyKey: "incident-1:slack",
            requestFingerprint: "fingerprint-1",
            errorCategory: "missing_config",
            deadLetterReason: "delivery target is not configured"
          }
        ]
      }
    });
  });
  await page.route("**/api/integrations/receipts/*/retry", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        receipt: {
          id: "receipt-1-retry",
          target: "slack",
          dayKey: "2026-05-03",
          title: "OpenClog Journal handoff",
          status: "failed",
          requestedAt: "2026-05-04T12:13:00.000Z",
          completedAt: "2026-05-04T12:13:01.000Z",
          correlationId: "corr-slack-retry",
          retryCount: 1,
          attemptNumber: 2,
          retryOfReceiptId: "receipt-1",
          idempotencyKey: "incident-1:slack",
          requestFingerprint: "fingerprint-1",
          errorCategory: "missing_config",
          deadLetterReason: "delivery target is not configured"
        }
      }
    });
  });
  await page.route("**/api/integrations/receipts/*", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        receipt: {
          id: "receipt-1",
          target: "slack",
          dayKey: "2026-05-03",
          title: "OpenClog Journal handoff",
          status: "failed",
          requestedAt: "2026-05-04T12:12:00.000Z",
          completedAt: "2026-05-04T12:12:01.000Z",
          correlationId: "corr-slack",
          retryCount: 0,
          attemptNumber: 1,
          requestFingerprint: "fingerprint-1",
          idempotencyKey: "incident-1:slack",
          errorCategory: "missing_config",
          deadLetterReason: "delivery target is not configured"
        }
      }
    });
  });
  await page.route("**/api/integrations/*/deliver", async (route) => {
    const target = new URL(route.request().url()).pathname.split("/").at(-2) ?? "slack";
    await route.fulfill({ json: { ok: true, receipt: { id: `receipt-${target}`, target, dayKey: "2026-05-03", title: "OpenClog Journal handoff", status: "failed", requestedAt: "2026-05-04T12:12:00.000Z", completedAt: "2026-05-04T12:12:01.000Z", correlationId: `corr-${target}`, retryCount: 0, errorCategory: "missing_config", deadLetterReason: "delivery target is not configured" } } });
  });
  await page.route("**/api/integrations/*/verify", async (route) => {
    const target = new URL(route.request().url()).pathname.split("/").at(-2) ?? "slack";
    await route.fulfill({
      json: {
        ok: true,
        receipt: {
          id: `receipt-${target}-verify`,
          target,
          dayKey: "2026-05-03",
          title: "OpenClog Journal handoff verification",
          status: "failed",
          requestedAt: "2026-05-04T12:11:00.000Z",
          completedAt: "2026-05-04T12:11:01.000Z",
          correlationId: `corr-${target}-verify`,
          retryCount: 0,
          dryRun: true,
          deliveryReference: "dry-run",
          errorCategory: "missing_config",
          deadLetterReason: "delivery target is not configured"
        }
      }
    });
  });
  await page.route("**/api/operations/center?**", async (route) => {
    await route.fulfill({
      json: {
        report: {
          dayKey: "2026-05-03",
          incidentId: incidents[0]?.id,
          generatedAt: "2026-05-04T12:20:00.000Z",
          summaryJobHistory: {
            jobs: [
              {
                id: "summary-job-fixture",
                dayKey: "2026-05-03",
                status: "completed",
                createdAt: "2026-05-04T12:02:00.000Z",
                startedAt: "2026-05-04T12:02:01.000Z",
                completedAt: "2026-05-04T12:02:02.000Z",
                progressLabel: "Summary generated from current journal evidence.",
                correlationId: "corr-summary",
                queuedForMs: 1000,
                runningForMs: 1000,
                totalMs: 2000,
                medianCompletionMs: 2000
              }
            ],
            days: [{ dayKey: "2026-05-03", retries: 0, failureReasons: [], medianCompletionMs: 2000 }]
          },
          incidentEvidenceChecklist: {
            incidentId: incidents[0]?.id ?? "unscoped",
            ready: !options.emptyAdvancedState,
            items: [
              { id: "timeline", label: "Timeline evidence", present: true, evidenceIds: dayThree.entries.map((entry) => entry.id) },
              { id: "receipts", label: "Delivery receipts", present: !options.emptyAdvancedState, evidenceIds: ["receipt-1"] },
              { id: "replay", label: "Replay evidence", present: !options.emptyAdvancedState, evidenceIds: ["replay:incident-1"] },
              { id: "correlation", label: "Correlation graph", present: !options.emptyAdvancedState, evidenceIds: ["incident-1"] },
              { id: "notes", label: "Operator notes", present: investigationNotes.length > 0, evidenceIds: investigationNotes.map((note) => note.id) },
              { id: "handoff_packet", label: "Handoff packet", present: !options.emptyAdvancedState, evidenceIds: ["packet-1"] }
            ]
          },
          investigationBundlePreview: {
            dayKey: "2026-05-03",
            incidentId: incidents[0]?.id,
            items: [
              { id: "timeline:2026-05-03", label: "Timeline", kind: "timeline", redacted: true, evidenceIds: dayThree.entries.map((entry) => entry.id) },
              { id: "receipt-1", label: "Slack receipt", kind: "receipt", redacted: true, evidenceIds: ["receipt-1"] }
            ],
            redactionWarnings: []
          },
          readinessHistory: {
            windowHours: 24,
            points: [{ timestamp: "2026-05-03T12:05:00.000Z", gatewayReady: gatewayStatus === "ready", missingScopeCount: missingScopes.length, reconnectCount: 2, backendRestartCount: 0 }]
          },
          deliveryLedger: {
            items: [
              {
                id: "receipt-1",
                target: "slack",
                dayKey: "2026-05-03",
                title: "OpenClog Journal handoff",
                status: "failed",
                requestedAt: "2026-05-04T12:12:00.000Z",
                completedAt: "2026-05-04T12:12:01.000Z",
                correlationId: "corr-slack",
                retryCount: 0,
                attemptNumber: 1,
                idempotencyKey: "incident-1:slack",
                requestFingerprint: "fingerprint-1",
                errorCategory: "missing_config",
                deadLetterReason: "delivery target is not configured",
                sameKeyRetryRequiresConfirmation: true
              }
            ]
          },
          routePerformanceBudgets: [
            { route: "/api/summary-jobs", budgetMs: 250, observedMs: 120, status: "ok" },
            { route: "/api/incidents", budgetMs: 300, observedMs: 150, status: "ok" },
            { route: "/api/health", budgetMs: 100, observedMs: 60, status: "ok" }
          ],
          chaosScenarios: [
            { id: "stale-backend-fingerprint", title: "Stale backend fingerprint rejects live requests", deterministic: true, expectedOutcome: "stale_backend_fingerprint" },
            { id: "summary-poll-timeout", title: "Summary polling times out fail-closed", deterministic: true, expectedOutcome: "summary_job_polling_timed_out" },
            { id: "delivery-dead-letter", title: "Delivery dead-letter remains retryable with confirmation", deterministic: true, expectedOutcome: "retry_requires_same_idempotency_confirmation" }
          ],
          recommendationRationales: [{ recommendationId: "summary-refresh-before-handoff", whyThisRecommendation: "Newer local evidence exists than the generated summary includes.", evidenceIds: ["2026-05-03-entry-1"], rulePackIds: ["default-incident-loop"] }],
          verificationCenter: {
            generatedAt: "2026-05-04T12:20:00.000Z",
            lastSuccessfulGatewayVerifyAt: "2026-05-04T12:18:00.000Z",
            gates: [
              { id: "summary_freshness", label: "Summary freshness", status: "warning", detail: "Summary may exclude latest entries.", evidenceIds: [] },
              { id: "delivery_dry_runs", label: "Delivery dry-runs", status: "blocked", detail: "Failed dry-run receipt is present.", evidenceIds: ["receipt-slack-verify"] },
              { id: "replay_integrity", label: "Replay integrity", status: "passed", detail: "Replay evidence is reconstructable.", evidenceIds: ["replay:incident-1"] },
              { id: "gateway_readiness", label: "Gateway readiness", status: gatewayStatus === "ready" ? "passed" : "blocked", detail: "Gateway readiness fixture.", evidenceIds: ["verification-gateway"] },
              { id: "desktop_self_check", label: "Desktop self-check", status: "unknown", detail: "Desktop self-check fixture unavailable.", evidenceIds: [] },
              { id: "route_budgets", label: "Route budgets", status: "passed", detail: "Route budgets are within fixture baselines.", evidenceIds: ["/api/summary-jobs", "/api/incidents", "/api/health"] }
            ]
          },
          governedSdkManifests: [
            { id: "slack", permissions: ["delivery:slack"], expiresAt: "2026-06-08", supportsDryRun: true, failureModes: ["missing_config"] },
            { id: "email", permissions: ["delivery:email"], expiresAt: "2026-06-08", supportsDryRun: true, failureModes: ["missing_config"] },
            { id: "github", permissions: ["delivery:github-issue"], expiresAt: "2026-06-08", supportsDryRun: true, failureModes: ["missing_config"] },
            { id: "plugins", permissions: ["plugin:run"], expiresAt: "2026-06-08", supportsDryRun: true, failureModes: ["validation_blocked"] }
          ],
          evidenceQualityScores: incidents.length > 0 ? [{ incidentId: "incident-1", score: 82, grade: "good", freshness: 70, completeness: 100, provenance: 90, actionOutcomeCoverage: 70 }] : [],
          roleAwareSimulations: [
            { id: "stale-backend", role: "operator", title: "Stale backend fingerprint rehearsal", liveSideEffects: false, expectedValidationSteps: ["Detect fingerprint drift"] },
            { id: "missing-scopes", role: "operator", title: "Missing Gateway scopes rehearsal", liveSideEffects: false, expectedValidationSteps: ["Inspect scopes"] },
            { id: "delivery-dead-letter", role: "incident-commander", title: "Delivery dead-letter rehearsal", liveSideEffects: false, expectedValidationSteps: ["Confirm same-key retry"] }
          ],
          causalityGraph: { incidentId: "incident-1", nodes: [{ id: "incident-1", type: "incident", label: "Operational instability narrative" }], edges: [] },
          operationsLedger: { entries: [{ id: "ledger-delivery-receipt-1", action: "delivery.failed", timestamp: "2026-05-04T12:12:01.000Z", status: "failed", actor: "openclog", targetId: "receipt-1", correlationId: "corr-slack", evidenceIds: ["receipt-1"] }] },
          nativeTruthMonitor: {
            status: gatewayStatus === "ready" ? "passed" : "blocked",
            checks: [
              { id: "api_health", status: "passed", detail: "API health route is represented in local diagnostics." },
              { id: "gateway_readiness", status: gatewayStatus === "ready" ? "passed" : "blocked", detail: "Gateway readiness fixture." },
              { id: "launch_agent", status: "unknown", detail: "LaunchAgent status requires native host inspection." },
              { id: "backend_fingerprint", status: "passed", detail: "Backend fingerprint is present." },
              { id: "desktop_self_check", status: "unknown", detail: "Desktop self-check fixture unavailable." }
            ]
          },
          policyRecommendationPacks: [
            { id: "failed-summaries", label: "Failed summaries", recommendations: [{ recommendationId: "summary-refresh-before-handoff", whyThisRecommendation: "Derived from local evidence.", evidenceIds: ["2026-05-03-entry-1"], rulePackIds: ["default-incident-loop"] }] },
            { id: "delivery-dead-letters", label: "Delivery dead letters", recommendations: [{ recommendationId: "delivery-dead-letter-retry", whyThisRecommendation: "Failed delivery evidence exists.", evidenceIds: ["receipt-1"], rulePackIds: ["default-incident-loop"] }] }
          ]
        }
      }
    });
  });
  await page.route("**/api/investigation-notes?**", async (route) => {
    await route.fulfill({ json: { notes: investigationNotes } });
  });
  await page.route("**/api/investigation-notes", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fulfill({ json: { notes: investigationNotes } });
      return;
    }
    const body = route.request().postDataJSON() as { incidentId?: string; body?: string; dayKey?: string; linkedEntryIds?: string[] };
    await route.fulfill({
      json: {
        ok: true,
        note: {
          id: "note-created",
          dayKey: body.dayKey ?? "2026-05-03",
          incidentId: body.incidentId,
          author: "local-user",
          body: body.body ?? "",
          linkedEntryIds: body.linkedEntryIds ?? [],
          createdAt: "2026-05-04T12:06:00.000Z",
          updatedAt: "2026-05-04T12:06:00.000Z"
        }
      }
    });
  });
  await page.route("**/api/alerts", async (route) => {
    const findingState = alertStates.get("reconnect-storm") ?? {};
    await route.fulfill({
      json: {
        rules: [{ id: "reconnect-storm", kind: "reconnect_storm", title: "Reconnect storm", threshold: 1, enabled: true }],
        findings: options.emptyAdvancedState
          ? []
          : [{ ruleId: "reconnect-storm", title: "Reconnect storm", triggered: gatewayStatus === "ready", detail: "Reconnect storm triggered for 2026-05-03.", ...findingState }]
      }
    });
  });
  await page.route("**/api/alerts/rules/*", async (route) => {
    await route.fulfill({ json: { ok: true, rule: { id: "reconnect-storm", kind: "reconnect_storm", title: "Reconnect storm", threshold: 1, enabled: true } } });
  });
  await page.route("**/api/alerts/*/ack", async (route) => {
    const ruleId = new URL(route.request().url()).pathname.split("/").at(-2) ?? "reconnect-storm";
    const body = route.request().postDataJSON() as { acknowledgedAt?: string };
    const state = { ...(alertStates.get(ruleId) ?? {}), acknowledgedAt: body.acknowledgedAt ?? "2026-05-04T12:14:00.000Z" };
    alertStates.set(ruleId, state);
    await route.fulfill({ json: { ok: true, state: { ruleId, ...state } } });
  });
  await page.route("**/api/alerts/*/snooze", async (route) => {
    const ruleId = new URL(route.request().url()).pathname.split("/").at(-2) ?? "reconnect-storm";
    const body = route.request().postDataJSON() as { snoozedUntil?: string };
    const state = { ...(alertStates.get(ruleId) ?? {}), snoozedUntil: body.snoozedUntil ?? "2026-05-04T12:44:00.000Z" };
    alertStates.set(ruleId, state);
    await route.fulfill({ json: { ok: true, state: { ruleId, ...state } } });
  });
  await page.route("**/api/adapters/events", async (route) => {
    await route.fulfill({
      json: {
        events: options.emptyAdvancedState
          ? []
          : [{ id: "adapter-1", adapterName: "local-log", dayKey: "2026-05-03", title: "Bridge warning", body: "Bridge warning observed", timestamp: "2026-05-03T12:06:00.000Z", severity: "warning" }]
      }
    });
  });
  await page.route("**/api/profiles", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: { ok: true, profile: { id: "night-ops", label: "Night Ops", gatewayUrl: "ws://127.0.0.1:18789" } } });
      return;
    }
    await route.fulfill({ json: { selectedProfileId: "default", profiles: [{ id: "night-ops", label: "Night Ops", gatewayUrl: "ws://127.0.0.1:18789" }] } });
  });
  await page.route("**/api/profiles/*/select", async (route) => {
    await route.fulfill({ json: { ok: true, selectedProfileId: "night-ops" } });
  });
  await page.route("**/api/integrations/*", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.includes("/api/integrations/receipts") || pathname.endsWith("/deliver") || pathname.endsWith("/verify")) {
      await route.fallback();
      return;
    }
    await route.fulfill({ json: { ok: true, payload: { target: "github-issue", title: "OpenClog Journal handoff for 2026-05-03", body: "2026-05-03\n\n# OpenClog Journal\n" } } });
  });
  await page.route("**/api/replay-bundles/diff", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        diff: {
          changeClass: "evidence_shape",
          leftDayKey: "2026-05-02",
          rightDayKey: "2026-05-03",
          addedEntryIds: ["2026-05-03-entry-2"],
          removedEntryIds: [],
          summaryChanged: true,
          markdownChanged: false,
          entryCountDelta: 1,
          changedManifestFields: ["dayKey"],
          changedMetadataFields: ["status"]
        }
      }
    });
  });
  await page.route("**/api/closeout/plan", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        plan: {
          dayKey: "2026-05-03",
          generatedSummaryFresh: false,
          retentionPreview: { keepDays: 1, removedDayKeys: ["2026-05-02"], removedEntryCount: 2, removedSummaryCount: 1, removedAuditCount: 1 },
          incidentCount: incidents.length,
          noteCount: investigationNotes.length,
          exportTargets: ["github-issue", "markdown-vault"],
          checklist: [
            "Regenerate the day summary before closing out.",
            "1 incident record(s) ready for review.",
            "1 investigation note(s) recorded.",
            "Retention preview would remove 1 day(s).",
            "Prepare exports for github-issue, markdown-vault."
          ]
        }
      }
    });
  });
  await page.route("**/api/verification/receipts", async (route) => {
    await route.fulfill({
      json: {
        receipts: [
          { id: "verify-1", command: "verify", status: "passed", startedAt: "2026-05-04T12:30:00.000Z", completedAt: "2026-05-04T12:31:00.000Z", summary: "Local verify passed." },
          { id: "verify-gateway-1", command: "verify:gateway", status: "unknown", startedAt: "2026-05-04T12:31:00.000Z", summary: "Gateway verify not run in fixture." }
        ]
      }
    });
  });
  return { resolvedApprovals };
}

function buildDay(options: {
  approvalCount: number;
  dateLabel: string;
  dayKey: string;
  gatewayStatus: "ready" | "blocked" | "degraded";
  summary: string;
  title?: string;
}): JournalDay {
  return {
    dayKey: options.dayKey,
    title: options.title ?? "OpenClog Journal",
    dateLabel: options.dateLabel,
    summary: options.summary,
    generatedSummary: {
      summary: "1 failure, 1 approval, 1 tool event, 2 total journal entries.",
      createdAt: `${options.dayKey}T12:01:00.000Z`,
      source: "rules",
      lastEntryIncludedAt: `${options.dayKey}T12:00:00.000Z`,
      latestEntryObservedAt: `${options.dayKey}T12:02:00.000Z`,
      freshnessState: "stale"
    },
    evidenceCompleteness: {
      present: 3,
      total: 4,
      summaryPresent: true,
      notesPresent: true,
      bundlePresent: false,
      incidentPresent: true,
      label: "Evidence 3/4"
    },
    entries: [
      {
        id: `${options.dayKey}-entry-1`,
        dayKey: options.dayKey,
        source: "gateway",
        kind: "system_status",
        title: options.gatewayStatus === "ready" ? "Gateway ready" : "Gateway degraded",
        body: options.gatewayStatus === "ready" ? "OpenClaw Gateway scopes are negotiated." : "Missing operator.approvals scope.",
        timestamp: `${options.dayKey}T12:00:00.000Z`,
        status: options.gatewayStatus === "ready" ? "success" : "failed",
        severity: options.gatewayStatus === "ready" ? "info" : "warning",
        redacted: true
      },
      {
        id: `${options.dayKey}-entry-2`,
        dayKey: options.dayKey,
        source: "tool",
        kind: "tool_result",
        title: "Tool call",
        body: `Called get_repository_status for ${options.dayKey}.`,
        timestamp: `${options.dayKey}T12:02:00.000Z`,
        status: "success",
        toolName: "get_repository_status",
        redacted: true
      }
    ],
    metrics: { sessionCount: 2, messageCount: 2, toolCallCount: 1, approvalCount: options.approvalCount, errorCount: options.gatewayStatus === "ready" ? 0 : 1 }
  };
}

function summaryFor(day: JournalDay): Omit<JournalDay, "entries"> {
  return {
    dayKey: day.dayKey,
    title: day.title,
    dateLabel: day.dateLabel,
    summary: day.summary,
    evidenceCompleteness: day.evidenceCompleteness,
    incidentIds: day.incidentIds,
    metrics: day.metrics
  };
}

function buildCapability(id: string, label: string, kind: string, permission: string) {
  return {
    id,
    kind,
    label,
    purpose: `${label} fixture capability.`,
    version: "2026.05.08",
    permissions: [permission],
    failureModes: ["missing_config"],
    auditProvenance: ["journal_audit_log"],
    approvalSignature: `local-openclog:${id}`,
    reviewBy: "2026-06-08",
    source: "local_manifest",
    useGate: {
      capabilityId: id,
      allowed: true,
      status: "available",
      blockers: [],
      checkedAt: "2026-05-08T12:00:00.000Z"
    }
  };
}
