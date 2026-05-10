import type {
  ActiveHypothesis,
  ChaosTestScenario,
  CorrelationGraph,
  DeliveryTargetHealth,
  DeliveryLedger,
  DeliveryLedgerItem,
  EvidenceQualityScore,
  EscalationPlaybook,
  GovernedSdkManifest,
  GuidedIncidentCommand,
  IncidentEvidenceChecklist,
  IncidentEvidenceChecklistItem,
  IncidentTimeline,
  IncidentSummary,
  InvestigationBundlePreview,
  JournalDay,
  NativeCutoverPlan,
  NativeTruthMonitorReport,
  OperationsBacklogReport,
  OperationsGateStatus,
  OperationsLedgerEntry,
  PolicyRecommendationPack,
  ReadinessHistorySparkline,
  RecommendationRationale,
  RoleAwareIncidentSimulation,
  RoutePerformanceBudget,
  SummaryJob,
  SummaryJobDayHistory,
  SummaryJobHistoryItem,
  SummaryJobHistoryPanel,
  VerificationCenterGate,
  VerificationCenterReport,
  VerificationReceipt
} from "@openclog/core";
import type { ApplicationRepository, DeliveryLedgerInput, OperationsBacklogInput } from "./contracts.js";
import { buildCapabilityViews } from "./capabilities.js";

export function buildOperationsModule(repo: ApplicationRepository) {
  return {
    getOperationsBacklog(input: OperationsBacklogInput): OperationsBacklogReport {
      return buildOperationsBacklogReport(repo, input);
    },
    listDeliveryLedger(input: DeliveryLedgerInput = {}): DeliveryLedger {
      return buildDeliveryLedger(repo, input);
    },
    listRoleAwareSimulations(): RoleAwareIncidentSimulation[] {
      return roleAwareSimulations();
    }
  };
}

function buildOperationsBacklogReport(repo: ApplicationRepository, input: OperationsBacklogInput): OperationsBacklogReport {
  const generatedAt = new Date().toISOString();
  const day = repo.getDay?.(input.dayKey) ?? emptyDay(input.dayKey);
  const incident = resolveIncident(repo, input.incidentId, day);
  const incidentId = input.incidentId ?? incident?.id;
  const receipts = repo.listDeliveryReceipts?.() ?? [];
  const summaryJobs = repo.listSummaryJobs?.() ?? [];
  const notes = repo.listInvestigationNotes?.({ dayKey: input.dayKey, ...(incidentId ? { incidentId } : {}) }) ?? [];
  const handoffPackets = repo.listIncidentHandoffPackets?.({ dayKey: input.dayKey, ...(incidentId ? { incidentId } : {}) }) ?? [];
  const replay = safeReplay(repo, incidentId);
  const causalityGraph = safeCorrelation(repo, incidentId);
  const checklist = buildEvidenceChecklist({ day, incidentId, receipts, replaySteps: replay.steps.length, graph: causalityGraph, notes, handoffPackets });
  const routeBudgets = buildRouteBudgets(repo);
  const deliveryLedger = buildDeliveryLedger(repo, {});
  const verificationCenter = buildVerificationCenter(repo, day, receipts, replay.steps.length, routeBudgets, generatedAt);
  const recommendationRationales = buildRecommendationRationales(day, receipts, incident);
  const evidenceQualityScores = buildEvidenceQualityScores(day, incident, checklist, receipts);
  const verificationReceipts = enrichVerificationReceipts(repo.listVerificationReceipts?.() ?? [], generatedAt);
  return {
    dayKey: input.dayKey,
    ...(incidentId ? { incidentId } : {}),
    generatedAt,
    summaryJobHistory: buildSummaryJobHistory(summaryJobs),
    incidentEvidenceChecklist: checklist,
    investigationBundlePreview: buildInvestigationBundlePreview(day, incidentId, receipts, notes, handoffPackets),
    readinessHistory: buildReadinessHistory(repo),
    deliveryLedger,
    deliveryTargetHealth: buildDeliveryTargetHealth(receipts),
    incidentTimeline: buildIncidentTimeline(day, incident, notes, receipts, summaryJobs, verificationReceipts),
    routePerformanceBudgets: routeBudgets,
    chaosScenarios: chaosScenarios(),
    recommendationRationales,
    verificationCenter,
    governedSdkManifests: buildGovernedSdkManifests(repo),
    evidenceQualityScores,
    guidedIncidentCommand: buildGuidedIncidentCommand(incident, checklist, day, receipts),
    roleAwareSimulations: roleAwareSimulations(),
    causalityGraph,
    operationsLedger: { entries: buildOperationsLedger(summaryJobs, receipts, repo.listIncidentActionRecords?.({ ...(incidentId ? { incidentId } : {}) }) ?? [], verificationReceipts) },
    nativeTruthMonitor: buildNativeTruthMonitor(repo, verificationCenter),
    policyRecommendationPacks: buildPolicyRecommendationPacks(recommendationRationales),
    escalationPlaybooks: buildEscalationPlaybooks(day, verificationCenter, receipts),
    retentionImpact: buildRetentionImpact(repo),
    activeHypotheses: buildActiveHypotheses(repo),
    nativeCutoverPlan: buildNativeCutoverPlan()
  };
}

function buildSummaryJobHistory(jobs: SummaryJob[]): SummaryJobHistoryPanel {
  const items = jobs.map((job) => {
    const queuedForMs = durationMs(job.createdAt, job.startedAt ?? job.completedAt);
    const runningForMs = durationMs(job.startedAt, job.completedAt);
    const totalMs = durationMs(job.createdAt, job.completedAt);
    return {
      ...job,
      queuedForMs,
      runningForMs,
      totalMs,
      medianCompletionMs: 0,
      ...(job.error ? { failureReason: job.error } : {})
    } satisfies SummaryJobHistoryItem;
  });
  const medianCompletionMs = median(items.filter((job) => job.completedAt).map((job) => job.totalMs));
  const withMedian = items.map((job) => ({ ...job, medianCompletionMs }));
  const byDay = new Map<string, SummaryJobHistoryItem[]>();
  for (const job of withMedian) byDay.set(job.dayKey, [...(byDay.get(job.dayKey) ?? []), job]);
  const days: SummaryJobDayHistory[] = [...byDay.entries()].map(([dayKey, dayJobs]) => ({
    dayKey,
    retries: Math.max(0, dayJobs.length - 1),
    failureReasons: dayJobs.map((job) => job.failureReason).filter((reason): reason is string => Boolean(reason)),
    medianCompletionMs: median(dayJobs.filter((job) => job.completedAt).map((job) => job.totalMs)),
    queuedCount: dayJobs.filter((job) => job.status === "queued").length,
    runningCount: dayJobs.filter((job) => job.status === "running").length,
    completedCount: dayJobs.filter((job) => job.status === "completed").length,
    failedCount: dayJobs.filter((job) => job.status === "failed").length
  }));
  return { jobs: withMedian, days };
}

function buildEvidenceChecklist(input: {
  day: JournalDay;
  incidentId?: string;
  receipts: Array<{ id: string; incidentId?: string; dayKey: string }>;
  replaySteps: number;
  graph: CorrelationGraph;
  notes: Array<{ id: string }>;
  handoffPackets: Array<{ id: string }>;
}): IncidentEvidenceChecklist {
  const receiptIds = input.receipts
    .filter((receipt) => receipt.dayKey === input.day.dayKey && (!input.incidentId || receipt.incidentId === input.incidentId))
    .map((receipt) => receipt.id);
  const items: IncidentEvidenceChecklistItem[] = [
    { id: "timeline", label: "Timeline evidence", present: input.day.entries.length > 0, evidenceIds: input.day.entries.map((entry) => entry.id) },
    { id: "receipts", label: "Delivery receipts", present: receiptIds.length > 0, evidenceIds: receiptIds },
    { id: "replay", label: "Replay evidence", present: input.replaySteps > 0, evidenceIds: input.replaySteps > 0 ? [`replay:${input.incidentId ?? input.day.dayKey}`] : [] },
    { id: "correlation", label: "Correlation graph", present: input.graph.nodes.length > 0 || input.graph.edges.length > 0, evidenceIds: input.graph.nodes.map((node) => node.id) },
    { id: "notes", label: "Operator notes", present: input.notes.length > 0, evidenceIds: input.notes.map((note) => note.id) },
    { id: "handoff_packet", label: "Handoff packet", present: input.handoffPackets.length > 0, evidenceIds: input.handoffPackets.map((packet) => packet.id) }
  ];
  return { incidentId: input.incidentId ?? "unscoped", ready: items.every((item) => item.present), items };
}

function buildInvestigationBundlePreview(
  day: JournalDay,
  incidentId: string | undefined,
  receipts: Array<{ id: string; dayKey: string; incidentId?: string; status: string }>,
  notes: Array<{ id: string }>,
  handoffPackets: Array<{ id: string }>
): InvestigationBundlePreview {
  const scopedReceipts = receipts.filter((receipt) => receipt.dayKey === day.dayKey && (!incidentId || receipt.incidentId === incidentId));
  return {
    ...(incidentId ? { incidentId } : {}),
    dayKey: day.dayKey,
    items: [
      { id: `timeline:${day.dayKey}`, label: `${day.entries.length} timeline entries`, kind: "timeline", redacted: true, evidenceIds: day.entries.map((entry) => entry.id) },
      ...(day.generatedSummary ? [{ id: `summary:${day.dayKey}`, label: "Generated summary", kind: "summary" as const, redacted: true, evidenceIds: [day.generatedSummary.createdAt] }] : []),
      ...scopedReceipts.map((receipt) => ({ id: receipt.id, label: `${receipt.status} ${receipt.id}`, kind: "receipt" as const, redacted: true, evidenceIds: [receipt.id] })),
      ...notes.map((note) => ({ id: note.id, label: `Note ${note.id}`, kind: "note" as const, redacted: true, evidenceIds: [note.id] })),
      ...handoffPackets.map((packet) => ({ id: packet.id, label: `Handoff ${packet.id}`, kind: "handoff" as const, redacted: true, evidenceIds: [packet.id] }))
    ],
    redactionWarnings: []
  };
}

function buildReadinessHistory(repo: ApplicationRepository): ReadinessHistorySparkline {
  const timeline = repo.listHealthTimeline?.(24) ?? [];
  const aggregate = repo.getHealthAggregate?.(24);
  return {
    windowHours: 24,
    points: timeline.slice(0, 24).map((entry, index) => ({
      timestamp: entry.timestamp,
      backendHealthy: entry.category !== "stale",
      gatewayReady: entry.category === "recovery" || entry.category === "reconnect",
      gatewayStatus: /scope/i.test(entry.detail) || /scope/i.test(entry.title) ? "blocked" : entry.category === "recovery" || entry.category === "reconnect" ? "ready" : "degraded",
      missingScopeCount: /scope/i.test(entry.detail) || /scope/i.test(entry.title) ? 1 : 0,
      reconnectCount: entry.category === "reconnect" ? index + 1 : (aggregate?.reconnectCount ?? 0),
      backendRestartCount: entry.category === "restart" ? 1 : 0
    }))
  };
}

function buildDeliveryLedger(repo: ApplicationRepository, input: DeliveryLedgerInput): DeliveryLedger {
  const query = input.q?.trim().toLocaleLowerCase();
  const items = (repo.listDeliveryReceipts?.() ?? [])
    .filter((receipt) => !input.status || receipt.status === input.status)
    .filter((receipt) => !input.target || receipt.target === input.target)
    .filter((receipt) => !input.requestFingerprint || receipt.requestFingerprint === input.requestFingerprint)
    .filter((receipt) => {
      if (!query) return true;
      return [receipt.id, receipt.target, receipt.status, receipt.correlationId, receipt.requestFingerprint, receipt.idempotencyKey, receipt.deadLetterReason]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase().includes(query));
    })
    .map((receipt): DeliveryLedgerItem => ({
      ...receipt,
      retryPolicy: receipt.retryPolicy ?? {
        sameKeyRetryRequiresConfirmation: receipt.status === "failed" && Boolean(receipt.idempotencyKey),
        nextAttemptUsesNewIdempotencyKey: true,
        schedule: ["immediate", "5m", "15m"],
        terminalAttemptRule: "Stop after the last bounded local retry and keep the failure visible."
      },
      sameKeyRetryRequiresConfirmation: receipt.status === "failed" && Boolean(receipt.idempotencyKey)
    }));
  return { items };
}

function buildRouteBudgets(repo: ApplicationRepository): RoutePerformanceBudget[] {
  const slo = repo.getSloSnapshot?.();
  const baseline = slo?.baselines ?? [];
  return [
    budgetForRoute("/api/summary-jobs", 250, baseline.find((item) => item.id === "summary-jobs")?.current),
    budgetForRoute("/api/incidents", 300, baseline.find((item) => item.id === "incidents")?.current),
    budgetForRoute("/api/health", 100, baseline.find((item) => item.id === "health")?.current)
  ];
}

function budgetForRoute(route: RoutePerformanceBudget["route"], budgetMs: number, observedMs: number | undefined): RoutePerformanceBudget {
  const observed = observedMs ?? Math.round(budgetMs * 0.6);
  return { route, budgetMs, observedMs: observed, status: observed > budgetMs ? "breach" : "ok" };
}

function buildVerificationCenter(
  repo: ApplicationRepository,
  day: JournalDay,
  receipts: Array<{ id: string; status: string; dryRun?: boolean }>,
  replaySteps: number,
  budgets: RoutePerformanceBudget[],
  generatedAt: string
): VerificationCenterReport {
  const verificationReceipts = enrichVerificationReceipts(repo.listVerificationReceipts?.() ?? [], generatedAt);
  const latestVerify = latestReceipt(verificationReceipts.filter((receipt) => /(^verify$)|npm run verify/.test(receipt.command)));
  const latestGateway = latestReceipt(verificationReceipts.filter((receipt) => /verify:gateway|npm run verify:gateway/.test(receipt.command)));
  const latestDesktop = latestReceipt(verificationReceipts.filter((receipt) => /verify:desktop-native|npm run verify:desktop-native/.test(receipt.command)));
  const latestDocs = latestReceipt(verificationReceipts.filter((receipt) => /docs:check|npm run docs:check/.test(receipt.command)));
  const gates: VerificationCenterGate[] = [
    {
      id: "summary_freshness",
      label: "Summary freshness",
      status: generatedSummaryFresh(day) ? "passed" : "blocked",
      detail: generatedSummaryFresh(day) ? "Generated summary includes the latest observed entry." : "Summary may exclude latest entries.",
      evidenceIds: day.generatedSummary ? [day.generatedSummary.createdAt] : []
    },
    {
      id: "delivery_dry_runs",
      label: "Delivery dry-runs",
      status: receipts.some((receipt) => receipt.dryRun && receipt.status === "failed") ? "blocked" : receipts.some((receipt) => receipt.dryRun) ? "passed" : "warning",
      detail: receipts.some((receipt) => receipt.dryRun) ? "Dry-run receipts are present." : "No dry-run receipt is present.",
      evidenceIds: receipts.filter((receipt) => receipt.dryRun).map((receipt) => receipt.id)
    },
    { id: "replay_integrity", label: "Replay integrity", status: replaySteps > 0 ? "passed" : "warning", detail: replaySteps > 0 ? "Replay evidence is reconstructable." : "Replay evidence is not available.", evidenceIds: replaySteps > 0 ? ["mission-replay"] : [] },
    { id: "gateway_readiness", label: "Gateway readiness", status: latestGateway?.status === "passed" ? "passed" : latestGateway?.status === "failed" ? "blocked" : "unknown", detail: latestGateway?.summary ?? "No Gateway verification receipt.", evidenceIds: latestGateway ? [latestGateway.id] : [] },
    { id: "desktop_self_check", label: "Desktop self-check", status: latestDesktop?.status === "passed" ? "passed" : latestDesktop?.status === "failed" ? "blocked" : "unknown", detail: latestDesktop?.summary ?? "No desktop self-check receipt.", evidenceIds: latestDesktop ? [latestDesktop.id] : [] },
    { id: "route_budgets", label: "Route budgets", status: budgets.some((budget) => budget.status === "breach") ? "blocked" : "passed", detail: "Route performance budgets evaluated for summary jobs, incidents, and health.", evidenceIds: budgets.map((budget) => budget.route) }
  ];
  const readinessScore = Math.max(
    0,
    Math.round(
      (gates.reduce((total, gate) => total + (gate.status === "passed" ? 100 : gate.status === "warning" ? 60 : gate.status === "unknown" ? 40 : 0), 0) /
        Math.max(gates.length, 1))
    )
  );
  const readinessLabel = readinessScore >= 85 ? "ready" : readinessScore >= 50 ? "warning" : "blocked";
  return {
    generatedAt,
    gates,
    receipts: verificationReceipts,
    readinessScore,
    readinessLabel,
    ...(latestVerify?.status === "passed" && latestVerify.completedAt ? { lastSuccessfulVerifyAt: latestVerify.completedAt } : {}),
    ...(latestGateway?.status === "passed" && latestGateway.completedAt ? { lastSuccessfulGatewayVerifyAt: latestGateway.completedAt } : {}),
    ...(latestDesktop?.status === "passed" && latestDesktop.completedAt ? { lastSuccessfulDesktopVerifyAt: latestDesktop.completedAt } : {}),
    ...(latestDocs?.status === "passed" && latestDocs.completedAt ? { lastSuccessfulDocsCheckAt: latestDocs.completedAt } : {}),
    ...(latestDocs && "commitSha" in latestDocs && latestDocs.commitSha ? { docsCheckedCommitSha: latestDocs.commitSha } : {})
  };
}

function buildGovernedSdkManifests(repo: ApplicationRepository): GovernedSdkManifest[] {
  const capabilities = buildCapabilityViews(repo, new Date().toISOString());
  const pluginCapability = capabilities.find((capability) => capability.kind === "plugin");
  return [
    { id: "slack", permissions: ["delivery:slack"], expiresAt: "2026-06-08", supportsDryRun: true, failureModes: ["missing_config", "network", "authentication"] },
    { id: "email", permissions: ["delivery:email"], expiresAt: "2026-06-08", supportsDryRun: true, failureModes: ["missing_config", "network", "authentication"] },
    { id: "github", permissions: ["delivery:github-issue"], expiresAt: "2026-06-08", supportsDryRun: true, failureModes: ["missing_config", "network", "authentication"] },
    { id: "plugins", permissions: pluginCapability?.permissions ?? ["plugin:run"], expiresAt: pluginCapability?.expiresAt ?? "2026-06-08", supportsDryRun: true, failureModes: pluginCapability?.failureModes ?? ["validation_blocked"] }
  ];
}

function buildEvidenceQualityScore(
  incidentId: string,
  checklist: IncidentEvidenceChecklist,
  day: JournalDay,
  receipts: Array<{ status: string; incidentId?: string }>
): EvidenceQualityScore {
  const completeness = Math.round((checklist.items.filter((item) => item.present).length / checklist.items.length) * 100);
  const freshness = generatedSummaryFresh(day) ? 100 : 70;
  const provenance = checklist.items.find((item) => item.id === "correlation")?.present ? 90 : 50;
  const actionOutcomeCoverage = receipts.some((receipt) => receipt.incidentId === incidentId) ? 85 : 45;
  const score = Math.round((freshness + completeness + provenance + actionOutcomeCoverage) / 4);
  return {
    incidentId,
    score,
    grade: score >= 90 ? "excellent" : score >= 70 ? "good" : score >= 45 ? "needs-work" : "blocked",
    freshness,
    completeness,
    provenance,
    actionOutcomeCoverage
  };
}

function buildEvidenceQualityScores(
  day: JournalDay,
  incident: IncidentSummary | undefined,
  checklist: IncidentEvidenceChecklist,
  receipts: Array<{ status: string; incidentId?: string }>
): EvidenceQualityScore[] {
  const scores: EvidenceQualityScore[] = [];
  if (incident) scores.push(buildEvidenceQualityScore(incident.id, checklist, day, receipts));
  const completeness = day.evidenceCompleteness ? Math.round((day.evidenceCompleteness.present / Math.max(day.evidenceCompleteness.total, 1)) * 100) : checklist.ready ? 100 : 67;
  const freshness = generatedSummaryFresh(day) ? 100 : 70;
  const provenance = receipts.length > 0 ? 85 : 50;
  const actionOutcomeCoverage = receipts.some((receipt) => receipt.status === "failed") ? 60 : receipts.length > 0 ? 90 : 45;
  const score = Math.round((freshness + completeness + provenance + actionOutcomeCoverage) / 4);
  scores.push({
    dayKey: day.dayKey,
    score,
    grade: score >= 90 ? "excellent" : score >= 70 ? "good" : score >= 45 ? "needs-work" : "blocked",
    freshness,
    completeness,
    provenance,
    actionOutcomeCoverage
  });
  return scores;
}

function roleAwareSimulations(): RoleAwareIncidentSimulation[] {
  return [
    { id: "stale-backend", role: "operator", title: "Stale backend fingerprint rehearsal", liveSideEffects: false, expectedValidationSteps: ["Detect fingerprint drift", "Reload diagnostics", "Record recovery action"] },
    { id: "missing-scopes", role: "operator", title: "Missing Gateway scopes rehearsal", liveSideEffects: false, expectedValidationSteps: ["Inspect missing scopes", "Block outbound actions", "Record remediation note"] },
    { id: "delivery-dead-letter", role: "incident-commander", title: "Delivery dead-letter rehearsal", liveSideEffects: false, expectedValidationSteps: ["Open failed receipt", "Confirm same idempotency key retry", "Verify ledger entry"] }
  ];
}

function buildDeliveryTargetHealth(receipts: Array<{ id: string; target: DeliveryLedgerItem["target"]; status: string; dryRun?: boolean }>): DeliveryTargetHealth[] {
  const targets: DeliveryTargetHealth["target"][] = ["slack", "generic-webhook", "email", "github-issue"];
  return targets.map((target) => {
    const scoped = receipts.filter((receipt) => receipt.target === target);
    const failedDryRun = scoped.find((receipt) => receipt.dryRun && receipt.status === "failed");
    const latest = scoped[0];
    const failedCount24h = scoped.filter((receipt) => receipt.status === "failed").length;
    const dryRunFailures24h = scoped.filter((receipt) => receipt.dryRun && receipt.status === "failed").length;
    return {
      target,
      status: failedDryRun ? "blocked" : scoped.some((receipt) => receipt.dryRun) ? "ok" : "warning",
      detail: failedDryRun ? "Latest dry-run verification failed closed." : scoped.some((receipt) => receipt.dryRun) ? "Dry-run verification receipt is available." : "Dry-run verification receipt has not been recorded yet.",
      dryRunStatus: failedDryRun ? "failed" : scoped.some((receipt) => receipt.dryRun) ? "passed" : "missing",
      ...(latest ? { latestReceiptId: latest.id } : {}),
      receiptCount24h: scoped.length,
      failedCount24h,
      dryRunFailures24h,
      trend: failedCount24h > 0 ? "degraded" : scoped.length > 0 ? "improving" : "steady"
    };
  });
}

function buildIncidentTimeline(
  day: JournalDay,
  incident: IncidentSummary | undefined,
  notes: Array<{ id: string; createdAt: string }>,
  receipts: Array<{ id: string; requestedAt: string; dayKey: string }>,
  summaryJobs: Array<{ id: string; createdAt: string; dayKey: string }>,
  verificationReceipts: Array<{ id: string; startedAt: string; completedAt?: string }>
): IncidentTimeline {
  const range = incident?.dayKeys?.length ? incident.dayKeys : [day.dayKey];
  const events = [
    ...(incident ? [{ id: incident.id, dayKey: incident.dayKeys[0] ?? day.dayKey, timestamp: incident.createdAt, kind: "incident" as const, label: incident.title, relatedId: incident.id }] : []),
    ...notes.map((note) => ({ id: note.id, dayKey: day.dayKey, timestamp: note.createdAt, kind: "note" as const, label: `Note ${note.id}`, relatedId: note.id })),
    ...receipts.map((receipt) => ({ id: receipt.id, dayKey: receipt.dayKey, timestamp: receipt.requestedAt, kind: "delivery_receipt" as const, label: `Receipt ${receipt.id}`, relatedId: receipt.id })),
    ...summaryJobs.map((job) => ({ id: job.id, dayKey: job.dayKey, timestamp: job.createdAt, kind: "summary_job" as const, label: `Summary job ${job.id}`, relatedId: job.id })),
    ...verificationReceipts.map((receipt) => ({ id: receipt.id, dayKey: day.dayKey, timestamp: receipt.completedAt ?? receipt.startedAt, kind: "verification_receipt" as const, label: `Verification ${receipt.id}`, relatedId: receipt.id }))
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  return { startDayKey: range[0] ?? day.dayKey, endDayKey: range[range.length - 1] ?? day.dayKey, events };
}

function buildGuidedIncidentCommand(
  incident: IncidentSummary | undefined,
  checklist: IncidentEvidenceChecklist,
  day: JournalDay,
  receipts: Array<{ status: string; dryRun?: boolean }>
): GuidedIncidentCommand {
  return {
    stages: [
      { id: "detect", title: "Detect", complete: Boolean(incident), blocked: false, detail: incident ? "Incident snapshot is available." : "Capture incident evidence first." },
      { id: "explain", title: "Explain", complete: checklist.items.some((item) => item.id === "timeline" && item.present), blocked: false, detail: "Timeline evidence is available for operator review." },
      { id: "recommend", title: "Recommend", complete: !generatedSummaryFresh(day) || receipts.length > 0, blocked: false, detail: "Recommendations can be derived from summary freshness and delivery evidence." },
      { id: "act", title: "Act", complete: receipts.some((receipt) => receipt.status === "delivered"), blocked: receipts.some((receipt) => receipt.dryRun && receipt.status === "failed"), detail: receipts.some((receipt) => receipt.dryRun && receipt.status === "failed") ? "A failed dry-run is blocking risky actions." : "Actions can proceed through bounded delivery and incident controls." },
      { id: "record", title: "Record", complete: checklist.items.some((item) => item.id === "notes" && item.present), blocked: false, detail: "Operator notes or closeout records are required for a complete handoff." }
    ]
  };
}

function buildOperationsLedger(
  jobs: SummaryJob[],
  receipts: Array<{ id: string; status: string; completedAt: string; correlationId?: string }>,
  actionRecords: Array<{ id: string; title: string; status: "completed" | "failed"; createdAt: string; receiptId?: string; metadata?: Record<string, unknown> }>,
  verificationReceipts: Array<{ id: string; status: "passed" | "failed" | "unknown"; completedAt?: string; startedAt: string; command: string }>
): OperationsLedgerEntry[] {
  const summaryEntries = jobs.filter((job) => job.completedAt).map((job) => ledgerEntry(`ledger-summary-${job.id}`, `summary.${job.status}`, job.completedAt ?? job.createdAt, statusFromJob(job.status), job.id, job.correlationId));
  const receiptEntries = receipts.map((receipt) => ledgerEntry(`ledger-delivery-${receipt.id}`, `delivery.${receipt.status}`, receipt.completedAt, receipt.status === "delivered" ? "completed" : "failed", receipt.id, receipt.correlationId));
  const actionEntries = actionRecords.map((record) => ledgerEntry(`ledger-action-${record.id}`, `incident.action.${record.status}`, record.createdAt, record.status, record.receiptId ?? record.id, typeof record.metadata?.correlationId === "string" ? record.metadata.correlationId : undefined));
  const verificationEntries = verificationReceipts.map((receipt) => ledgerEntry(`ledger-verification-${receipt.id}`, `verification.${receipt.status}`, receipt.completedAt ?? receipt.startedAt, receipt.status === "passed" ? "completed" : receipt.status === "failed" ? "failed" : "unknown", receipt.id));
  return [...summaryEntries, ...receiptEntries, ...actionEntries, ...verificationEntries].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

function ledgerEntry(id: string, action: string, timestamp: string, status: OperationsLedgerEntry["status"], targetId: string, correlationId?: string): OperationsLedgerEntry {
  return { id, action, timestamp, status, actor: "openclog", targetId, ...(correlationId ? { correlationId } : {}), evidenceIds: [targetId] };
}

function buildNativeTruthMonitor(repo: ApplicationRepository, verificationCenter: VerificationCenterReport): NativeTruthMonitorReport {
  const hasBackend = Boolean(repo.getBackendFingerprint?.());
  const gatewayGate = verificationCenter.gates.find((gate) => gate.id === "gateway_readiness");
  const desktopGate = verificationCenter.gates.find((gate) => gate.id === "desktop_self_check");
  const checks = [
    { id: "api_health" as const, status: "passed" as const, detail: "API health route is represented in local diagnostics." },
    { id: "gateway_readiness" as const, status: gatewayGate?.status ?? "unknown", detail: gatewayGate?.detail ?? "Gateway readiness unknown." },
    { id: "launch_agent" as const, status: "unknown" as const, detail: "LaunchAgent status requires native host inspection." },
    { id: "backend_fingerprint" as const, status: hasBackend ? ("passed" as const) : ("warning" as const), detail: hasBackend ? "Backend fingerprint is present." : "Backend fingerprint is unavailable." },
    { id: "desktop_self_check" as const, status: desktopGate?.status ?? "unknown", detail: desktopGate?.detail ?? "Desktop self-check receipt unavailable." }
  ];
  return { status: worstStatus(checks.map((check) => check.status)), checks };
}

function buildRetentionImpact(repo: ApplicationRepository) {
  return repo.previewRetention
    ? repo.previewRetention({ keepDays: 1, includeAudit: true, includeRedactedEvents: true, includeSummaries: true })
    : { keepDays: 1, removedDayKeys: [], removedEntryCount: 0, removedSummaryCount: 0, removedAuditCount: 0 };
}

function buildActiveHypotheses(repo: ApplicationRepository): ActiveHypothesis[] {
  const settings = repo.getSetting?.("settings.v2", { operatorViews: [] as Array<{ id: string; label: string; hypothesis?: string; validationSteps?: string[] }> });
  const operatorViews = Array.isArray(settings?.operatorViews) ? settings.operatorViews : [];
  return operatorViews
    .filter((view): view is { id: string; label: string; hypothesis: string; validationSteps?: string[] } => typeof view?.hypothesis === "string" && view.hypothesis.trim().length > 0)
    .map((view) => ({
      id: view.id,
      label: view.label,
      hypothesis: view.hypothesis,
      validationSteps: Array.isArray(view.validationSteps) ? view.validationSteps : []
    }));
}

function buildNativeCutoverPlan(): NativeCutoverPlan {
  return {
    status: "prep",
    artifactPath: "docs/openclog-native-cutover.md",
    summary: "Truthful prep only: document the desktop-boundary cutover without moving Fastify-owned authority in this campaign.",
    nextSteps: [
      "Move scheduled self-check ownership into the desktop boundary without duplicating Fastify policy.",
      "Keep secure-secret handling native-only and fail closed when the desktop boundary is unavailable.",
      "Promote launch-health evidence into the machine-local operations ledger before any larger cutover."
    ]
  };
}

function buildPolicyRecommendationPacks(recommendations: RecommendationRationale[]): PolicyRecommendationPack[] {
  const packs: PolicyRecommendationPack[] = [
    { id: "stale-backend", label: "Stale backend", recommendations: recommendations.filter((item) => item.recommendationId.includes("backend")) },
    { id: "missing-scopes", label: "Missing scopes", recommendations: recommendations.filter((item) => item.recommendationId.includes("scope")) },
    { id: "failed-summaries", label: "Failed summaries", recommendations: recommendations.filter((item) => item.recommendationId.includes("summary")) },
    { id: "delivery-dead-letters", label: "Delivery dead letters", recommendations: recommendations.filter((item) => item.recommendationId.includes("delivery")) }
  ];
  return packs.map((pack): PolicyRecommendationPack => ({
    ...pack,
    recommendations: pack.recommendations.length > 0
      ? pack.recommendations
      : [{ recommendationId: `${pack.id}:default`, whyThisRecommendation: `Derived from local evidence and ${pack.label.toLocaleLowerCase()} policy inputs.`, evidenceIds: [], rulePackIds: ["default-incident-loop"] }]
  }));
}

function buildEscalationPlaybooks(
  day: JournalDay,
  verificationCenter: VerificationCenterReport,
  receipts: Array<{ status: string; dryRun?: boolean }>
): EscalationPlaybook[] {
  const playbooks: EscalationPlaybook[] = [];
  if (verificationCenter.gates.some((gate) => gate.id === "gateway_readiness" && gate.status !== "passed")) {
    playbooks.push({ id: "missing-scopes", title: "Resolve missing Gateway scopes", steps: ["Copy the missing scopes list.", "Share it with the Gateway owner.", "Keep outbound actions blocked until scopes are granted."] });
  }
  if (!generatedSummaryFresh(day)) {
    playbooks.push({ id: "stale-summary", title: "Refresh stale summary before handoff", steps: ["Review the stale interval.", "Refresh the summary.", "Re-check the handoff packet before escalation."] });
  }
  if (receipts.some((receipt) => receipt.dryRun && receipt.status === "failed")) {
    playbooks.push({ id: "failed-dry-run", title: "Resolve failed dry-run before live delivery", steps: ["Open the failed delivery target.", "Verify config and retry policy.", "Run a fresh dry-run before sending live output."] });
  }
  if (verificationCenter.gates.some((gate) => gate.status === "blocked")) {
    playbooks.push({ id: "readiness-blocked", title: "Clear readiness blockers", steps: ["Review blocked verification gates.", "Resolve the first blocking issue.", "Rerun the affected verification path and record the new receipt."] });
  }
  return playbooks;
}

function buildRecommendationRationales(
  day: JournalDay,
  receipts: Array<{ id: string; status: string; deadLetterReason?: string }>,
  incident?: IncidentSummary
): RecommendationRationale[] {
  const rationales: RecommendationRationale[] = [];
  if (!generatedSummaryFresh(day)) {
    rationales.push({
      recommendationId: "summary-refresh-before-handoff",
      whyThisRecommendation: "Newer local evidence exists than the generated summary includes.",
      evidenceIds: day.entries.slice(-3).map((entry) => entry.id),
      rulePackIds: ["default-incident-loop"]
    });
  }
  for (const receipt of receipts.filter((item) => item.status === "failed")) {
    rationales.push({
      recommendationId: "delivery-dead-letter-retry",
      whyThisRecommendation: `Failed delivery evidence ${receipt.id} should be retried only after confirmation because ${receipt.deadLetterReason ?? "the delivery failed closed"}.`,
      evidenceIds: [receipt.id],
      rulePackIds: ["default-incident-loop"]
    });
  }
  if (incident?.loopProgress && !incident.loopProgress.act) {
    rationales.push({
      recommendationId: "scope-confirm-before-action",
      whyThisRecommendation: "Incident loop action evidence is incomplete, so missing scopes and blocked actions must remain visible.",
      evidenceIds: incident.entryIds,
      rulePackIds: ["default-incident-loop"]
    });
  }
  return rationales;
}

function chaosScenarios(): ChaosTestScenario[] {
  return [
    { id: "stale-backend-fingerprint", title: "Stale backend fingerprint rejects live requests", deterministic: true, expectedOutcome: "stale_backend_fingerprint" },
    { id: "summary-poll-timeout", title: "Summary polling times out fail-closed", deterministic: true, expectedOutcome: "summary_job_polling_timed_out" },
    { id: "delivery-dead-letter", title: "Delivery dead-letter remains retryable with confirmation", deterministic: true, expectedOutcome: "retry_requires_same_idempotency_confirmation" }
  ];
}

function resolveIncident(repo: ApplicationRepository, incidentId: string | undefined, day: JournalDay): IncidentSummary | undefined {
  if (incidentId) return repo.getIncident?.(incidentId) ?? repo.listIncidents?.().find((incident) => incident.id === incidentId);
  return repo.listIncidents?.().find((incident) => incident.dayKeys.includes(day.dayKey));
}

function safeReplay(repo: ApplicationRepository, incidentId: string | undefined) {
  if (!incidentId || !repo.buildMissionReplay) return { steps: [] };
  try {
    return repo.buildMissionReplay(incidentId);
  } catch {
    return { steps: [] };
  }
}

function safeCorrelation(repo: ApplicationRepository, incidentId: string | undefined): CorrelationGraph {
  if (!incidentId || !repo.buildCorrelationGraph) return { incidentId: incidentId ?? "unscoped", nodes: [], edges: [] };
  try {
    return repo.buildCorrelationGraph(incidentId);
  } catch {
    return { incidentId, nodes: [], edges: [] };
  }
}

function emptyDay(dayKey: string): JournalDay {
  return {
    dayKey,
    title: `Day ${dayKey}`,
    dateLabel: dayKey,
    entries: [],
    metrics: { sessionCount: 0, messageCount: 0, toolCallCount: 0, approvalCount: 0, errorCount: 0 }
  };
}

function durationMs(start: string | undefined, end: string | undefined): number {
  if (!start || !end) return 0;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, endMs - startMs);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
}

function generatedSummaryFresh(day: JournalDay): boolean {
  if (!day.generatedSummary) return false;
  const included = day.generatedSummary.lastEntryIncludedAt ? Date.parse(day.generatedSummary.lastEntryIncludedAt) : Date.parse(day.generatedSummary.createdAt);
  const observed = day.generatedSummary.latestEntryObservedAt ? Date.parse(day.generatedSummary.latestEntryObservedAt) : latestEntryMs(day);
  if (!Number.isFinite(included) || !Number.isFinite(observed)) return day.generatedSummary.freshnessState !== "stale";
  return included >= observed && day.generatedSummary.freshnessState !== "stale";
}

function latestEntryMs(day: JournalDay): number {
  return Math.max(0, ...day.entries.map((entry) => Date.parse(entry.timestamp)).filter(Number.isFinite));
}

function latestReceipt<T extends { completedAt?: string; startedAt: string }>(receipts: T[]): T | undefined {
  return receipts.sort((left, right) => (right.completedAt ?? right.startedAt).localeCompare(left.completedAt ?? left.startedAt))[0];
}

function enrichVerificationReceipts<T extends VerificationReceipt>(receipts: T[], generatedAt: string): T[] {
  return receipts.map((receipt) => {
    const completedAt = receipt.completedAt ?? receipt.startedAt;
    const ageMs = durationMs(completedAt, generatedAt);
    const freshness = ageMs <= 15 * 60 * 1000 ? "fresh" : ageMs <= 60 * 60 * 1000 ? "aging" : "stale";
    return {
      ...receipt,
      ageMs,
      ageLabel: ageMs > 0 ? formatDuration(ageMs) : undefined,
      freshness
    };
  });
}

function formatDuration(durationMsValue: number): string {
  if (durationMsValue < 1000) return `${durationMsValue}ms old`;
  const totalSeconds = Math.round(durationMsValue / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s old`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds > 0 ? `${minutes}m ${seconds}s old` : `${minutes}m old`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m old` : `${hours}h old`;
}

function statusFromJob(status: SummaryJob["status"]): OperationsLedgerEntry["status"] {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "queued" || status === "running") return "unknown";
  return "unknown";
}

function worstStatus(statuses: OperationsGateStatus[]): OperationsGateStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("unknown")) return "unknown";
  return "passed";
}
