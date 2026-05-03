import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import {
  classifyComposerInput,
  exportDayAsHtml,
  exportDayAsMarkdown,
  getThemes,
  normalizeGatewayEvent,
  redactGatewayPayload,
  sampleJournalDay
} from "@openclog/core";
import type { AgentActivity, ApprovalView, GatewayEventLike, JournalDay, JournalEntry } from "@openclog/core";
import type { ServerResponse } from "node:http";
import type { GatewayPort } from "./gateway.js";
import type { OpenClogRepository } from "./repository.js";

export interface ApiServices {
  repo: OpenClogRepository;
  gateway: GatewayPort;
}

export function createApiApp(services: ApiServices): FastifyInstance {
  const app = Fastify({ logger: false });
  const streamClients = new Set<ServerResponse>();
  void app.register(cors, { origin: true });
  const removeGatewayListener = services.gateway.onEvent((event) => {
    if (!shouldJournalGatewayEvent(event)) return;
    const entry = services.repo.addEntry(normalizeGatewayEvent(event), event);
    publishJournalEvent(streamClients, entry, services.repo.getDay(entry.dayKey));
  });
  app.addHook("onClose", (_instance, done) => {
    removeGatewayListener();
    services.gateway.close?.();
    for (const client of streamClients) client.end();
    streamClients.clear();
    done();
  });

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

  app.get("/api/settings", async () => ({ settings: publicSettings(services) }));
  app.put<{ Body: { showToolCalls?: boolean; theme?: string } }>("/api/settings", async (request) => {
    if (typeof request.body?.theme === "string") services.repo.setSetting("theme", request.body.theme);
    if (typeof request.body?.showToolCalls === "boolean") services.repo.setSetting("showToolCalls", request.body.showToolCalls);
    return { ok: true, settings: publicSettings(services) };
  });

  app.get("/api/approvals", async () => {
    const result = await services.gateway.request("exec.approval.list", {});
    return { approvals: sanitizeApprovals(result) };
  });

  app.get<{ Querystring: { dayKey?: string } }>("/api/sessions", async (request) => ({
    agents: await listAgentActivity(services, request.query.dayKey ?? todayKey())
  }));

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
    const created = (await services.gateway.request("sessions.create", {})) as { key?: string };
    const sessionKey = created.key ?? "main";
    await services.gateway.request("sessions.messages.subscribe", { key: sessionKey });
    await services.gateway.request("sessions.send", { key: sessionKey, message: classified.body });
    services.repo.addAudit("composer.gateway_send", { target_type: "gateway", method: "sessions.send" });
    return {
      ...classified,
      sessionKey,
      day: services.repo.getDay(todayKey()) ?? services.repo.getDay(sampleJournalDay.dayKey),
      message: "Sent to OpenClaw. Waiting for live response."
    };
  });

  app.post<{ Params: { key: string } }>("/api/sessions/:key/abort", async (request) => {
    const key = decodeURIComponent(request.params.key);
    await services.gateway.request("sessions.abort", { key });
    services.repo.addAudit("session.abort", { target_type: "session", target_id: key });
    return { ok: true };
  });

  app.post<{ Params: { id: string }; Body: { decision: string } }>("/api/approvals/:id/resolve", async (request) => {
    const decision = request.body?.decision === "allow-once" ? "allow-once" : "deny";
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

  app.get<{ Querystring: { once?: string } }>("/api/stream", (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });
    reply.raw.write(`event: heartbeat\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    if (request.query.once === "1") {
      reply.raw.end();
      return;
    }
    streamClients.add(reply.raw);
    request.raw.on("close", () => {
      streamClients.delete(reply.raw);
    });
  });

  return app;
}

function shouldJournalGatewayEvent(event: GatewayEventLike): boolean {
  return [
    "session.message",
    "session.tool",
    "exec.approval.requested",
    "exec.approval.resolved",
    "gateway.reconnected",
    "sequence.gap"
  ].includes(event.event);
}

function publishJournalEvent(clients: Set<ServerResponse>, entry: JournalEntry, day: unknown): void {
  const body = JSON.stringify({ entry, day });
  for (const client of clients) client.write(`event: journal\ndata: ${body}\n\n`);
}

function publicSettings(services: ApiServices): Record<string, unknown> {
  return {
    theme: services.repo.getSetting("theme", "default"),
    showToolCalls: services.repo.getSetting("showToolCalls", true),
    gateway: publicGatewayState(services.gateway.getState())
  };
}

async function listAgentActivity(services: ApiServices, dayKey: string): Promise<AgentActivity[]> {
  const state = services.gateway.getState();
  if (state.canIssueControlActions) {
    try {
      const result = await services.gateway.request("sessions.list", { includeDerivedTitles: true, includeLastMessage: true, limit: 50 });
      const agents = sanitizeLiveSessions(result);
      if (agents.length > 0) return sortAgentActivity(latestAgentsByDisplayName(agents));
    } catch {
      // Fall back to the local journal when live session listing is unavailable.
    }
  }
  return sortAgentActivity(latestAgentsByDisplayName(deriveAgentsFromDay(services.repo.getDay(dayKey))));
}

function sanitizeLiveSessions(result: unknown): AgentActivity[] {
  const record = asRecord(result);
  const sessions = Array.isArray(result) ? result : Array.isArray(record.sessions) ? record.sessions : [];
  return sessions.map((session) => sanitizeSession(asRecord(session))).filter((agent): agent is AgentActivity => agent !== null);
}

function sanitizeSession(session: Record<string, unknown>): AgentActivity | null {
  const sessionKey = stringValue(session.key) || stringValue(session.sessionKey) || stringValue(session.id);
  if (!sessionKey) return null;
  const rawStatus = stringValue(session.status) || stringValue(session.phase);
  const label = cleanPublicText(stringValue(session.title) || stringValue(session.label) || labelFromSessionKey(sessionKey));
  const status = workingStatuses.has(rawStatus.toLowerCase()) ? "working" : "idle";
  const statusSummary = cleanPublicText(stringValue(session.summary)) || titleCase(rawStatus) || "Idle";
  return {
    id: sessionKey,
    label,
    status,
    summary: statusSummary,
    sessionKey,
    ...(stringValue(session.lastSeenAt) ? { lastSeenAt: stringValue(session.lastSeenAt) } : {})
  };
}

function deriveAgentsFromDay(day: JournalDay | null): AgentActivity[] {
  if (!day) return [];
  const latestBySession = new Map<string, JournalEntry>();
  for (const entry of day.entries) {
    if (!entry.sessionId) continue;
    const previous = latestBySession.get(entry.sessionId);
    if (!previous || previous.timestamp.localeCompare(entry.timestamp) < 0) latestBySession.set(entry.sessionId, entry);
  }
  return [...latestBySession.entries()].map(([sessionKey, entry]) => ({
    id: sessionKey,
    label: labelFromSessionKey(sessionKey),
    status: entry.status === "pending" || entry.status === "running" ? "working" : "idle",
    summary: entry.title,
    sessionKey,
    lastSeenAt: entry.timestamp
  }));
}

function latestAgentsByDisplayName(agents: AgentActivity[]): AgentActivity[] {
  const latest = new Map<string, { agent: AgentActivity; index: number }>();
  agents.forEach((agent, index) => {
    const nameKey = agent.label.trim().toLocaleLowerCase();
    const current = latest.get(nameKey);
    if (!current || isNewerAgent(agent, index, current.agent, current.index)) latest.set(nameKey, { agent, index: current?.index ?? index });
  });
  return [...latest.values()].map(({ agent }) => agent);
}

function sortAgentActivity(agents: AgentActivity[]): AgentActivity[] {
  return agents
    .map((agent, index) => ({ agent, index }))
    .sort((left, right) => {
      const statusOrder = agentStatusRank(left.agent) - agentStatusRank(right.agent);
      if (statusOrder !== 0) return statusOrder;
      const leftLastSeen = agentLastSeenTime(left.agent);
      const rightLastSeen = agentLastSeenTime(right.agent);
      return leftLastSeen === rightLastSeen ? left.index - right.index : rightLastSeen - leftLastSeen;
    })
    .map(({ agent }) => agent);
}

function agentStatusRank(agent: AgentActivity): number {
  return agent.status === "working" ? 0 : 1;
}

function isNewerAgent(candidate: AgentActivity, candidateIndex: number, current: AgentActivity, currentIndex: number): boolean {
  const candidateTime = agentLastSeenTime(candidate);
  const currentTime = agentLastSeenTime(current);
  if (candidateTime !== currentTime) return candidateTime > currentTime;
  return candidateIndex > currentIndex;
}

function agentLastSeenTime(agent: AgentActivity): number {
  const parsed = Date.parse(agent.lastSeenAt ?? "");
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function sanitizeApprovals(result: unknown): ApprovalView[] {
  const record = asRecord(result);
  const approvals = Array.isArray(record.approvals) ? record.approvals : [];
  return approvals.map((approval) => sanitizeApproval(asRecord(approval))).filter((approval): approval is ApprovalView => approval !== null);
}

function sanitizeApproval(approval: Record<string, unknown>): ApprovalView | null {
  const id = stringValue(approval.id);
  if (!id) return null;
  const request = asRecord(approval.request);
  return {
    id,
    title: cleanPublicText(stringValue(approval.title)) || "Approval requested",
    command: cleanPublicText(stringValue(request.command) || stringValue(approval.command)),
    status: cleanPublicText(stringValue(approval.status)) || "pending",
    ...(stringValue(approval.createdAt) || stringValue(approval.requestedAt) ? { requestedAt: stringValue(approval.createdAt) || stringValue(approval.requestedAt) } : {}),
    ...(stringValue(request.sessionKey) || stringValue(approval.sessionKey) ? { sessionKey: stringValue(request.sessionKey) || stringValue(approval.sessionKey) } : {})
  };
}

const workingStatuses = new Set(["active", "busy", "running", "working"]);

function labelFromSessionKey(sessionKey: string): string {
  const parts = sessionKey.split(":");
  const label = parts[0] === "agent" && parts[1] ? parts[1] : sessionKey;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function titleCase(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function cleanPublicText(value: string): string {
  return String(redactGatewayPayload(value).redacted).replace(/\b[A-Z0-9_]*(?:API_)?(?:KEY|TOKEN|SECRET|PASSWORD)=\[REDACTED_SECRET\]/gi, "[REDACTED_SECRET]");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function publicGatewayState(state: ReturnType<GatewayPort["getState"]>): Record<string, unknown> {
  return {
    status: state.status,
    role: state.role,
    scopes: state.scopes,
    missingScopes: state.missingScopes,
    stale: state.stale === true,
    canIssueControlActions: state.canIssueControlActions,
    ...(state.connectionStatus ? { connectionStatus: state.connectionStatus } : {}),
    ...(state.lastConnectedAt ? { lastConnectedAt: state.lastConnectedAt } : {}),
    ...(state.lastDisconnectedAt ? { lastDisconnectedAt: state.lastDisconnectedAt } : {}),
    ...(state.lastErrorReason ? { lastErrorReason: state.lastErrorReason } : {}),
    ...(state.nextReconnectAt ? { nextReconnectAt: state.nextReconnectAt } : {}),
    ...(typeof state.reconnectAttempt === "number" ? { reconnectAttempt: state.reconnectAttempt } : {}),
    ...(state.serviceRecovery
      ? {
          serviceRecovery: {
            enabled: state.serviceRecovery.enabled,
            ...(state.serviceRecovery.lastAttemptAt ? { lastAttemptAt: state.serviceRecovery.lastAttemptAt } : {}),
            ...(state.serviceRecovery.lastReason ? { lastReason: state.serviceRecovery.lastReason } : {}),
            ...(state.serviceRecovery.lastResult ? { lastResult: state.serviceRecovery.lastResult } : {}),
            ...(state.serviceRecovery.nextAllowedAt ? { nextAllowedAt: state.serviceRecovery.nextAllowedAt } : {}),
            restartCount: state.serviceRecovery.restartCount
          }
        }
      : {})
  };
}
