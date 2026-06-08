import { execSync } from "node:child_process";
import type { ServerResponse } from "node:http";
import cors from "@fastify/cors";
import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import { createOpenClogApplication } from "@openclog/app";
import {
  classifyComposerInput,
  exportDayAsHtml,
  exportDayAsMarkdown,
  getThemes,
  normalizeGatewayEvent,
  operatorDayKeyFromTimestamp,
  redactGatewayPayload,
  sampleJournalDay,
  type AgentActivity,
  type AlertRule,
  type ApprovalView,
  type BackendFingerprint,
  type DeliveryAdapterTarget,
  type GatewayEventLike,
  type IncidentActionKind,
  type IncidentSummary,
  type MonitoringImportInput,
  type MonitoringSourceKind,
  type JournalDay,
  type JournalEntry,
  type PluginManifest,
  type ProfileConfig,
  type ReportAssemblyTiming,
  type ReportAssemblyTimingSection,
  type RetentionPolicy
} from "@openclog/core";
import type { GatewayPort } from "./gateway.js";
import type { OpenClogRepository } from "./repository.js";

export interface ApiServices {
  repo: OpenClogRepository;
  gateway: GatewayPort;
}

export function createApiApp(services: ApiServices): FastifyInstance {
  const app = Fastify({ logger: false });
  const streamClients = new Set<ServerResponse>();
  const openclog = createOpenClogApplication({ repo: services.repo });
  const backendFingerprint = openclog.getBackendFingerprint();
  const budgetState = new Map<string, { count: number; windowStartedAt: number }>();

  void app.register(cors, { origin: true });

  app.addHook("onRequest", async (request, reply) => {
    const throttled = checkEndpointBudget(budgetState, request.url);
    if (!throttled) return;
    services.repo.addAudit("endpoint_budget.exceeded", {
      target_type: "http_route",
      route: request.url,
      method: request.method
    });
    reply.header("x-openclog-degraded", "endpoint_budget");
    return reply.code(429).send({ error: "endpoint_budget_exceeded", message: "Expensive endpoint temporarily budgeted. Retry shortly." });
  });

  const removeGatewayListener = services.gateway.onEvent((event) => {
    if (!shouldJournalGatewayEvent(event)) return;
    const entry = services.repo.addEntry(normalizeGatewayEvent(event, { timeZone: process.env.OPENCLOG_OPERATOR_TIME_ZONE }), event);
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
    backend: backendFingerprint,
    gateway: publicGatewayState(services.gateway.getState())
  }));

  app.get("/api/healthz", async () => {
    const report = openclog.getOperationsBacklog({ dayKey: todayKey() });
    const smokeReceipt = report.verificationCenter.receipts.find((receipt) => receipt.command === "test:smoke" || receipt.command === "npm run test:smoke");
    return {
      ok: true,
      service: "openclog-api",
      backend: buildVersionInfo(backendFingerprint),
      gateway: publicGatewayState(services.gateway.getState()),
      operations: {
        reportFreshness: report.reportFreshness.status,
        latestVerificationReceiptCommand: report.reportFreshness.latestVerificationReceiptCommand,
        freshnessThresholdMs: report.reportFreshness.freshnessThresholdMs,
        reportFreshnessThresholdBreached: report.reportFreshness.thresholdBreached === true,
        latestSmokeCompletedAt: smokeReceipt?.completedAt ?? smokeReceipt?.startedAt,
        queueDepth: report.summaryJobHistory.queueDepth,
        oldestWaitingAgeLabel: report.summaryJobHistory.oldestWaitingAgeLabel ?? "none",
        recoveredEvidenceProvisional: report.recoveredEvidenceSummary?.provisionalMetrics === true,
        routeBudgetRegressionCount: report.routeBudgetRegressions.length,
        closeoutBlockerCount: report.closeoutReadiness.blockers.length,
        blockedGateIds: report.verificationCenter.gates.filter((gate) => gate.status === "blocked").map((gate) => gate.id),
        currentSnapshotId: report.reportProvenance.currentSnapshotId,
        previousSnapshotId: report.reportProvenance.previousSnapshotId
      }
    };
  });

  app.get("/api/healthz/details", async () => {
    const report = openclog.getOperationsBacklog({ dayKey: todayKey() });
    return {
      ok: true,
      details: {
        generatedAt: report.generatedAt,
        currentSnapshotId: report.reportProvenance.currentSnapshotId,
        previousSnapshotId: report.reportProvenance.previousSnapshotId,
        closeoutBlockerCount: report.closeoutReadiness.blockers.length,
        failingGates: report.verificationCenter.gates
          .filter((gate) => gate.status === "blocked")
          .map((gate) => ({
            id: gate.id,
            label: gate.label,
            detail: gate.detail,
            nextSafeActions: gate.nextSafeActions,
            blockerSource: gate.blockerSource,
            lastVerifiedAt: gate.lastVerifiedAt
          })),
        deliveryTargets: report.deliveryTargetHealth.map((target) => ({
          target: target.target,
          latestDryRunReceiptId: target.latestDryRunReceiptId,
          lastDryRunVerifiedAt: target.lastDryRunVerifiedAt,
          parityDriftState: target.parityDriftState
        }))
      }
    };
  });

  app.get("/api/version", async () => buildVersionInfo(backendFingerprint));

  app.get("/api/backend/fingerprint", async () => ({ ok: true, backend: backendFingerprint, fingerprint: backendFingerprint }));

  app.get("/api/days", async () => ({
    days: services.repo.listDays().map((day) => ({
      ...day,
      routeBudgetRegressions: openclog.getOperationsBacklog({ dayKey: day.dayKey }).routeBudgetRegressions
    }))
  }));

  app.get<{ Params: { dayKey: string } }>("/api/days/:dayKey", async (request, reply) => {
    const day = services.repo.getDay(request.params.dayKey);
    if (!day) return reply.code(404).send({ error: "day_not_found" });
    return { day };
  });

  app.get<{ Params: { dayKey: string } }>("/api/days/:dayKey/context", async (request, reply) => {
    const day = services.repo.getDay(request.params.dayKey);
    if (!day) return reply.code(404).send({ error: "day_not_found" });
    return { ok: true, context: services.repo.getPinnedDayContext(request.params.dayKey) ?? null };
  });

  app.put<{ Params: { dayKey: string }; Body: { note?: string; summary?: string } }>("/api/days/:dayKey/context", async (request) => ({
    ok: true,
    context: services.repo.setPinnedDayContext(request.params.dayKey, {
      note: request.body?.note,
      summary: request.body?.summary
    })
  }));

  app.post<{ Params: { dayKey: string } }>("/api/days/:dayKey/generate-summary", async (request) => ({
    ok: true,
    generatedSummary: services.repo.generateSummary(request.params.dayKey)
  }));

  app.post<{ Params: { dayKey: string } }>("/api/days/:dayKey/summary-jobs", async (request) => ({
    ok: true,
    job: openclog.createSummaryJob(request.params.dayKey)
  }));

  app.get<{ Params: { id: string } }>("/api/summary-jobs/:id", async (request, reply) => {
    const job = openclog.getSummaryJob(request.params.id);
    if (!job) return reply.code(404).send({ error: "summary_job_not_found" });
    return { ok: true, job };
  });

  app.get("/api/themes", async () => ({ themes: getThemes() }));

  app.get<{ Querystring: { limit?: string } }>("/api/health/history", async (request) => ({
    history: services.repo.listHealthHistory(parsePositiveInt(request.query.limit, 5))
  }));

  app.get<{ Querystring: { limit?: string } }>("/api/health/aggregate", async (request) => ({
    aggregate: openclog.getHealthAggregate(parsePositiveInt(request.query.limit, 20))
  }));

  app.get<{ Querystring: { limit?: string; cursor?: string } }>("/api/health/timeline", async (request) => {
    const page = openclog.listHealthTimeline({ limit: parsePositiveInt(request.query.limit, 10), cursor: request.query.cursor });
    return { timeline: page.items, nextCursor: page.nextCursor };
  });

  app.get<{ Querystring: { q?: string; cursor?: string; limit?: string } }>("/api/search", async (request) => {
    const page = openclog.searchEntries({
      query: request.query.q ?? "",
      cursor: request.query.cursor,
      limit: parsePositiveInt(request.query.limit, 50)
    });
    return {
      query: request.query.q ?? "",
      results: page.items,
      nextCursor: page.nextCursor
    };
  });

  app.get("/api/settings", async () => ({ settings: publicSettings(services) }));
  app.put<{ Body: { showToolCalls?: boolean; theme?: string; searchPresets?: unknown; operatorViews?: unknown } }>("/api/settings", async (request) => ({
    ok: true,
    settings: {
      ...openclog.updateSettings({
        ...(typeof request.body?.theme === "string" ? { theme: request.body.theme } : {}),
        ...(typeof request.body?.showToolCalls === "boolean" ? { showToolCalls: request.body.showToolCalls } : {}),
        ...(Array.isArray(request.body?.searchPresets) ? { searchPresets: request.body.searchPresets as [] } : {}),
        ...(Array.isArray(request.body?.operatorViews) ? { operatorViews: request.body.operatorViews as [] } : {})
      }),
      gateway: publicGatewayState(services.gateway.getState())
    }
  }));

  app.post<{ Params: { id: string }; Body: { label?: string; detail?: string } }>("/api/settings/operator-views/:id/used", async (request, reply) => {
    const viewId = cleanPublicText(request.params.id).trim().slice(0, 120);
    if (!viewId) return reply.code(400).send({ error: "operator_view_id_required" });
    const label = cleanPublicText(request.body?.label ?? viewId).trim().slice(0, 160) || viewId;
    const detail = cleanPublicText(request.body?.detail ?? `Operator view ${label} was loaded from the workbench.`).trim().slice(0, 240);
    const createdAt = new Date().toISOString();
    const event = services.repo.saveSavedViewAuditEvent({
      id: `saved-view-used-${viewId}-${createdAt}`,
      viewId,
      label,
      action: "used",
      createdAt,
      detail
    });
    return { ok: true, event };
  });

  app.post<{ Body: { shortcut?: string; action?: string; context?: string } }>("/api/operator/shortcuts/audit", async (request, reply) => {
    const shortcut = cleanPublicText(request.body?.shortcut ?? "").trim().slice(0, 32);
    const action = cleanPublicText(request.body?.action ?? "").trim().slice(0, 80);
    const context = cleanPublicText(request.body?.context ?? "keyboard").trim().slice(0, 80) || "keyboard";
    if (!shortcut || !action) return reply.code(400).send({ error: "shortcut_and_action_required" });
    const event = { shortcut, action, context, createdAt: new Date().toISOString() };
    services.repo.addAudit("operator.shortcut.used", {
      target_type: "operator_shortcut",
      shortcut,
      action,
      context
    });
    return { ok: true, event };
  });

  app.get("/api/approvals", async () => {
    const result = await services.gateway.request("exec.approval.list", {});
    return { approvals: sanitizeApprovals(result) };
  });

  app.get<{ Querystring: { dayKey?: string } }>("/api/sessions", async (request) => ({
    agents: await listAgentActivity(services, request.query.dayKey ?? todayKey())
  }));

  app.get<{ Params: { key: string }; Querystring: { cursor?: string; limit?: string } }>("/api/sessions/:key", async (request, reply) => {
    if (isStaleRuntimeFingerprint(request.headers["x-openclog-runtime-fingerprint"], backendFingerprint)) {
      return reply.code(409).send({
        error: "stale_backend_fingerprint",
        message: "Live session request was rejected because the browser is bound to an old backend runtime."
      });
    }
    return openclog.getSessionDrilldown({
      sessionKey: decodeURIComponent(request.params.key),
      cursor: request.query.cursor,
      limit: parsePositiveInt(request.query.limit, 100)
    });
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

  app.get<{ Params: { dayKey: string } }>("/api/days/:dayKey/export/bundle", async (request) => {
    const day = services.repo.getDay(request.params.dayKey) ?? sampleJournalDay;
    const signature = services.repo.verifyReplayBundle({ day }).digest;
    return {
      manifest: {
        dayKey: day.dayKey,
        exportedAt: new Date().toISOString(),
        version: buildVersionInfo().version,
        signature: {
          algorithm: "sha256",
          digest: signature
        }
      },
      day,
      markdown: exportDayAsMarkdown(day)
    };
  });

  app.post("/api/integrity-check", async () => ({
    ok: true,
    report: services.repo.getIntegrityReport()
  }));

  app.post<{ Body: Partial<RetentionPolicy> }>("/api/retention/preview", async (request) => ({
    ok: true,
    preview: services.repo.previewRetention({
      keepDays: request.body?.keepDays ?? 7,
      includeAudit: request.body?.includeAudit === true,
      includeRedactedEvents: request.body?.includeRedactedEvents === true,
      includeSummaries: request.body?.includeSummaries === true
    })
  }));

  app.post<{ Body: Partial<RetentionPolicy> }>("/api/retention/apply", async (request) => ({
    ok: true,
    snapshot: openclog.applyRetention({
      keepDays: request.body?.keepDays ?? 7,
      includeAudit: request.body?.includeAudit === true,
      includeRedactedEvents: request.body?.includeRedactedEvents === true,
      includeSummaries: request.body?.includeSummaries === true
    })
  }));

  app.post<{ Params: { id: string } }>("/api/retention/rollback/:id", async (request) => ({
    ok: true,
    ...openclog.rollbackRetention(request.params.id)
  }));

  app.get("/api/retention/classes", async () => ({
    classes: openclog.listRetentionClasses()
  }));

  app.put<{ Params: { id: string }; Body: { includeRollback?: boolean; keepDays?: number } }>("/api/retention/classes/:id", async (request, reply) => {
    if (!isRetentionClassId(request.params.id)) return reply.code(404).send({ error: "retention_class_not_found" });
    return {
      ok: true,
      retentionClass: openclog.saveRetentionClass({
        id: request.params.id,
        keepDays: typeof request.body?.keepDays === "number" ? request.body.keepDays : 30,
        includeRollback: request.body?.includeRollback !== false
      })
    };
  });

  app.post("/api/retention/preview-by-class", async () => ({
    ok: true,
    previews: openclog.previewRetentionByClass()
  }));

  app.get("/api/incidents", async () => ({
    incidents: services.repo.listIncidents().map((incident) => ({
      ...incident,
      investigationNoteCount: services.repo.listInvestigationNotes({ incidentId: incident.id }).length
    }))
  }));

  app.get<{ Params: { id: string } }>("/api/incidents/:id/workspace", async (request, reply) => {
    try {
      return { ok: true, workspace: openclog.getIncidentWorkspace({ incidentId: request.params.id }) };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("incident_not_found:")) return reply.code(404).send({ error: "incident_not_found" });
      throw error;
    }
  });

  app.post<{ Params: { id: string; actionId: IncidentActionKind }; Body: { body?: string; pluginId?: string } }>(
    "/api/incidents/:id/actions/:actionId",
    async (request, reply) => {
      try {
        return {
          ok: true,
          ...openclog.executeIncidentAction({
            incidentId: request.params.id,
            actionId: request.params.actionId,
            body: request.body?.body,
            pluginId: request.body?.pluginId
          })
        };
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("incident_not_found:")) return reply.code(404).send({ error: "incident_not_found" });
        if (error instanceof Error && error.message === "incident_action_body_required") return reply.code(400).send({ error: "incident_action_body_required" });
        if (error instanceof Error && error.message === "plugin_not_found") return reply.code(404).send({ error: "plugin_not_found" });
        const capabilityError = sendCapabilityError(reply, error);
        if (capabilityError) return capabilityError;
        throw error;
      }
    }
  );

  app.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string; sort?: string } }>("/api/incidents/:id/actions", async (request) => {
    const page = openclog.listIncidentActionRecords({
      incidentId: request.params.id,
      cursor: request.query.cursor,
      limit: parsePositiveInt(request.query.limit, 20),
      sort:
        request.query.sort === "createdAt:asc" ||
        request.query.sort === "status:asc" ||
        request.query.sort === "status:desc"
          ? request.query.sort
          : "createdAt:desc"
    });
    return { records: page.items, nextCursor: page.nextCursor };
  });

  app.get("/api/incident-rule-packs", async () => ({
    rulePacks: openclog.listIncidentRulePacks()
  }));

  app.get<{ Querystring: { dayKey?: string; incidentId?: string; cursor?: string; limit?: string } }>("/api/investigation-notes", async (request) => {
    const page = openclog.listInvestigationNotes({
      dayKey: request.query.dayKey,
      incidentId: request.query.incidentId,
      cursor: request.query.cursor,
      limit: parsePositiveInt(request.query.limit, 20)
    });
    return { notes: page.items, nextCursor: page.nextCursor };
  });

  app.post<{ Body: { dayKey?: string; incidentId?: string; sessionKey?: string; body?: string; linkedEntryIds?: string[]; author?: string } }>(
    "/api/investigation-notes",
    async (request, reply) => {
      if (typeof request.body?.body !== "string" || request.body.body.trim().length === 0) return reply.code(400).send({ error: "note_body_required" });
      return {
        ok: true,
        note: openclog.saveInvestigationNote({
          dayKey: request.body.dayKey ?? todayKey(),
          incidentId: request.body.incidentId,
          sessionKey: request.body.sessionKey,
          body: request.body.body.trim(),
          linkedEntryIds: Array.isArray(request.body.linkedEntryIds) ? request.body.linkedEntryIds : [],
          author: request.body.author
        })
      };
    }
  );

  app.post<{
    Body: MonitoringImportInput & { confirmedLocalImport?: boolean };
  }>("/api/monitoring-imports", async (request, reply) => {
    if (request.body?.confirmedLocalImport !== true) return reply.code(409).send({ error: "monitoring_import_requires_local_confirmation" });
    if (typeof request.body?.markdown !== "string" || request.body.markdown.trim().length === 0) return reply.code(400).send({ error: "monitoring_import_markdown_required" });
    const sourceWorkflow = Array.isArray(request.body.sourceWorkflow)
      ? request.body.sourceWorkflow.filter((item): item is MonitoringSourceKind => item === "gmail" || item === "blogwatcher" || item === "openclaw" || item === "manual")
      : undefined;
    return {
      ok: true,
      import: openclog.importMonitoringDecisions({
        markdown: request.body.markdown,
        dayKey: request.body.dayKey,
        incidentId: request.body.incidentId,
        importedAt: request.body.importedAt,
        sourcePath: request.body.sourcePath,
        sourceWorkflow,
        defaultDisposition: request.body.defaultDisposition,
        updatePinnedContext: request.body.updatePinnedContext
      })
    };
  });

  app.get<{ Querystring: { dayKey?: string; incidentId?: string } }>("/api/monitoring-imports/handoff-packets", async (request) => ({
    packets: openclog.listIncidentHandoffPackets({ dayKey: request.query.dayKey, incidentId: request.query.incidentId })
  }));

  app.post<{ Body: { dayKey?: string; entryIds?: string[]; title?: string } }>("/api/incident-mode", async (request) => {
    const incident = buildIncidentSnapshot(
      services.repo,
      request.body?.dayKey ?? todayKey(),
      request.body?.entryIds ?? [],
      request.body?.title
    );
    return { ok: true, incident: services.repo.saveIncident(incident) };
  });

  app.get<{ Querystring: { dayKey?: string } }>("/api/alerts", async (request) =>
    openclog.listAlerts({ dayKey: request.query.dayKey ?? todayKey() })
  );

  app.put<{ Params: { id: string }; Body: Partial<AlertRule> }>("/api/alerts/rules/:id", async (request) => {
    const rule: AlertRule = {
      id: request.params.id,
      kind:
        request.body?.kind === "approval_backlog" || request.body?.kind === "tool_failure_spike"
          ? request.body.kind
          : "reconnect_storm",
      title: request.body?.title ?? "Alert rule",
      threshold: typeof request.body?.threshold === "number" ? request.body.threshold : 1,
      enabled: request.body?.enabled !== false
    };
    return { ok: true, rule: services.repo.upsertAlertRule(rule) };
  });

  app.post<{ Params: { id: string }; Body: { acknowledgedAt?: string } }>("/api/alerts/:id/ack", async (request) => ({
    ok: true,
    state: openclog.acknowledgeAlert({
      ruleId: request.params.id,
      acknowledgedAt: request.body?.acknowledgedAt ?? new Date().toISOString()
    })
  }));

  app.post<{ Params: { id: string }; Body: { snoozedUntil?: string } }>("/api/alerts/:id/snooze", async (request, reply) => {
    if (!request.body?.snoozedUntil) return reply.code(400).send({ error: "snoozed_until_required" });
    return {
      ok: true,
      state: openclog.snoozeAlert({
        ruleId: request.params.id,
        snoozedUntil: request.body.snoozedUntil
      })
    };
  });

  app.get("/api/adapters/events", async () => ({
    events: services.repo.listAdapterEvents()
  }));

  app.get("/api/profiles", async () => ({
    selectedProfileId: services.repo.getSetting("selectedProfileId", "default"),
    profiles: services.repo.listProfiles()
  }));

  app.post<{ Body: ProfileConfig }>("/api/profiles", async (request) => ({
    ok: true,
    profile: services.repo.upsertProfile({
      id: request.body?.id ?? "default",
      label: request.body?.label ?? "Default",
      gatewayUrl: request.body?.gatewayUrl
    })
  }));

  app.put<{ Params: { id: string } }>("/api/profiles/:id/select", async (request) => {
    services.repo.setSelectedProfile(request.params.id);
    return { ok: true, selectedProfileId: request.params.id };
  });

  app.post<{ Params: { target: string }; Body: { dayKey?: string } }>("/api/integrations/:target/verify", async (request, reply) => {
    if (!isDeliveryTarget(request.params.target)) return reply.code(404).send({ error: "integration_target_not_found" });
    try {
      return {
        ok: true,
        receipt: openclog.verifyIntegrationTarget({
          target: request.params.target,
          dayKey: request.body?.dayKey ?? todayKey()
        })
      };
    } catch (error) {
      const capabilityError = sendCapabilityError(reply, error);
      if (capabilityError) return capabilityError;
      throw error;
    }
  });

  app.post<{ Params: { target: string }; Body: { dayKey?: string } }>("/api/integrations/:target", async (request, reply) => {
    const target = request.params.target;
    if (
      target !== "github-issue" &&
      target !== "markdown-vault" &&
      target !== "incident-doc" &&
      target !== "slack" &&
      target !== "generic-webhook" &&
      target !== "email"
    ) {
      return reply.code(404).send({ error: "integration_target_not_found" });
    }
    return {
      ok: true,
      payload: openclog.buildIntegrationPayload({
        target,
        dayKey: request.body?.dayKey ?? todayKey()
      })
    };
  });

  app.post<{ Params: { target: string }; Body: { dayKey?: string; incidentId?: string } }>("/api/integrations/:target/deliver", async (request, reply) => {
    if (!isDeliveryTarget(request.params.target)) return reply.code(404).send({ error: "integration_target_not_found" });
    try {
      return {
        ok: true,
        receipt: openclog.deliverIntegration({
          target: request.params.target,
          dayKey: request.body?.dayKey ?? todayKey(),
          incidentId: request.body?.incidentId,
          idempotencyKey: typeof request.body?.incidentId === "string" ? `${request.body.incidentId}:${request.params.target}` : undefined,
          dryRun: request.headers["x-openclog-dry-run"] === "1"
        })
      };
    } catch (error) {
      const capabilityError = sendCapabilityError(reply, error);
      if (capabilityError) return capabilityError;
      throw error;
    }
  });

  app.get<{ Querystring: { cursor?: string; limit?: string; sort?: string } }>("/api/integrations/receipts", async (request) => {
    const page = openclog.listDeliveryReceipts({
      cursor: request.query.cursor,
      limit: parsePositiveInt(request.query.limit, 20),
      sort:
        request.query.sort === "requestedAt:asc" ||
        request.query.sort === "status:asc" ||
        request.query.sort === "status:desc"
          ? request.query.sort
          : "requestedAt:desc"
    });
    return { receipts: page.items, nextCursor: page.nextCursor };
  });

  app.get<{ Params: { id: string } }>("/api/integrations/receipts/:id", async (request, reply) => {
    try {
      return { ok: true, receipt: openclog.getDeliveryReceipt({ id: request.params.id }) };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("delivery_receipt_not_found:")) return reply.code(404).send({ error: "delivery_receipt_not_found" });
      throw error;
    }
  });

  app.post<{ Params: { id: string }; Body: { confirmSameIdempotencyKey?: boolean; useNewIdempotencyKey?: boolean } }>("/api/integrations/receipts/:id/retry", async (request, reply) => {
    try {
      const original = openclog.getDeliveryReceipt({ id: request.params.id });
      if (request.body?.useNewIdempotencyKey !== true && original.status === "failed" && original.idempotencyKey && request.body?.confirmSameIdempotencyKey !== true) {
        return reply.code(409).send({
          error: "retry_requires_same_idempotency_confirmation",
          message: "Retrying a failed delivery requires confirmation because OpenClog will reuse the same idempotency key.",
          receipt: original
        });
      }
      return { ok: true, receipt: openclog.retryDeliveryReceipt({ id: request.params.id, useNewIdempotencyKey: request.body?.useNewIdempotencyKey === true }) };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("delivery_receipt_not_found:")) return reply.code(404).send({ error: "delivery_receipt_not_found" });
      throw error;
    }
  });

  app.get<{ Querystring: { dayKey?: string; incidentId?: string } }>("/api/operations/report", async (request) => {
    const routeStartedAt = performance.now();
    const reportBuildStartedAt = performance.now();
    const report = openclog.getOperationsBacklog({
      dayKey: request.query.dayKey ?? todayKey(),
      incidentId: request.query.incidentId
    });
    const reportBuildSection = timingSection("route.report_build", "Route report build", "route_phase", reportBuildStartedAt, 1);
    const auditStartedAt = performance.now();
    if (report.routeBudgetRegressions.length > 0) {
      services.repo.addAudit("route_budget.breach", {
        target_type: "operations_report",
        routeCount: report.routeBudgetRegressions.length,
        routes: report.routeBudgetRegressions.map((regression) => regression.route),
        snapshotId: report.reportProvenance.currentSnapshotId
      });
    }
    const auditSection = timingSection("route.route_budget_audit", "Route-budget audit", "route_phase", auditStartedAt, report.routeBudgetRegressions.length);
    report.reportAssemblyTiming = appendReportAssemblySections(report.reportAssemblyTiming, [reportBuildSection, auditSection], routeStartedAt);
    return { report };
  });

  app.get<{ Querystring: { dayKey?: string; incidentId?: string } }>("/api/operations/center", async (request) => ({
    report: openclog.getOperationsBacklog({
      dayKey: request.query.dayKey ?? todayKey(),
      incidentId: request.query.incidentId
    })
  }));

  app.post<{ Params: { id: string }; Body: { acknowledgedAt?: string; acknowledgedBy?: string } }>("/api/operations/attention/:id/ack", async (request, reply) => {
    if (!isAttentionItemId(request.params.id)) return reply.code(404).send({ error: "attention_item_not_found" });
    return {
      ok: true,
      state: openclog.acknowledgeAttentionItem({
        attentionItemId: request.params.id,
        acknowledgedAt: request.body?.acknowledgedAt ?? new Date().toISOString(),
        acknowledgedBy: request.body?.acknowledgedBy
      })
    };
  });

  app.post<{ Params: { id: string }; Body: { snoozeUntil?: string; acknowledgedBy?: string } }>("/api/operations/attention/:id/snooze", async (request, reply) => {
    if (!isAttentionItemId(request.params.id)) return reply.code(404).send({ error: "attention_item_not_found" });
    if (!request.body?.snoozeUntil) return reply.code(400).send({ error: "snooze_until_required" });
    return {
      ok: true,
      state: openclog.snoozeAttentionItem({
        attentionItemId: request.params.id,
        snoozeUntil: request.body.snoozeUntil,
        acknowledgedBy: request.body?.acknowledgedBy
      })
    };
  });

  app.get<{ Querystring: { route?: string } }>("/api/operations/route-budget-history", async (request) => ({
    history: services.repo.listRouteBudgetObservations?.(
      request.query.route === "/api/summary-jobs" ||
        request.query.route === "/api/incidents" ||
        request.query.route === "/api/health" ||
        request.query.route === "/api/operations/report" ||
        request.query.route === "/api/verification/receipts"
        ? request.query.route
        : undefined
    ) ?? []
  }));

  app.get<{ Querystring: { q?: string; status?: string; target?: string; requestFingerprint?: string } }>("/api/operations/delivery-ledger", async (request) => ({
    ledger: openclog.listDeliveryLedger({
      q: request.query.q,
      status: request.query.status === "failed" || request.query.status === "delivered" ? request.query.status : undefined,
      target: typeof request.query.target === "string" && isDeliveryTarget(request.query.target) ? request.query.target : undefined,
      requestFingerprint: request.query.requestFingerprint
    })
  }));

  app.get("/api/operations/simulations", async () => ({
    simulations: openclog.listRoleAwareSimulations()
  }));

  app.post<{ Body: { day?: { dayKey?: string; entries?: unknown[] }; markdown?: string } }>("/api/replay-bundles/inspect", async (request) => ({
    ok: true,
    replay: openclog.inspectReplayBundle(request.body ?? {})
  }));

  app.post<{
    Body: {
      left?: { manifest?: Record<string, unknown>; day?: { dayKey?: string; summary?: string; entries?: Array<Record<string, unknown>> }; markdown?: string };
      right?: { manifest?: Record<string, unknown>; day?: { dayKey?: string; summary?: string; entries?: Array<Record<string, unknown>> }; markdown?: string };
    };
  }>("/api/replay-bundles/diff", async (request) => ({
    ok: true,
    diff: openclog.diffReplayBundles({
      left: request.body?.left ?? {},
      right: request.body?.right ?? {}
    })
  }));

  app.post<{ Params: { dayKey: string } }>("/api/replay-workspaces/:dayKey", async (request) => ({
    ok: true,
    workspace: openclog.createReplayWorkspace(request.params.dayKey)
  }));

  app.post<{ Body: { dayKey?: string; keepDays?: number; exportTargets?: string[] } }>("/api/closeout/plan", async (request, reply) => {
    try {
      return {
        ok: true,
        plan: openclog.buildCloseoutPlan({
          dayKey: request.body?.dayKey ?? todayKey(),
          keepDays: typeof request.body?.keepDays === "number" ? request.body.keepDays : 1,
          exportTargets: Array.isArray(request.body?.exportTargets) ? request.body.exportTargets.filter((target): target is string => typeof target === "string") : []
        })
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("day_not_found:")) return reply.code(404).send({ error: "day_not_found" });
      throw error;
    }
  });

  app.post<{ Body: { dayKey?: string; exportTargets?: string[] } }>("/api/closeout/complete", async (request, reply) => {
    const completion = openclog.completeCloseout({
      dayKey: request.body?.dayKey ?? todayKey(),
      exportTargets: Array.isArray(request.body?.exportTargets) ? request.body.exportTargets.filter((target): target is string => typeof target === "string") : []
    });
    if (completion.blocked) return reply.code(409).send({ ok: false, error: "closeout_blocked", completion, plan: completion });
    return { ok: true, completion, plan: completion };
  });

  app.get("/api/verification/receipts", async () => ({
    receipts: openclog.listVerificationReceipts()
  }));

  app.post<{ Body: { dayKeys?: string[]; title?: string } }>("/api/investigations/workspaces", async (request) => ({
    ok: true,
    workspace: openclog.createInvestigationWorkspace({
      dayKeys: Array.isArray(request.body?.dayKeys) ? request.body.dayKeys.filter((dayKey): dayKey is string => typeof dayKey === "string") : [todayKey()],
      title: request.body?.title
    })
  }));

  app.get<{ Params: { id: string } }>("/api/investigations/workspaces/:id", async (request, reply) => {
    try {
      return { ok: true, workspace: openclog.getInvestigationWorkspace({ id: request.params.id }) };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("investigation_workspace_not_found:")) return reply.code(404).send({ error: "investigation_workspace_not_found" });
      throw error;
    }
  });

  app.get<{ Params: { entryId: string } }>("/api/lineage/:entryId", async (request, reply) => {
    try {
      return { lineage: openclog.getLineage({ entryId: request.params.entryId }) };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("lineage_not_found:")) return reply.code(404).send({ error: "lineage_not_found" });
      throw error;
    }
  });

  app.get("/api/summaries/profiles", async () => ({
    profiles: openclog.listSummaryProfiles()
  }));

  app.post<{ Params: { id: "default-operator" | "escalation" | "export" }; Body: { dayKey?: string } }>("/api/summaries/profiles/:id/generate", async (request) => ({
    ok: true,
    summary: openclog.generateSummaryProfile({ profileId: request.params.id, dayKey: request.body?.dayKey ?? todayKey() })
  }));

  app.post("/api/integrity-monitor/run", async () => ({
    ok: true,
    report: openclog.runIntegrityMonitor()
  }));

  app.get("/api/integrity-monitor/reports", async () => ({
    reports: openclog.listIntegrityReports()
  }));

  app.get("/api/analytics", async () => ({
    analytics: openclog.getAnalytics()
  }));

  app.get("/api/slo", async () => ({
    slo: openclog.getSloSnapshot()
  }));

  app.get("/api/runbook", async () => ({
    runbook: services.repo.generateOperatorRunbook()
  }));

  app.get<{ Params: { incidentId: string } }>("/api/replay/:incidentId", async (request) => ({
    replay: openclog.buildMissionReplay({ incidentId: request.params.incidentId })
  }));

  app.get<{ Params: { incidentId: string } }>("/api/correlation/:incidentId", async (request) => ({
    graph: openclog.buildCorrelationGraph({ incidentId: request.params.incidentId })
  }));

  app.get("/api/plugins", async () => ({
    plugins: openclog.listPlugins()
  }));

  app.get("/api/capabilities", async () => ({
    capabilities: openclog.listCapabilities()
  }));

  app.get<{ Params: { id: string } }>("/api/capabilities/:id", async (request, reply) => {
    try {
      return { ok: true, capability: openclog.getCapability({ capabilityId: decodeURIComponent(request.params.id) }) };
    } catch (error) {
      const capabilityError = sendCapabilityError(reply, error);
      if (capabilityError) return capabilityError;
      throw error;
    }
  });

  app.post<{ Body: PluginManifest }>("/api/plugins/register", async (request) => ({
    ok: true,
    plugin: openclog.registerPlugin(request.body)
  }));

  app.post<{ Params: { id: string }; Body: { dryRun?: boolean } }>("/api/plugins/:id/run", async (request, reply) => {
    try {
      return {
        ok: true,
        result: openclog.runPlugin({ pluginId: request.params.id, dryRun: request.body?.dryRun === true })
      };
    } catch (error) {
      const capabilityError = sendCapabilityError(reply, error);
      if (capabilityError) return capabilityError;
      throw error;
    }
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
  return ["session.message", "session.tool", "exec.approval.requested", "exec.approval.resolved", "gateway.reconnected", "sequence.gap"].includes(
    event.event
  );
}

function publishJournalEvent(clients: Set<ServerResponse>, entry: JournalEntry, day: unknown): void {
  const body = JSON.stringify({ entry, day });
  for (const client of clients) client.write(`event: journal\ndata: ${body}\n\n`);
}

function publicSettings(services: ApiServices): Record<string, unknown> {
  const openclog = createOpenClogApplication({ repo: services.repo });
  const settings = openclog.getSettings();
  return {
    version: settings.version,
    theme: settings.theme,
    showToolCalls: settings.showToolCalls,
    searchPresets: settings.searchPresets,
    operatorViews: settings.operatorViews,
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
      // Fall back to local journal state.
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
  return {
    id: sessionKey,
    label: cleanPublicText(stringValue(session.title) || stringValue(session.label) || labelFromSessionKey(sessionKey)),
    status: workingStatuses.has(rawStatus.toLowerCase()) ? "working" : "idle",
    summary: cleanPublicText(stringValue(session.summary)) || titleCase(rawStatus) || "Idle",
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
    ...(stringValue(approval.createdAt) || stringValue(approval.requestedAt)
      ? { requestedAt: stringValue(approval.createdAt) || stringValue(approval.requestedAt) }
      : {}),
    ...(stringValue(request.sessionKey) || stringValue(approval.sessionKey)
      ? { sessionKey: stringValue(request.sessionKey) || stringValue(approval.sessionKey) }
      : {})
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

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  return operatorDayKeyFromTimestamp(now, process.env.OPENCLOG_OPERATOR_TIME_ZONE);
}

function sendCapabilityError(reply: FastifyReply, error: unknown): FastifyReply | null {
  if (!(error instanceof Error)) return null;
  if (error.message.startsWith("capability_blocked:")) return reply.code(409).send({ error: "capability_blocked", message: error.message });
  if (error.message.startsWith("capability_not_found:")) return reply.code(404).send({ error: "capability_not_found" });
  return null;
}

function publicGatewayState(state: ReturnType<GatewayPort["getState"]>): Record<string, unknown> {
  const have = state.scopes ?? [];
  const missing = state.missingScopes ?? [];
  return {
    status: state.status,
    role: state.role,
    scopes: have,
    missingScopes: missing,
    scopeNegotiation: { have, missing },
    targetReachable: state.targetReachable ?? (state.status === "ready" || state.connectionStatus === "connected"),
    stale: state.stale === true,
    canIssueControlActions: state.canIssueControlActions,
    ...(state.connectionStatus ? { connectionStatus: state.connectionStatus } : {}),
    ...(state.lastConnectedAt ? { lastConnectedAt: state.lastConnectedAt } : {}),
    ...(state.lastDisconnectedAt ? { lastDisconnectedAt: state.lastDisconnectedAt } : {}),
    ...(state.lastErrorReason ? { lastErrorReason: state.lastErrorReason } : {}),
    ...(state.lastErrorReason ? { lastErrorCategory: classifyGatewayErrorCategory(state.lastErrorReason) } : {}),
    ...(state.lastLiveEventAt ? { lastLiveEventAt: state.lastLiveEventAt } : {}),
    ...(state.lastLiveEventAt || state.lastConnectedAt ? { lastSuccessfulSyncAt: state.lastLiveEventAt ?? state.lastConnectedAt } : {}),
    ...(state.nextReconnectAt ? { nextReconnectAt: state.nextReconnectAt } : {}),
    /* v8 ignore next -- optional transport metadata is exercised via route serialization, not every unit branch permutation */
    ...(typeof state.reconnectCount === "number" ? { reconnectCount: state.reconnectCount } : {}),
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

function classifyGatewayErrorCategory(reason: string): string {
  const normalized = reason.toLocaleLowerCase();
  if (normalized.includes("device identity")) return "device_identity";
  if (normalized.includes("token")) return "token";
  if (normalized.includes("challenge") && normalized.includes("timeout")) return "challenge_timeout";
  if (normalized.includes("scope")) return "scope";
  if (normalized.includes("pair")) return "pairing";
  return "unknown";
}

function checkEndpointBudget(
  state: Map<string, { count: number; windowStartedAt: number }>,
  url: string,
  now = Date.now()
): boolean {
  const routeKey = url.split("?")[0];
  const expensive = [
    "/api/search",
    "/api/sessions/",
    "/api/incidents/",
    "/api/replay/",
    "/api/correlation/"
  ].some((prefix) => routeKey.startsWith(prefix));
  if (!expensive) return false;
  const current = state.get(routeKey);
  if (!current || now - current.windowStartedAt > 10_000) {
    state.set(routeKey, { count: 1, windowStartedAt: now });
    return false;
  }
  current.count += 1;
  state.set(routeKey, current);
  return current.count > 25;
}

function isDeliveryTarget(value: string): value is DeliveryAdapterTarget {
  return value === "slack" || value === "generic-webhook" || value === "email" || value === "github-issue";
}

function isAttentionItemId(value: string): value is
  | "stale_summary"
  | "approval_backlog"
  | "repeated_receipt_failure"
  | "reconnect_event"
  | "route_budget_regression"
  | "failed_dry_run_delivery"
  | "missing_dry_run_delivery" {
  return [
    "stale_summary",
    "approval_backlog",
    "repeated_receipt_failure",
    "reconnect_event",
    "route_budget_regression",
    "failed_dry_run_delivery",
    "missing_dry_run_delivery"
  ].includes(value);
}

function isRetentionClassId(value: string): value is
  | "entries"
  | "alert_state"
  | "incidents"
  | "investigation_notes"
  | "summaries"
  | "bundle_exports"
  | "delivery_receipts"
  | "audit_log"
  | "analytics_integrity_plugin_runs" {
  return [
    "entries",
    "alert_state",
    "incidents",
    "investigation_notes",
    "summaries",
    "bundle_exports",
    "delivery_receipts",
    "audit_log",
    "analytics_integrity_plugin_runs"
  ].includes(value);
}

function timingSection(
  id: string,
  label: string,
  category: NonNullable<ReportAssemblyTimingSection["category"]>,
  startedAt: number,
  rowCount?: number
): ReportAssemblyTimingSection {
  return {
    id,
    label,
    category,
    durationMs: Math.max(0, Math.round((performance.now() - startedAt) * 100) / 100),
    ...(rowCount !== undefined ? { rowCount } : {})
  };
}

function appendReportAssemblySections(
  timing: ReportAssemblyTiming,
  additions: ReportAssemblyTimingSection[],
  routeStartedAt: number
): ReportAssemblyTiming {
  const sections = [...timing.sections, ...additions].map((section) => ({
    ...section,
    durationMs: Math.max(0, Math.round(section.durationMs * 100) / 100)
  }));
  return {
    totalDurationMs: Math.max(timing.totalDurationMs, Math.max(0, Math.round((performance.now() - routeStartedAt) * 100) / 100)),
    sections,
    slowestSections: [...sections].sort((left, right) => right.durationMs - left.durationMs).slice(0, 5)
  };
}

/* v8 ignore next -- process-local git metadata branch varies by test isolation and is validated through route coverage plus targeted helper tests */
export function buildVersionInfo(fingerprint?: BackendFingerprint): { buildTimestamp: string; commitSha: string; version: string; pid: number; bootedAt: string; runtimeFingerprint: string; nodeVersion: string } {
  const version = process.env.npm_package_version ?? "0.1.0";
  let commitSha = "unknown";
  try {
    commitSha = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim() || "unknown";
  } catch {
    commitSha = "unknown";
  }
  return {
    version,
    commitSha: fingerprint?.commitSha ?? commitSha,
    buildTimestamp: fingerprint?.buildTimestamp ?? new Date().toISOString(),
    pid: fingerprint?.pid ?? process.pid,
    bootedAt: fingerprint?.bootedAt ?? new Date().toISOString(),
    runtimeFingerprint: fingerprint?.runtimeFingerprint ?? "unknown",
    nodeVersion: fingerprint?.nodeVersion ?? process.version
  };
}

function isStaleRuntimeFingerprint(value: string | string[] | undefined, fingerprint: BackendFingerprint): boolean {
  const header = Array.isArray(value) ? value[0] : value;
  return Boolean(header && header !== fingerprint.runtimeFingerprint);
}

export function buildIncidentSnapshot(repo: OpenClogRepository, dayKey: string, entryIds: string[], title?: string) {
  const day = repo.getDay(dayKey) ?? sampleJournalDay;
  const selected = day.entries.filter((entry) => entryIds.includes(entry.id));
  return {
    id: `incident-${dayKey}-${entryIds.join("-") || "snapshot"}`,
    title: title ?? `Incident snapshot for ${day.dateLabel}`,
    summary: `Captured ${selected.length} focused entries from ${day.dateLabel}.`,
    dayKeys: [dayKey],
    entryIds: selected.map((entry) => entry.id),
    createdAt: new Date().toISOString(),
    /* v8 ignore next -- fallback suggestions are validated at the incident integration surface */
    runbookSuggestions: repo.listIncidents()[0]?.runbookSuggestions ?? [],
    loopProgress: { detect: true, explain: true, recommend: true, act: false, record: false }
  } satisfies IncidentSummary;
}
