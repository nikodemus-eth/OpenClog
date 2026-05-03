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
    const stream = await app.inject({ method: "GET", url: "/api/stream" });

    expect(days.json().days).toHaveLength(1);
    expect(day.json().day).toMatchObject({ dayKey: "2026-05-02" });
    expect(missing.statusCode).toBe(404);
    expect(themes.json().themes).toHaveLength(4);
    expect(settings.json()).toMatchObject({ settings: { theme: "default", gateway: { status: "ready" } } });
    expect(updateSettings.json()).toEqual({ ok: true });
    expect(approvals.json()).toEqual({ approvals: [] });
    expect(markdown.headers["content-disposition"]).toContain("openclog-2026-05-02.md");
    expect(markdown.body).toContain("# OpenClaw Journal");
    expect(html.headers["content-type"]).toContain("text/html");
    expect(html.body).toContain("<!doctype html>");
    expect(stream.body).toContain("event: heartbeat");
    expect(gateway.calls.map((call) => call.method)).toEqual(["exec.approval.list"]);
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
      { method: "sessions.create", params: { label: "OpenClog", message: "Summarize today" } },
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
      { method: "sessions.create", params: { label: "OpenClog", message: "" } },
      { method: "sessions.send", params: { key: "agent:hugin:main", message: "" } }
    ]);
    await app.close();
  });
});
