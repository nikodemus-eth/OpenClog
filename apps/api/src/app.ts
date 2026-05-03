import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import {
  classifyComposerInput,
  exportDayAsHtml,
  exportDayAsMarkdown,
  getThemes,
  sampleJournalDay
} from "@openclog/core";
import type { GatewayPort } from "./gateway.js";
import type { OpenClogRepository } from "./repository.js";

export interface ApiServices {
  repo: OpenClogRepository;
  gateway: GatewayPort;
}

export function createApiApp(services: ApiServices): FastifyInstance {
  const app = Fastify({ logger: false });
  void app.register(cors, { origin: true });

  app.get("/api/health", async () => ({
    ok: true,
    gateway: publicGatewayState(services.gateway.getState())
  }));

  app.get("/api/days", async () => ({
    days: services.repo.listDays()
  }));

  app.get<{ Params: { dayKey: string } }>("/api/days/:dayKey", async (request, reply) => {
    const day = services.repo.getDay(request.params.dayKey);
    if (!day) return reply.code(404).send({ error: "day_not_found" });
    return { day };
  });

  app.get("/api/themes", async () => ({ themes: getThemes() }));

  app.get("/api/settings", async () => ({ settings: { theme: "default", gateway: publicGatewayState(services.gateway.getState()) } }));
  app.put("/api/settings", async () => ({ ok: true }));

  app.get("/api/approvals", async () => {
    const result = await services.gateway.request("exec.approval.list", {});
    return result;
  });

  app.post<{ Body: { text: string } }>("/api/composer", async (request, reply) => {
    const text = request.body?.text ?? "";
    const classified = classifyComposerInput(text);
    if (classified.blocked) {
      services.repo.addAudit("composer.blocked", { target_type: "composer", reason: classified.reason });
      return reply.code(403).send({ error: "composer_command_blocked", message: "Command blocked", reason: classified.reason });
    }
    if (classified.mode === "note") {
      const entry = services.repo.addNote(classified.body);
      return { ...classified, entry };
    }
    const created = (await services.gateway.request("sessions.create", { label: "OpenClog", message: classified.body })) as { key?: string };
    await services.gateway.request("sessions.send", { key: created.key ?? "main", message: classified.body });
    services.repo.addAudit("composer.gateway_send", { target_type: "gateway", method: "sessions.send" });
    return classified;
  });

  app.post<{ Params: { key: string } }>("/api/sessions/:key/abort", async (request) => {
    const key = decodeURIComponent(request.params.key);
    await services.gateway.request("sessions.abort", { key });
    services.repo.addAudit("session.abort", { target_type: "session", target_id: key });
    return { ok: true };
  });

  app.post<{ Params: { id: string }; Body: { decision: string } }>("/api/approvals/:id/resolve", async (request) => {
    const decision = request.body?.decision ?? "deny";
    await services.gateway.request("exec.approval.resolve", { id: request.params.id, decision });
    services.repo.addAudit("approval.resolve", { target_type: "approval", target_id: request.params.id, decision });
    return { ok: true };
  });

  app.get<{ Params: { dayKey: string }; Querystring: { format?: string } }>("/api/days/:dayKey/export", async (request, reply) => {
    const day = services.repo.getDay(request.params.dayKey) ?? sampleJournalDay;
    const format = request.query.format === "html" ? "html" : "markdown";
    const body = format === "html" ? exportDayAsHtml(day) : exportDayAsMarkdown(day);
    const extension = format === "html" ? "html" : "md";
    return reply
      .header("content-disposition", `attachment; filename=openclog-${day.dayKey}.${extension}`)
      .type(format === "html" ? "text/html" : "text/markdown")
      .send(body);
  });

  app.get("/api/stream", async (_request, reply) => {
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });
    reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    reply.raw.end();
  });

  return app;
}

function publicGatewayState(state: ReturnType<GatewayPort["getState"]>): Record<string, unknown> {
  return {
    status: state.status,
    role: state.role,
    scopes: state.scopes,
    missingScopes: state.missingScopes,
    stale: state.stale === true,
    canIssueControlActions: state.canIssueControlActions
  };
}

