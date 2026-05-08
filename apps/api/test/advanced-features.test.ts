import { afterEach, describe, expect, test, vi } from "vitest";
import { createApiApp } from "../src/app.js";
import { createMemoryGateway } from "../src/memory-gateway.js";
import { createSqliteRepository } from "../src/repository.js";

describe("advanced OpenClog features", () => {
  const cleanup: Array<() => void> = [];

  afterEach(async () => {
    while (cleanup.length > 0) cleanup.pop()?.();
  });

  test("stores pinned day context, generates summaries, and exposes paginated search with match details", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    repo.addEntry({
      id: "session-start-entry",
      dayKey: "2026-05-04",
      source: "system",
      kind: "session_started",
      title: "Session started",
      body: "Session opened for Highfather",
      timestamp: "2026-05-04T09:00:00.000Z",
      status: "info",
      severity: "info",
      sessionId: "agent:highfather:main",
      redacted: true
    });
    repo.addEntry({
      id: "tool-failure-entry",
      dayKey: "2026-05-04",
      source: "tool",
      kind: "tool_result",
      title: "Tool failed",
      body: "get_repository_status failed after timeout",
      timestamp: "2026-05-04T09:01:00.000Z",
      status: "failed",
      severity: "error",
      toolName: "get_repository_status",
      sessionId: "agent:highfather:main",
      redacted: true
    });
    const app = createApiApp({ repo, gateway: createMemoryGateway({ ready: true }) });

    const pinned = await app.inject({
      method: "PUT",
      url: "/api/days/2026-05-04/context",
      payload: { note: "Pinned note", summary: "Pinned summary" }
    });
    const context = await app.inject({ method: "GET", url: "/api/days/2026-05-04/context" });
    const fetchedDay = await app.inject({ method: "GET", url: "/api/days/2026-05-04" });
    const generated = await app.inject({ method: "POST", url: "/api/days/2026-05-04/generate-summary" });
    const search = await app.inject({ method: "GET", url: "/api/search?q=timeout&limit=1" });

    expect(pinned.json()).toMatchObject({
      ok: true,
      context: { note: "Pinned note", summary: "Pinned summary" }
    });
    expect(context.json()).toMatchObject({
      ok: true,
      context: { note: "Pinned note", summary: "Pinned summary" }
    });
    expect(fetchedDay.json().day).toMatchObject({
      dayKey: "2026-05-04",
      pinnedContext: { note: "Pinned note", summary: "Pinned summary" }
    });
    expect(generated.json()).toMatchObject({
      ok: true,
      generatedSummary: { summary: expect.stringContaining("1 failure") }
    });
    expect(search.json()).toMatchObject({
      query: "timeout",
      results: [
        expect.objectContaining({
          dayKey: "2026-05-04",
          entryId: "tool-failure-entry",
          kind: "tool_result",
          matchFieldHints: expect.arrayContaining(["body"]),
          matchSnippet: expect.stringContaining("timeout"),
          title: "Tool failed"
        })
      ]
    });
    expect(search.json().nextCursor).toBeUndefined();
    await app.close();
  });

  test("records endpoint budget throttles as audit evidence", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    repo.addEntry({
      id: "search-entry",
      dayKey: "2026-05-04",
      source: "tool",
      kind: "tool_result",
      title: "Tool failed",
      body: "timeout while loading diagnostics",
      timestamp: "2026-05-04T09:01:00.000Z",
      status: "failed",
      severity: "error",
      toolName: "get_repository_status",
      sessionId: "agent:highfather:main",
      redacted: true
    });
    const app = createApiApp({ repo, gateway: createMemoryGateway({ ready: true }) });
    const addAuditSpy = vi.spyOn(repo, "addAudit");

    let lastResponse = await app.inject({ method: "GET", url: "/api/search?q=timeout" });
    for (let index = 0; index < 30; index += 1) {
      lastResponse = await app.inject({ method: "GET", url: "/api/search?q=timeout" });
    }

    expect(lastResponse.statusCode).toBe(429);
    expect(lastResponse.headers["x-openclog-degraded"]).toBe("endpoint_budget");
    expect(addAuditSpy).toHaveBeenCalledWith(
      "endpoint_budget.exceeded",
      expect.objectContaining({ target_type: "http_route", route: "/api/search?q=timeout", method: "GET" })
    );
    await app.close();
  });

  test("serves drilldowns, integrity, retention previews, incidents, notes, workspaces, alerts, adapters, profiles, integrations, and closeout tools", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.getState = () => ({
      canIssueControlActions: true,
      connectionStatus: "connected",
      lastConnectedAt: "2026-05-04T09:00:00.000Z",
      lastLiveEventAt: "2026-05-04T09:02:00.000Z",
      missingScopes: [],
      reconnectCount: 2,
      role: "operator",
      scopes: ["operator.read", "operator.write", "operator.approvals"],
      stale: false,
      status: "ready"
    });
    repo.addEntry({
      id: "reconnect-entry",
      dayKey: "2026-05-04",
      source: "system",
      kind: "system_status",
      title: "Gateway reconnected",
      body: "Recovered after timeout",
      timestamp: "2026-05-04T09:00:00.000Z",
      status: "success",
      severity: "warning",
      sessionId: "agent:hugin:main",
      redacted: true
    });
    repo.addEntry({
      id: "approval-entry",
      dayKey: "2026-05-04",
      source: "system",
      kind: "approval_requested",
      title: "Approval requested",
      body: "Needs approval",
      timestamp: "2026-05-04T09:01:00.000Z",
      status: "pending",
      severity: "warning",
      sessionId: "agent:hugin:main",
      approvalId: "approval-1",
      redacted: true
    });
    repo.addEntry({
      id: "approval-resolved-entry",
      dayKey: "2026-05-04",
      source: "gateway",
      kind: "approval_resolved",
      title: "Approval resolved",
      body: "allow-once",
      timestamp: "2026-05-04T09:02:00.000Z",
      status: "approved",
      severity: "info",
      approvalId: "approval-1",
      redacted: true
    });
    repo.recordAdapterEvent({
      adapterName: "local-log",
      body: "Bridge warning observed",
      dayKey: "2026-05-04",
      id: "adapter-1",
      severity: "warning",
      timestamp: "2026-05-04T09:03:00.000Z",
      title: "Bridge warning"
    });
    const app = createApiApp({ repo, gateway });

    const version = await app.inject({ method: "GET", url: "/api/version" });
    const healthHistory = await app.inject({ method: "GET", url: "/api/health/history?limit=5" });
    const drilldown = await app.inject({ method: "GET", url: "/api/sessions/agent%3Ahugin%3Amain" });
    const integrity = await app.inject({ method: "POST", url: "/api/integrity-check" });
    const retention = await app.inject({
      method: "POST",
      url: "/api/retention/preview",
      payload: { keepDays: 1, includeAudit: true, includeRedactedEvents: true, includeSummaries: true }
    });
    const incidents = await app.inject({ method: "GET", url: "/api/incidents" });
    const snapshot = await app.inject({
      method: "POST",
      url: "/api/incident-mode",
      payload: { dayKey: "2026-05-04", entryIds: ["reconnect-entry", "approval-entry"], title: "Gateway instability" }
    });
    const note = await app.inject({
      method: "POST",
      url: "/api/investigation-notes",
      payload: { dayKey: "2026-05-04", incidentId: snapshot.json().incident.id, body: "Operator captured reconnect evidence.", linkedEntryIds: ["reconnect-entry"] }
    });
    const notes = await app.inject({ method: "GET", url: `/api/investigation-notes?incidentId=${snapshot.json().incident.id}` });
    const workspace = await app.inject({ method: "GET", url: `/api/incidents/${snapshot.json().incident.id}/workspace` });
    const alerts = await app.inject({
      method: "PUT",
      url: "/api/alerts/rules/reconnect-storm",
      payload: { kind: "reconnect_storm", threshold: 2, enabled: true, title: "Reconnect storm" }
    });
    const alertStatus = await app.inject({ method: "GET", url: "/api/alerts" });
    const adapters = await app.inject({ method: "GET", url: "/api/adapters/events" });
    const profiles = await app.inject({
      method: "POST",
      url: "/api/profiles",
      payload: { id: "night-ops", label: "Night Ops", gatewayUrl: "ws://127.0.0.1:18789" }
    });
    const selectProfile = await app.inject({ method: "PUT", url: "/api/profiles/night-ops/select" });
    const integration = await app.inject({ method: "POST", url: "/api/integrations/github-issue", payload: { dayKey: "2026-05-04" } });
    const bundle = await app.inject({ method: "GET", url: "/api/days/2026-05-04/export/bundle" });
    const diff = await app.inject({
      method: "POST",
      url: "/api/replay-bundles/diff",
      payload: {
        left: { manifest: { dayKey: "2026-05-03", version: "0.1.0" }, day: { dayKey: "2026-05-03", summary: "before", entries: [{ id: "reconnect-entry" }] }, markdown: "# before" },
        right: bundle.json()
      }
    });
    const closeout = await app.inject({
      method: "POST",
      url: "/api/closeout/plan",
      payload: { dayKey: "2026-05-04", keepDays: 1, exportTargets: ["github-issue", "markdown-vault"] }
    });

    expect(healthHistory.json()).toMatchObject({
      history: expect.arrayContaining([
        expect.objectContaining({
          category: "reconnect",
          entryId: "reconnect-entry",
          title: "Gateway reconnected"
        })
      ])
    });
    expect(version.json()).toMatchObject({
      version: expect.any(String),
      buildTimestamp: expect.any(String),
      commitSha: expect.any(String)
    });
    expect(drilldown.json()).toMatchObject({
      sessionKey: "agent:hugin:main",
      approvalCount: 1,
      entries: expect.arrayContaining([
        expect.objectContaining({ id: "approval-entry", kind: "approval_requested" }),
        expect.objectContaining({ id: "approval-resolved-entry", kind: "approval_resolved" })
      ]),
      reconnectCount: 1,
      sanitizedSummary: expect.stringContaining("1 approval")
    });
    expect(integrity.json()).toMatchObject({
      ok: true,
      report: { checkedEntries: expect.any(Number), mismatchedEntryIds: [] }
    });
    expect(retention.json()).toMatchObject({
      ok: true,
      preview: { keepDays: 1, removedDayKeys: expect.any(Array) }
    });
    expect(incidents.json()).toMatchObject({
      incidents: [expect.objectContaining({ title: expect.any(String) })]
    });
    expect(snapshot.json()).toMatchObject({
      ok: true,
      incident: expect.objectContaining({ title: "Gateway instability" })
    });
    expect(note.json()).toMatchObject({
      ok: true,
      note: expect.objectContaining({ incidentId: snapshot.json().incident.id, body: "Operator captured reconnect evidence." })
    });
    expect(notes.json()).toMatchObject({
      notes: [expect.objectContaining({ incidentId: snapshot.json().incident.id, linkedEntryIds: ["reconnect-entry"] })]
    });
    expect(workspace.json()).toMatchObject({
      ok: true,
      workspace: {
        incident: expect.objectContaining({ id: snapshot.json().incident.id }),
        notes: [expect.objectContaining({ body: "Operator captured reconnect evidence." })],
        entries: expect.arrayContaining([expect.objectContaining({ id: "reconnect-entry" })])
      }
    });
    expect(alerts.json()).toMatchObject({ ok: true, rule: { id: "reconnect-storm", threshold: 2, enabled: true } });
    expect(alertStatus.json()).toMatchObject({
      rules: [expect.objectContaining({ id: "reconnect-storm" })],
      findings: [expect.objectContaining({ ruleId: "reconnect-storm" })]
    });
    expect(adapters.json()).toMatchObject({
      events: [expect.objectContaining({ id: "adapter-1", adapterName: "local-log" })]
    });
    expect(profiles.json()).toMatchObject({ ok: true, profile: { id: "night-ops", label: "Night Ops" } });
    expect(selectProfile.json()).toMatchObject({ ok: true, selectedProfileId: "night-ops" });
    expect(integration.json()).toMatchObject({
      ok: true,
      payload: { target: "github-issue", title: expect.any(String), body: expect.stringContaining("2026-05-04") }
    });
    expect(bundle.headers["content-type"]).toContain("application/json");
    expect(bundle.json()).toMatchObject({
      manifest: { dayKey: "2026-05-04" },
      day: { dayKey: "2026-05-04" },
      markdown: expect.stringContaining("# OpenClog Journal")
    });
    expect(diff.json()).toMatchObject({
      ok: true,
      diff: {
        changeClass: "evidence_shape",
        leftDayKey: "2026-05-03",
        rightDayKey: "2026-05-04",
        summaryChanged: true,
        markdownChanged: true,
        changedManifestFields: expect.arrayContaining(["dayKey"])
      }
    });
    expect(closeout.json()).toMatchObject({
      ok: true,
      plan: {
        dayKey: "2026-05-04",
        incidentCount: expect.any(Number),
        exportTargets: ["github-issue", "markdown-vault"],
        checklist: expect.any(Array)
      }
    });
    await app.close();
  });

  test("rejects unknown integration targets", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const app = createApiApp({ repo, gateway: createMemoryGateway({ ready: true }) });

    const response = await app.inject({ method: "POST", url: "/api/integrations/not-real", payload: { dayKey: "2026-05-04" } });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "integration_target_not_found" });
    await app.close();
  });

  test("builds Slack and generic webhook payloads and replays exported bundles", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    repo.addEntry({
      id: "incident-entry",
      dayKey: "2026-05-04",
      source: "system",
      kind: "error",
      title: "Gateway timed out",
      body: "Timeout during operator flow",
      timestamp: "2026-05-04T09:00:00.000Z",
      status: "failed",
      severity: "error",
      redacted: true
    });
    const app = createApiApp({ repo, gateway: createMemoryGateway({ ready: true }) });

    const slack = await app.inject({ method: "POST", url: "/api/integrations/slack", payload: { dayKey: "2026-05-04" } });
    const webhook = await app.inject({ method: "POST", url: "/api/integrations/generic-webhook", payload: { dayKey: "2026-05-04" } });
    const bundle = await app.inject({ method: "GET", url: "/api/days/2026-05-04/export/bundle" });
    const replay = await app.inject({ method: "POST", url: "/api/replay-bundles/inspect", payload: bundle.json() });

    expect(slack.json()).toMatchObject({
      ok: true,
      payload: { target: "slack", title: expect.stringContaining("2026-05-04"), body: expect.stringContaining("Gateway timed out") }
    });
    expect(webhook.json()).toMatchObject({
      ok: true,
      payload: { target: "generic-webhook", title: expect.stringContaining("2026-05-04"), body: expect.stringContaining("# OpenClog Journal") }
    });
    expect(replay.json()).toMatchObject({
      ok: true,
      replay: {
        dayKey: "2026-05-04",
        entryCount: 1,
        markdownPreview: expect.stringContaining("# OpenClog Journal")
      }
    });
    await app.close();
  });

  test("requires explicit local confirmation for monitoring imports and exposes imported provenance plus capabilities", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const app = createApiApp({ repo, gateway: createMemoryGateway({ ready: true }) });

    const blocked = await app.inject({
      method: "POST",
      url: "/api/monitoring-imports",
      payload: {
        dayKey: "2026-05-08",
        markdown: "- High-signal: surface Gmail source as incident handoff",
        sourceWorkflow: ["gmail", "blogwatcher", "openclaw"]
      }
    });
    const imported = await app.inject({
      method: "POST",
      url: "/api/monitoring-imports",
      payload: {
        confirmedLocalImport: true,
        dayKey: "2026-05-08",
        importedAt: "2026-05-08T12:00:00.000Z",
        sourcePath: "/Users/m4/newsletter-monitoring.md",
        sourceWorkflow: ["gmail", "blogwatcher", "openclaw"],
        markdown: [
          "## Gmail",
          "- Decision: keep quiet triage as note with token=secret-token",
          "## blogwatcher",
          "- High-signal: surface processswarm outage as incident handoff"
        ].join("\n")
      }
    });
    const notes = await app.inject({ method: "GET", url: "/api/investigation-notes?dayKey=2026-05-08" });
    const packets = await app.inject({ method: "GET", url: "/api/monitoring-imports/handoff-packets?dayKey=2026-05-08" });
    const context = await app.inject({ method: "GET", url: "/api/days/2026-05-08/context" });
    const capabilities = await app.inject({ method: "GET", url: "/api/capabilities" });

    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toEqual({ error: "monitoring_import_requires_local_confirmation" });
    expect(imported.json()).toMatchObject({
      ok: true,
      import: {
        decisions: [
          expect.objectContaining({ body: expect.stringContaining("token=[REDACTED_SECRET]") }),
          expect.objectContaining({ disposition: "incident_handoff" })
        ],
        handoffPackets: [expect.objectContaining({ title: expect.stringContaining("processswarm outage") })],
        provenance: {
          sourceWorkflow: ["gmail", "blogwatcher", "openclaw"],
          sourceHash: expect.stringMatching(/^sha256-/)
        }
      }
    });
    expect(notes.json()).toMatchObject({
      notes: expect.arrayContaining([expect.objectContaining({ author: "local-monitoring-import" })])
    });
    expect(JSON.stringify(notes.json())).not.toContain("secret-token");
    expect(packets.json()).toMatchObject({
      packets: [expect.objectContaining({ deliveryTargets: ["github-issue", "slack", "email"] })]
    });
    expect(context.json()).toMatchObject({
      ok: true,
      context: { summary: "Monitoring import: 2 decision(s), 1 handoff packet(s)." }
    });
    const notifySlackCapability = capabilities.json().capabilities.find((capability: { id: string }) => capability.id === "incident-action:deliver_slack");
    expect(notifySlackCapability).toMatchObject({
      id: "incident-action:deliver_slack",
      purpose: expect.any(String),
      version: expect.any(String),
      permissions: expect.any(Array),
      failureModes: expect.any(Array),
      auditProvenance: expect.any(Array),
      approvalSignature: expect.any(String),
      reviewBy: expect.any(String),
      useGate: { allowed: true }
    });
    await app.close();
  });

  test("paginates search and session drilldown responses", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    repo.addEntry({
      id: "search-entry-1",
      dayKey: "2026-05-04",
      source: "system",
      kind: "system_status",
      title: "Reconnect warning one",
      body: "Reconnect observed",
      timestamp: "2026-05-04T09:00:00.000Z",
      status: "info",
      severity: "warning",
      sessionId: "agent:hugin:main",
      redacted: true
    });
    repo.addEntry({
      id: "search-entry-2",
      dayKey: "2026-05-04",
      source: "tool",
      kind: "tool_result",
      title: "Reconnect warning two",
      body: "Reconnect observed again",
      timestamp: "2026-05-04T09:01:00.000Z",
      status: "failed",
      severity: "error",
      sessionId: "agent:hugin:main",
      redacted: true
    });
    repo.addEntry({
      id: "search-entry-3",
      dayKey: "2026-05-04",
      source: "system",
      kind: "approval_requested",
      title: "Reconnect warning three",
      body: "Reconnect observed third time",
      timestamp: "2026-05-04T09:02:00.000Z",
      status: "pending",
      severity: "warning",
      sessionId: "agent:hugin:main",
      approvalId: "approval-3",
      redacted: true
    });
    const app = createApiApp({ repo, gateway: createMemoryGateway({ ready: true }) });

    const firstSearchPage = await app.inject({ method: "GET", url: "/api/search?q=reconnect&limit=2" });
    const secondSearchPage = await app.inject({ method: "GET", url: "/api/search?q=reconnect&limit=2&cursor=2" });
    const firstDrilldownPage = await app.inject({ method: "GET", url: "/api/sessions/agent%3Ahugin%3Amain?limit=2" });
    const secondDrilldownPage = await app.inject({ method: "GET", url: "/api/sessions/agent%3Ahugin%3Amain?limit=2&cursor=2" });

    expect(firstSearchPage.json()).toMatchObject({
      query: "reconnect",
      nextCursor: "2",
      results: [expect.objectContaining({ entryId: "search-entry-3" }), expect.objectContaining({ entryId: "search-entry-2" })]
    });
    expect(secondSearchPage.json()).toMatchObject({
      query: "reconnect",
      results: [expect.objectContaining({ entryId: "search-entry-1" })]
    });
    expect(secondSearchPage.json().nextCursor).toBeUndefined();
    expect(firstDrilldownPage.json()).toMatchObject({
      sessionKey: "agent:hugin:main",
      nextCursor: "2",
      entries: [expect.objectContaining({ id: "search-entry-1" }), expect.objectContaining({ id: "search-entry-2" })]
    });
    expect(secondDrilldownPage.json()).toMatchObject({
      sessionKey: "agent:hugin:main",
      entries: [expect.objectContaining({ id: "search-entry-3" })]
    });
    expect(secondDrilldownPage.json().nextCursor).toBeUndefined();
    await app.close();
  });

  test("applies retention snapshots, rolls them back, and tracks alert acknowledgement state", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    repo.addEntry({
      id: "old-entry",
      dayKey: "2026-05-03",
      source: "system",
      kind: "system_status",
      title: "Gateway reconnect",
      body: "Reconnect happened yesterday",
      timestamp: "2026-05-03T09:00:00.000Z",
      status: "info",
      severity: "warning",
      redacted: true
    });
    repo.addEntry({
      id: "new-entry",
      dayKey: "2026-05-04",
      source: "system",
      kind: "system_status",
      title: "Gateway reconnect",
      body: "Reconnect happened today",
      timestamp: "2026-05-04T09:00:00.000Z",
      status: "info",
      severity: "warning",
      redacted: true
    });
    const app = createApiApp({ repo, gateway: createMemoryGateway({ ready: true }) });

    await app.inject({
      method: "PUT",
      url: "/api/alerts/rules/reconnect-storm",
      payload: { kind: "reconnect_storm", threshold: 1, enabled: true, title: "Reconnect storm" }
    });

    const applied = await app.inject({
      method: "POST",
      url: "/api/retention/apply",
      payload: { keepDays: 1, includeAudit: true, includeRedactedEvents: true, includeSummaries: true }
    });
    const afterApplyDays = await app.inject({ method: "GET", url: "/api/days" });
    const acknowledged = await app.inject({
      method: "POST",
      url: "/api/alerts/reconnect-storm/ack",
      payload: { acknowledgedAt: "2026-05-04T12:00:00.000Z" }
    });
    const snoozed = await app.inject({
      method: "POST",
      url: "/api/alerts/reconnect-storm/snooze",
      payload: { snoozedUntil: "2026-05-04T13:00:00.000Z" }
    });
    const alerts = await app.inject({ method: "GET", url: "/api/alerts?dayKey=2026-05-04" });
    const rolledBack = await app.inject({
      method: "POST",
      url: `/api/retention/rollback/${applied.json().snapshot.id}`
    });
    const afterRollbackDays = await app.inject({ method: "GET", url: "/api/days" });

    expect(applied.json()).toMatchObject({
      ok: true,
      snapshot: { preview: { removedDayKeys: expect.arrayContaining(["2026-05-03"]) } }
    });
    expect(afterApplyDays.json().days.map((day: { dayKey: string }) => day.dayKey)).toEqual(["2026-05-04"]);
    expect(acknowledged.json()).toMatchObject({
      ok: true,
      state: { ruleId: "reconnect-storm", acknowledgedAt: "2026-05-04T12:00:00.000Z" }
    });
    expect(snoozed.json()).toMatchObject({
      ok: true,
      state: { ruleId: "reconnect-storm", snoozedUntil: "2026-05-04T13:00:00.000Z" }
    });
    expect(alerts.json()).toMatchObject({
      findings: [
        expect.objectContaining({
          ruleId: "reconnect-storm",
          acknowledgedAt: "2026-05-04T12:00:00.000Z",
          snoozedUntil: "2026-05-04T13:00:00.000Z"
        })
      ]
    });
    expect(rolledBack.json()).toMatchObject({
      ok: true,
      restoredDayKeys: expect.arrayContaining(["2026-05-04", "2026-05-03"])
    });
    expect(afterRollbackDays.json().days.map((day: { dayKey: string }) => day.dayKey)).toEqual(["2026-05-04", "2026-05-03", "2026-05-02"]);
    await app.close();
  });

  test("serves roadmap backend, receipt retry, closeout, verification, and investigation workspace contracts", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.getState = () => ({
      canIssueControlActions: true,
      connectionStatus: "connected",
      lastConnectedAt: "2026-05-04T09:00:00.000Z",
      lastLiveEventAt: "2026-05-04T09:02:00.000Z",
      missingScopes: [],
      reconnectCount: 2,
      role: "operator",
      scopes: ["operator.read", "operator.write", "operator.approvals"],
      stale: false,
      status: "ready",
      targetReachable: true
    });
    repo.addEntry({
      id: "roadmap-entry",
      dayKey: "2026-05-04",
      source: "system",
      kind: "system_status",
      title: "Gateway reconnected",
      body: "Recovered after timeout",
      timestamp: "2026-05-04T09:00:00.000Z",
      status: "success",
      severity: "warning",
      sessionId: "agent:hugin:main",
      redacted: true
    });
    const app = createApiApp({ repo, gateway });

    const version = await app.inject({ method: "GET", url: "/api/version" });
    const health = await app.inject({ method: "GET", url: "/api/health" });
    const fingerprint = await app.inject({ method: "GET", url: "/api/backend/fingerprint" });
    const staleSession = await app.inject({
      method: "GET",
      url: "/api/sessions/agent%3Ahugin%3Amain",
      headers: { "x-openclog-runtime-fingerprint": "stale-fingerprint" }
    });
    const dryRun = await app.inject({
      method: "POST",
      url: "/api/integrations/slack/verify",
      payload: { dayKey: "2026-05-04" }
    });
    const failedDelivery = await app.inject({
      method: "POST",
      url: "/api/integrations/slack/deliver",
      payload: { dayKey: "2026-05-04", incidentId: "incident-1" }
    });
    const receipt = await app.inject({ method: "GET", url: `/api/integrations/receipts/${failedDelivery.json().receipt.id}` });
    const retryBlocked = await app.inject({
      method: "POST",
      url: `/api/integrations/receipts/${failedDelivery.json().receipt.id}/retry`,
      payload: { confirmSameIdempotencyKey: false }
    });
    const retry = await app.inject({
      method: "POST",
      url: `/api/integrations/receipts/${failedDelivery.json().receipt.id}/retry`,
      payload: { confirmSameIdempotencyKey: true }
    });
    const closeoutBlocked = await app.inject({
      method: "POST",
      url: "/api/closeout/complete",
      payload: { dayKey: "2026-05-04", exportTargets: [] }
    });
    const verificationReceipts = await app.inject({ method: "GET", url: "/api/verification/receipts" });
    const workspace = await app.inject({
      method: "POST",
      url: "/api/investigations/workspaces",
      payload: { dayKeys: ["2026-05-04", "2026-05-05"], title: "Two-day reconnect investigation" }
    });
    const fetchedWorkspace = await app.inject({ method: "GET", url: `/api/investigations/workspaces/${workspace.json().workspace.id}` });
    const operationsCenter = await app.inject({ method: "GET", url: "/api/operations/center?dayKey=2026-05-04&incidentId=incident-1" });
    const deliveryLedger = await app.inject({ method: "GET", url: "/api/operations/delivery-ledger?status=failed&q=slack" });
    const simulations = await app.inject({ method: "GET", url: "/api/operations/simulations" });

    expect(version.json()).toMatchObject({
      version: expect.any(String),
      commitSha: expect.any(String),
      buildTimestamp: expect.any(String),
      pid: expect.any(Number),
      bootedAt: expect.any(String),
      runtimeFingerprint: expect.any(String),
      nodeVersion: expect.stringMatching(/^v/)
    });
    expect(health.json()).toMatchObject({
      backend: { runtimeFingerprint: version.json().runtimeFingerprint },
      gateway: {
        targetReachable: true,
        scopes: expect.arrayContaining(["operator.read"]),
        scopeNegotiation: {
          have: expect.arrayContaining(["operator.read"]),
          missing: []
        }
      }
    });
    expect(fingerprint.json()).toMatchObject({ fingerprint: { runtimeFingerprint: version.json().runtimeFingerprint } });
    expect(staleSession.statusCode).toBe(409);
    expect(staleSession.json()).toMatchObject({ error: "stale_backend_fingerprint" });
    expect(dryRun.json()).toMatchObject({ ok: true, receipt: { target: "slack", dryRun: true, deliveryReference: "dry-run" } });
    expect(receipt.json()).toMatchObject({ receipt: { id: failedDelivery.json().receipt.id, requestFingerprint: expect.any(String) } });
    expect(retryBlocked.statusCode).toBe(409);
    expect(retryBlocked.json()).toMatchObject({ error: "retry_requires_same_idempotency_confirmation" });
    expect(retry.json()).toMatchObject({
      ok: true,
      receipt: {
        retryOfReceiptId: failedDelivery.json().receipt.id,
        attemptNumber: 2,
        idempotencyKey: failedDelivery.json().receipt.idempotencyKey,
        requestFingerprint: failedDelivery.json().receipt.requestFingerprint
      }
    });
    expect(retry.json().receipt.id).not.toBe(failedDelivery.json().receipt.id);
    expect(closeoutBlocked.statusCode).toBe(409);
    expect(closeoutBlocked.json()).toMatchObject({ error: "closeout_blocked", plan: { dayKey: "2026-05-04" } });
    expect(verificationReceipts.json()).toMatchObject({
      receipts: expect.arrayContaining([expect.objectContaining({ command: "npm run verify", status: expect.any(String) })])
    });
    expect(workspace.json()).toMatchObject({ ok: true, workspace: { dayKeys: ["2026-05-04", "2026-05-05"] } });
    expect(fetchedWorkspace.json()).toMatchObject({ workspace: { id: workspace.json().workspace.id } });
    expect(operationsCenter.json()).toMatchObject({
      report: {
        verificationCenter: {
          gates: expect.arrayContaining([expect.objectContaining({ id: "summary_freshness" })])
        },
        operationsLedger: {
          entries: expect.arrayContaining([expect.objectContaining({ action: expect.stringMatching(/delivery|summary|verification/) })])
        },
        nativeTruthMonitor: {
          checks: expect.arrayContaining([expect.objectContaining({ id: "api_health" })])
        }
      }
    });
    expect(deliveryLedger.json()).toMatchObject({
      ledger: {
        items: expect.arrayContaining([expect.objectContaining({ target: "slack", status: "failed", sameKeyRetryRequiresConfirmation: true })])
      }
    });
    expect(simulations.json()).toMatchObject({
      simulations: expect.arrayContaining([expect.objectContaining({ id: "missing-scopes", liveSideEffects: false })])
    });
    await app.close();
  });
});
