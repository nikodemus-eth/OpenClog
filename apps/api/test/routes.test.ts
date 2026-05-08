import { afterEach, describe, expect, test } from "vitest";
import { createApiApp } from "../src/app.js";
import { createMemoryGateway } from "../src/memory-gateway.js";
import { createSqliteRepository } from "../src/repository.js";

describe("API routes", () => {
  const cleanup: Array<() => void> = [];

  afterEach(async () => {
    while (cleanup.length > 0) cleanup.pop()?.();
  });

  test("serves journal health and never leaks Gateway credentials", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const app = createApiApp({ repo, gateway: createMemoryGateway() });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain("secret-token");
    expect(response.json()).toMatchObject({ ok: true, gateway: { status: "degraded" } });
    await app.close();
  });

  test("serves safe Gateway reconnect and service-recovery health metadata", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.getState = () => ({
      canIssueControlActions: false,
      connectionStatus: "connecting",
      lastConnectedAt: "2026-05-03T16:00:00.000Z",
      lastDisconnectedAt: "2026-05-03T16:01:00.000Z",
      lastErrorReason: "gateway unavailable: Gateway connect.challenge timeout",
      missingScopes: [],
      nextReconnectAt: "2026-05-03T16:01:05.000Z",
      reconnectAttempt: 3,
      role: "operator",
      scopes: ["operator.read", "operator.write", "operator.approvals"],
      serviceRecovery: {
        enabled: true,
        lastAttemptAt: "2026-05-03T16:01:02.000Z",
        lastReason: "gateway unavailable: Gateway connect.challenge timeout",
        lastResult: "success",
        nextAllowedAt: "2026-05-03T16:06:02.000Z",
        restartCount: 1
      },
      stale: true,
      status: "degraded"
    });
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    const body = response.json();
    expect(body).toMatchObject({
      ok: true,
      backend: {
        pid: expect.any(Number),
        bootedAt: expect.any(String),
        runtimeFingerprint: expect.any(String),
        nodeVersion: expect.any(String)
      },
      gateway: {
        canIssueControlActions: false,
        connectionStatus: "connecting",
        lastConnectedAt: "2026-05-03T16:00:00.000Z",
        lastDisconnectedAt: "2026-05-03T16:01:00.000Z",
        lastErrorCategory: "challenge_timeout",
        lastErrorReason: "gateway unavailable: Gateway connect.challenge timeout",
        lastSuccessfulSyncAt: "2026-05-03T16:00:00.000Z",
        missingScopes: [],
        nextReconnectAt: "2026-05-03T16:01:05.000Z",
        reconnectAttempt: 3,
        role: "operator",
        scopes: ["operator.read", "operator.write", "operator.approvals"],
        scopeNegotiation: {
          have: ["operator.read", "operator.write", "operator.approvals"],
          missing: []
        },
        serviceRecovery: {
          enabled: true,
          lastAttemptAt: "2026-05-03T16:01:02.000Z",
          lastReason: "gateway unavailable: Gateway connect.challenge timeout",
          lastResult: "success",
          nextAllowedAt: "2026-05-03T16:06:02.000Z",
          restartCount: 1
        },
        stale: true,
        status: "degraded",
        targetReachable: false
      }
    });
    expect(response.body).not.toMatch(/gateway-token|privateKey|signature|connect"/i);
    await app.close();
  });

  test("omits absent optional Gateway service-recovery health fields", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.getState = () => ({
      canIssueControlActions: false,
      missingScopes: [],
      role: "operator",
      scopes: ["operator.read", "operator.write", "operator.approvals"],
      serviceRecovery: { enabled: true, restartCount: 0 },
      stale: true,
      status: "degraded"
    });
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.json()).toMatchObject({
      ok: true,
      backend: {
        pid: expect.any(Number),
        bootedAt: expect.any(String),
        runtimeFingerprint: expect.any(String),
        nodeVersion: expect.any(String)
      },
      gateway: {
        canIssueControlActions: false,
        missingScopes: [],
        role: "operator",
        scopes: ["operator.read", "operator.write", "operator.approvals"],
        scopeNegotiation: {
          have: ["operator.read", "operator.write", "operator.approvals"],
          missing: []
        },
        serviceRecovery: { enabled: true, restartCount: 0 },
        stale: true,
        status: "degraded",
        targetReachable: false
      }
    });
    await app.close();
  });

  test("stores notes locally and blocks admin-class composer commands", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const app = createApiApp({ repo, gateway: createMemoryGateway() });

    const note = await app.inject({ method: "POST", url: "/api/composer", payload: { text: "/note ship it carefully" } });
    const blocked = await app.inject({ method: "POST", url: "/api/composer", payload: { text: "/config set danger true" } });

    expect(note.statusCode).toBe(200);
    expect(note.json()).toMatchObject({ mode: "note", gatewayMethod: null });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toMatchObject({ error: "composer_command_blocked" });
    await app.close();
  });

  test("serves days, themes, settings, approvals, stream, and exports", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    const app = createApiApp({ repo, gateway });

    const days = await app.inject({ method: "GET", url: "/api/days" });
    const day = await app.inject({ method: "GET", url: "/api/days/2026-05-02" });
    const missing = await app.inject({ method: "GET", url: "/api/days/missing-day" });
    const themes = await app.inject({ method: "GET", url: "/api/themes" });
    const settings = await app.inject({ method: "GET", url: "/api/settings" });
    const updateSettings = await app.inject({ method: "PUT", url: "/api/settings", payload: { theme: "captains-log" } });
    const approvals = await app.inject({ method: "GET", url: "/api/approvals" });
    const markdown = await app.inject({ method: "GET", url: "/api/days/2026-05-02/export" });
    const html = await app.inject({ method: "GET", url: "/api/days/missing-day/export?format=html" });
    const stream = await app.inject({ method: "GET", url: "/api/stream?once=1" });

    expect(days.json().days).toHaveLength(1);
    expect(day.json().day).toMatchObject({ dayKey: "2026-05-02" });
    expect(missing.statusCode).toBe(404);
    expect(themes.json().themes).toHaveLength(27);
    expect(settings.json()).toMatchObject({ settings: { theme: "default", showToolCalls: true, gateway: { status: "ready" } } });
    expect(updateSettings.json()).toMatchObject({ ok: true, settings: { theme: "captains-log", showToolCalls: true } });
    expect(approvals.json()).toEqual({ approvals: [] });
    expect(markdown.headers["content-disposition"]).toContain("openclog-2026-05-02.md");
    expect(markdown.body).toContain("# OpenClog Journal");
    expect(html.headers["content-type"]).toContain("text/html");
    expect(html.body).toContain("<!doctype html>");
    expect(stream.body).toContain("event: heartbeat");
    expect(gateway.calls.map((call) => call.method)).toEqual(["exec.approval.list"]);
    await app.close();
  });

  test("persists public UI settings without changing Gateway state", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    const app = createApiApp({ repo, gateway });

    const update = await app.inject({ method: "PUT", url: "/api/settings", payload: { showToolCalls: false } });
    const settings = await app.inject({ method: "GET", url: "/api/settings" });

    expect(update.json()).toMatchObject({ ok: true, settings: { theme: "default", showToolCalls: false } });
    expect(settings.json()).toMatchObject({ settings: { theme: "default", showToolCalls: false, gateway: { status: "ready" } } });
    expect(gateway.calls).toEqual([]);
    await app.close();
  });

  test("serves live agent activity from sessions.list with sanitized labels", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.request = async (method, params) => {
      gateway.calls.push({ method, params });
      if (method === "sessions.list") {
        return {
          sessions: [
            { key: "agent:hugin:main", title: "Hugin", status: "running", lastSeenAt: "2026-05-02T13:00:00.000Z" },
            { key: "agent:munin:main", label: "Munin", phase: "idle", summary: "Watching quietly" },
            { key: "agent:secret:main", title: "OPENAI_API_KEY=sk-secret", status: "busy" }
          ]
        };
      }
      return { ok: true };
    };
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "GET", url: "/api/sessions?dayKey=2026-05-02" });

    expect(response.json()).toEqual({
      agents: [
        { id: "agent:hugin:main", label: "Hugin", status: "working", summary: "Running", sessionKey: "agent:hugin:main", lastSeenAt: "2026-05-02T13:00:00.000Z" },
        { id: "agent:secret:main", label: "[REDACTED_SECRET]", status: "working", summary: "Busy", sessionKey: "agent:secret:main" },
        { id: "agent:munin:main", label: "Munin", status: "idle", summary: "Watching quietly", sessionKey: "agent:munin:main" }
      ]
    });
    expect(gateway.calls).toEqual([{ method: "sessions.list", params: { includeDerivedTitles: true, includeLastMessage: true, limit: 50 } }]);
    await app.close();
  });

  test("normalizes live agent activity variants and falls back when the live list is empty", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.request = async (method, params) => {
      gateway.calls.push({ method, params });
      if (method === "sessions.list") {
        return [
          { sessionKey: "agent:freya:main", status: "active", summary: "Running live work" },
          { id: "plain-session", phase: "", note: "no public status" },
          { key: "agent:invalid:main", title: "OPENCLAW_GATEWAY_TOKEN=secret", status: "busy" },
          {}
        ];
      }
      return { ok: true };
    };
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "GET", url: "/api/sessions?dayKey=2026-05-02" });

    expect(response.json()).toEqual({
      agents: [
        { id: "agent:freya:main", label: "Freya", status: "working", summary: "Running live work", sessionKey: "agent:freya:main" },
        { id: "agent:invalid:main", label: "[REDACTED_SECRET]", status: "working", summary: "Busy", sessionKey: "agent:invalid:main" },
        { id: "plain-session", label: "Plain-session", status: "idle", summary: "Idle", sessionKey: "plain-session" }
      ]
    });
    await app.close();
  });

  test("keeps only the latest live agent activity per display name", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.request = async (method, params) => {
      gateway.calls.push({ method, params });
      if (method === "sessions.list") {
        return {
          sessions: [
            { key: "agent:highfather:old", title: "Highfather", status: "idle", summary: "Older Highfather", lastSeenAt: "2026-05-02T13:00:00.000Z" },
            { key: "agent:hugin:main", title: "Hugin", status: "running", summary: "Working", lastSeenAt: "2026-05-02T13:30:00.000Z" },
            { key: "agent:highfather:new", title: "Highfather", status: "running", summary: "Latest Highfather", lastSeenAt: "2026-05-02T14:00:00.000Z" },
            { key: "agent:highfather:stale", title: "Highfather", status: "idle", summary: "Stale Highfather", lastSeenAt: "2026-05-02T12:00:00.000Z" },
            { key: "agent:notime:old", title: "NoTime", status: "idle", summary: "Older no timestamp" },
            { key: "agent:notime:new", title: "NoTime", status: "running", summary: "Latest no timestamp" }
          ]
        };
      }
      return { ok: true };
    };
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "GET", url: "/api/sessions?dayKey=2026-05-02" });

    expect(response.json()).toEqual({
      agents: [
        { id: "agent:highfather:new", label: "Highfather", status: "working", summary: "Latest Highfather", sessionKey: "agent:highfather:new", lastSeenAt: "2026-05-02T14:00:00.000Z" },
        { id: "agent:hugin:main", label: "Hugin", status: "working", summary: "Working", sessionKey: "agent:hugin:main", lastSeenAt: "2026-05-02T13:30:00.000Z" },
        { id: "agent:notime:new", label: "NoTime", status: "working", summary: "Latest no timestamp", sessionKey: "agent:notime:new" }
      ]
    });
    await app.close();
  });

  test("orders working agents first and idle agents from most to least recently active", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.request = async (method, params) => {
      gateway.calls.push({ method, params });
      if (method === "sessions.list") {
        return {
          sessions: [
            { key: "agent:hugin:idle-old", title: "Hugin", status: "idle", summary: "Older idle", lastSeenAt: "2026-05-02T12:00:00.000Z" },
            { key: "agent:munin:active", title: "Munin", status: "running", summary: "Working now", lastSeenAt: "2026-05-02T11:00:00.000Z" },
            { key: "agent:freya:idle-new", title: "Freya", status: "idle", summary: "Newer idle", lastSeenAt: "2026-05-02T13:00:00.000Z" },
            { key: "agent:odin:idle-missing", title: "Odin", status: "idle", summary: "No last seen" },
            { key: "agent:loki:idle-missing", title: "Loki", status: "idle", summary: "Also no last seen" }
          ]
        };
      }
      return { ok: true };
    };
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "GET", url: "/api/sessions?dayKey=2026-05-02" });

    expect(response.json()).toEqual({
      agents: [
        { id: "agent:munin:active", label: "Munin", status: "working", summary: "Working now", sessionKey: "agent:munin:active", lastSeenAt: "2026-05-02T11:00:00.000Z" },
        { id: "agent:freya:idle-new", label: "Freya", status: "idle", summary: "Newer idle", sessionKey: "agent:freya:idle-new", lastSeenAt: "2026-05-02T13:00:00.000Z" },
        { id: "agent:hugin:idle-old", label: "Hugin", status: "idle", summary: "Older idle", sessionKey: "agent:hugin:idle-old", lastSeenAt: "2026-05-02T12:00:00.000Z" },
        { id: "agent:odin:idle-missing", label: "Odin", status: "idle", summary: "No last seen", sessionKey: "agent:odin:idle-missing" },
        { id: "agent:loki:idle-missing", label: "Loki", status: "idle", summary: "Also no last seen", sessionKey: "agent:loki:idle-missing" }
      ]
    });
    await app.close();
  });

  test("falls back to an empty journal day when live sessions are empty or unavailable", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.request = async (method, params) => {
      gateway.calls.push({ method, params });
      if (method === "sessions.list") return {};
      return { ok: true };
    };
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "GET", url: "/api/sessions" });

    expect(response.json()).toEqual({ agents: [] });
    expect(gateway.calls).toEqual([{ method: "sessions.list", params: { includeDerivedTitles: true, includeLastMessage: true, limit: 50 } }]);
    await app.close();
  });

  test("falls back to selected-day journal entries for agent activity", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: false });
    repo.addEntry({
      id: "agent-entry-1",
      dayKey: "2026-05-02",
      sessionId: "agent:hugin:main",
      source: "openclaw",
      kind: "assistant_message",
      title: "OpenClaw response",
      body: "Working on the current request",
      timestamp: "2026-05-02T14:00:00.000Z",
      status: "running",
      severity: "info",
      redacted: true
    });
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "GET", url: "/api/sessions?dayKey=2026-05-02" });

    expect(response.json()).toEqual({
      agents: [
        {
          id: "agent:hugin:main",
          label: "Hugin",
          status: "working",
          summary: "OpenClaw response",
          sessionKey: "agent:hugin:main",
          lastSeenAt: "2026-05-02T14:00:00.000Z"
        }
      ]
    });
    expect(gateway.calls).toEqual([]);
    await app.close();
  });

  test("uses the latest journal entry per session when deriving idle agent activity", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: false });
    repo.addEntry({
      id: "agent-entry-old",
      dayKey: "2026-05-02",
      sessionId: "agent:munin:main",
      source: "openclaw",
      kind: "assistant_message",
      title: "Older running entry",
      body: "Old work",
      timestamp: "2026-05-02T13:00:00.000Z",
      status: "running",
      severity: "info",
      redacted: true
    });
    repo.addEntry({
      id: "agent-entry-new",
      dayKey: "2026-05-02",
      sessionId: "agent:munin:main",
      source: "openclaw",
      kind: "assistant_message",
      title: "Later completed entry",
      body: "Done",
      timestamp: "2026-05-02T15:00:00.000Z",
      status: "success",
      severity: "info",
      redacted: true
    });
    repo.addEntry({
      id: "agent-entry-no-session",
      dayKey: "2026-05-02",
      source: "system",
      kind: "system_status",
      title: "Ignored entry without session",
      body: "No session",
      timestamp: "2026-05-02T16:00:00.000Z",
      status: "info",
      severity: "info",
      redacted: true
    });
    repo.addEntry({
      id: "agent-entry-too-old",
      dayKey: "2026-05-02",
      sessionId: "agent:munin:main",
      source: "openclaw",
      kind: "assistant_message",
      title: "Stale entry",
      body: "Older than the selected latest entry",
      timestamp: "2026-05-02T12:00:00.000Z",
      status: "running",
      severity: "info",
      redacted: true
    });
    repo.addEntry({
      id: "agent-entry-same-time",
      dayKey: "2026-05-02",
      sessionId: "agent:munin:main",
      source: "openclaw",
      kind: "assistant_message",
      title: "Same timestamp ignored",
      body: "Equal timestamp should not replace the current latest entry",
      timestamp: "2026-05-02T15:00:00.000Z",
      status: "running",
      severity: "info",
      redacted: true
    });
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "GET", url: "/api/sessions?dayKey=2026-05-02" });

    expect(response.json()).toEqual({
      agents: [
        {
          id: "agent:munin:main",
          label: "Munin",
          status: "idle",
          summary: "Later completed entry",
          sessionKey: "agent:munin:main",
          lastSeenAt: "2026-05-02T15:00:00.000Z"
        }
      ]
    });
    await app.close();
  });

  test("sanitizes approval list and resolves only explicit decisions", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.request = async (method, params) => {
      gateway.calls.push({ method, params });
      if (method === "exec.approval.list") {
        return {
          approvals: [
            {
              id: "approval-1",
              status: "pending",
              request: { command: "OPENAI_API_KEY=sk-secret npm test", sessionKey: "agent:hugin:main" },
              createdAt: "2026-05-02T13:10:00.000Z"
            }
          ],
          rawToken: "Bearer should-not-reach-browser"
        };
      }
      return { ok: true };
    };
    const app = createApiApp({ repo, gateway });

    const approvals = await app.inject({ method: "GET", url: "/api/approvals" });
    const approve = await app.inject({ method: "POST", url: "/api/approvals/approval-1/resolve", payload: { decision: "allow-once" } });
    const deny = await app.inject({ method: "POST", url: "/api/approvals/approval-2/resolve", payload: { decision: "deny" } });

    expect(approvals.json()).toEqual({
      approvals: [
        {
          id: "approval-1",
          title: "Approval requested",
          command: "[REDACTED_SECRET] npm test",
          status: "pending",
          requestedAt: "2026-05-02T13:10:00.000Z",
          sessionKey: "agent:hugin:main"
        }
      ]
    });
    expect(approvals.body).not.toContain("sk-secret");
    expect(approvals.body).not.toContain("Bearer");
    expect(approve.json()).toEqual({ ok: true });
    expect(deny.json()).toEqual({ ok: true });
    expect(gateway.calls.map((call) => call.method)).toEqual(["exec.approval.list", "exec.approval.resolve", "exec.approval.resolve"]);
    expect(gateway.calls.at(-2)?.params).toEqual({ id: "approval-1", decision: "allow-once" });
    expect(gateway.calls.at(-1)?.params).toEqual({ id: "approval-2", decision: "deny" });
    await app.close();
  });

  test("sanitizes approval variants without relying on request-shaped payloads", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.request = async (method, params) => {
      gateway.calls.push({ method, params });
      if (method === "exec.approval.list") {
        return {
          approvals: [
            {},
            { id: "approval-empty" },
            {
              id: "approval-plain",
              title: "Run review",
              command: "git diff",
              requestedAt: "2026-05-02T13:12:00.000Z",
              sessionKey: "agent:munin:main"
            }
          ]
        };
      }
      return { ok: true };
    };
    const app = createApiApp({ repo, gateway });

    const approvals = await app.inject({ method: "GET", url: "/api/approvals" });

    expect(approvals.json()).toEqual({
      approvals: [
        { id: "approval-empty", title: "Approval requested", command: "", status: "pending" },
        {
          id: "approval-plain",
          title: "Run review",
          command: "git diff",
          status: "pending",
          requestedAt: "2026-05-02T13:12:00.000Z",
          sessionKey: "agent:munin:main"
        }
      ]
    });
    await app.close();
  });

  test("treats malformed approval list responses as empty public data", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.request = async (method, params) => {
      gateway.calls.push({ method, params });
      if (method === "exec.approval.list") return [];
      return { ok: true };
    };
    const app = createApiApp({ repo, gateway });

    const approvals = await app.inject({ method: "GET", url: "/api/approvals" });

    expect(approvals.json()).toEqual({ approvals: [] });
    await app.close();
  });

  test("keeps stream clients open until the browser disconnects", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    const app = createApiApp({ repo, gateway });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();
    if (address === null || typeof address === "string") throw new Error("Expected TCP server address");
    const controller = new AbortController();

    const response = await fetch(`http://127.0.0.1:${address.port}/api/stream`, { signal: controller.signal });
    const reader = response.body?.getReader();
    const heartbeat = await reader?.read();
    gateway.emit({
      event: "session.message",
      payload: {
        sessionKey: "agent:hugin:dashboard:stream",
        message: { role: "assistant", content: "stream pong", timestamp: "2026-05-02T13:05:00.000Z" }
      }
    });
    const journal = await reader?.read();
    controller.abort();

    expect(response.status).toBe(200);
    expect(new TextDecoder().decode(heartbeat?.value)).toContain("event: heartbeat");
    expect(new TextDecoder().decode(journal?.value)).toContain("event: journal");
    await app.close();
  });

  test("uses dotted Gateway methods for ask, abort, and approval resolution", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    const app = createApiApp({ repo, gateway });

    await app.inject({ method: "POST", url: "/api/composer", payload: { text: "/ask summarize today" } });
    await app.inject({ method: "POST", url: "/api/sessions/agent%3Ahugin%3Amain/abort" });
    await app.inject({ method: "POST", url: "/api/approvals/approval-1/resolve", payload: { decision: "allow-once" } });

    expect(gateway.calls.map((call) => call.method)).toEqual([
      "sessions.create",
      "sessions.messages.subscribe",
      "sessions.send",
      "sessions.abort",
      "exec.approval.resolve"
    ]);
    await app.close();
  });

  test("uses main session fallback and deny approval default", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    gateway.request = async (method, params) => {
      gateway.calls.push({ method, params });
      if (method === "sessions.create") return {};
      return { ok: true };
    };
    const app = createApiApp({ repo, gateway });

    await app.inject({ method: "POST", url: "/api/composer", payload: { text: "Summarize today" } });
    await app.inject({ method: "POST", url: "/api/approvals/approval-2/resolve", payload: {} });

    expect(gateway.calls).toEqual([
      { method: "sessions.create", params: {} },
      { method: "sessions.messages.subscribe", params: { key: "main" } },
      { method: "sessions.send", params: { key: "main", message: "Summarize today" } },
      { method: "exec.approval.resolve", params: { id: "approval-2", decision: "deny" } }
    ]);
    await app.close();
  });

  test("handles empty composer payload as an empty ask without crashing", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    const app = createApiApp({ repo, gateway });

    const response = await app.inject({ method: "POST", url: "/api/composer" });

    expect(response.statusCode).toBe(200);
    expect(gateway.calls).toEqual([
      { method: "sessions.create", params: {} },
      { method: "sessions.messages.subscribe", params: { key: "agent:hugin:main" } },
      { method: "sessions.send", params: { key: "agent:hugin:main", message: "" } }
    ]);
    await app.close();
  });

  test("journals live Gateway session message events without leaking raw frames", async () => {
    const repo = createSqliteRepository(":memory:");
    cleanup.push(() => repo.close());
    const gateway = createMemoryGateway({ ready: true });
    const app = createApiApp({ repo, gateway });

    gateway.emit({ event: "health", payload: { ok: true } });
    gateway.emit({
      event: "session.message",
      payload: {
        sessionKey: "agent:hugin:dashboard:1",
        message: {
          role: "assistant",
          content: "pong with token=[REDACTED_SECRET]",
          timestamp: "2026-05-02T13:00:00.000Z"
        },
        messageSeq: 2
      }
    });
    const day = await app.inject({ method: "GET", url: "/api/days/2026-05-02" });

    expect(day.json().day.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "assistant_message",
          source: "openclaw",
          body: "pong with token=[REDACTED_SECRET]",
          sessionId: "agent:hugin:dashboard:1",
          rawEventHash: expect.stringMatching(/^fnv1a-/),
          redacted: true
        })
      ])
    );
    expect(repo.countRedactedEvents()).toBeGreaterThan(0);
    expect(JSON.stringify(day.json())).not.toContain("raw_event_redacted_json");
    await app.close();
  });
});
