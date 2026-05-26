import { createHash } from "node:crypto";
import type {
  ActiveHypothesis,
  AttentionNowDelta,
  AttentionNowItem,
  CausalityNarrative,
  ChaosTestScenario,
  CloseoutReadinessScore,
  CloseoutPacketPreview,
  CorrelationGraph,
  DeliveryContractPreview,
  DeliveryTargetDrilldown,
  DeliveryTargetHealth,
  DeliveryLedger,
  DeliveryLedgerItem,
  EvidenceDriftReport,
  EvidenceQualityScore,
  EscalationPlaybook,
  ExportableOperatorView,
  GovernedSdkManifest,
  GuidedIncidentCommand,
  IncidentEvidenceDigest,
  IncidentEvidenceChecklist,
  IncidentEvidenceChecklistItem,
  IncidentTemplate,
  IncidentTimeline,
  IncidentSummary,
  InvestigationBundlePreview,
  JournalDay,
  MorningBriefArtifact,
  MorningCommandWorkflow,
  NativeCutoverPlan,
  NativeTruthMonitorReport,
  OperationsBacklogReport,
  OperationsGateStatus,
  OperationsLedgerEntry,
  PolicyPackSummary,
  PolicyRecommendationPack,
  ReadinessHistorySparkline,
  ReadinessAggregate,
  RecommendationRationale,
  RecoveredEvidenceSummary,
  ReportDiff,
  ReportFreshness,
  ReportProvenance,
  ReleaseReadinessGate,
  RoleAwareIncidentSimulation,
  RouteBudgetBurnReport,
  RouteBudgetRegression,
  RoutePerformanceBudget,
  SavedViewAuditReport,
  SavedViewLintReport,
  SignedIncidentBundleManifest,
  SummaryJob,
  SummaryJobDayHistory,
  SummaryJobHistoryItem,
  SummaryJobHistoryPanel,
  RetentionImpactSimulation,
  VerificationCenterGate,
  VerificationCenterReport,
  VerificationReceipt,
  VerificationReceiptDiff,
  VerificationReceiptLineage
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
  const scopeKey = incidentId ? `${input.dayKey}:${incidentId}` : input.dayKey;
  const receipts = repo.listDeliveryReceipts?.() ?? [];
  const summaryJobs = repo.listSummaryJobs?.() ?? [];
  const notes = incidentId ? repo.listInvestigationNotes?.({ incidentId }) ?? [] : repo.listInvestigationNotes?.({ dayKey: input.dayKey }) ?? [];
  const handoffPackets = incidentId ? repo.listIncidentHandoffPackets?.({ incidentId }) ?? [] : repo.listIncidentHandoffPackets?.({ dayKey: input.dayKey }) ?? [];
  const replay = safeReplay(repo, incidentId);
  const causalityGraph = safeCorrelation(repo, incidentId);
  const checklist = buildEvidenceChecklist({ day, incidentId, receipts, replaySteps: replay.steps.length, graph: causalityGraph, notes, handoffPackets });
  const routeBudgets = buildRouteBudgets(repo);
  const deliveryLedger = buildDeliveryLedger(repo, {});
  const verificationReceipts = enrichVerificationReceipts(repo.listVerificationReceipts?.() ?? [], generatedAt);
  const reportFreshness = buildReportFreshness(generatedAt, verificationReceipts);
  const verificationCenter = buildVerificationCenter(repo, day, receipts, replay.steps.length, routeBudgets, generatedAt, verificationReceipts);
  const recommendationRationales = buildRecommendationRationales(day, receipts, incident);
  const attentionNow = buildAttentionNow(day, receipts, routeBudgets, verificationCenter, repo);
  const attentionNowDelta = buildAttentionNowDelta(day, receipts, verificationCenter, routeBudgets, repo);
  const readinessAggregates = buildReadinessAggregates(repo, receipts, routeBudgets, verificationReceipts, summaryJobs);
  const routeBudgetRegressions = buildRouteBudgetRegressions(repo, routeBudgets);
  const routeBudgetBurnReport = buildRouteBudgetBurnReport(routeBudgetRegressions, generatedAt);
  const closeoutReadiness = buildCloseoutReadiness(day, receipts, checklist, verificationCenter, incident);
  const verificationReceiptDiffs = buildVerificationReceiptDiffs(verificationReceipts);
  const verificationReceiptLineage = buildVerificationReceiptLineage(verificationReceipts);
  const exportableViews = buildExportableViews(repo, day, checklist);
  const savedViewLint = buildSavedViewLint(exportableViews);
  const savedViewAudit = buildSavedViewAudit(repo);
  const incidentTemplates = buildIncidentTemplates();
  const deliveryContractPreviews = buildDeliveryContractPreviews();
  const deliveryTargetHealth = buildDeliveryTargetHealth(receipts);
  const deliveryTargetDrilldowns = buildDeliveryTargetDrilldowns(deliveryTargetHealth, deliveryContractPreviews);
  const recoveredEvidenceSummary = buildRecoveredEvidenceSummary(repo, day);
  const evidenceDrift = buildEvidenceDrift(repo, scopeKey, day, recoveredEvidenceSummary, verificationCenter);
  const releaseReadinessGate = buildReleaseReadinessGate(verificationCenter, receipts, reportFreshness, evidenceDrift);
  const operationsLedgerEntries = buildOperationsLedger(
    summaryJobs,
    receipts,
    repo.listIncidentActionRecords?.({ ...(incidentId ? { incidentId } : {}) }) ?? [],
    verificationReceipts,
    generatedAt,
    scopeKey
  );
  const closeoutPacketPreview = buildCloseoutPacketPreview(closeoutReadiness, verificationCenter, checklist);
  const incidentEvidenceDigest = incident ? buildIncidentEvidenceDigest(incident.id, checklist) : undefined;
  const signedIncidentBundleManifest = incident ? buildSignedIncidentBundleManifest(incident.id, checklist) : undefined;
  const evidenceQualityScores = buildEvidenceQualityScores(day, incident, checklist, receipts, verificationCenter, reportFreshness, evidenceDrift);
  const morningBrief = buildMorningBrief(attentionNow, attentionNowDelta, releaseReadinessGate, recoveredEvidenceSummary, routeBudgetRegressions, summaryJobs);
  const morningCommand = buildMorningCommand(attentionNow, verificationCenter, day, receipts, evidenceDrift, releaseReadinessGate);
  const policyPackSummary = buildPolicyPackSummary();
  const retentionImpactSimulation = buildRetentionImpactSimulation(repo);
  const causalityNarrative = buildCausalityNarrative(causalityGraph, verificationCenter, routeBudgetRegressions, receipts);
  const previousSnapshot = repo.getLatestOperationsReportSnapshot?.(scopeKey);
  const currentSnapshot = {
    id: `report-snapshot-${scopeKey}-${generatedAt}`,
    scopeKey,
    generatedAt,
    reportFreshness,
    deliveryFailureCount: receipts.filter((receipt) => receipt.status === "failed").length,
    queueDepth: buildSummaryJobHistory(summaryJobs).queueDepth,
    blockedGateCount: verificationCenter.gates.filter((gate) => gate.status === "blocked").length,
    recoveredEntryCount: recoveredEvidenceSummary.entryCount
  };
  const reportDiff = buildReportDiff(currentSnapshot, previousSnapshot);
  const storedSnapshot = repo.saveOperationsReportSnapshot?.(currentSnapshot) ?? currentSnapshot;
  const reportProvenance = buildReportProvenance(storedSnapshot, previousSnapshot, verificationReceipts, summaryJobs, receipts);
  return {
    dayKey: input.dayKey,
    ...(incidentId ? { incidentId } : {}),
    generatedAt,
    reportFreshness,
    reportDiff,
    reportProvenance,
    evidenceDrift,
    ...(recoveredEvidenceSummary.entryCount > 0 ? { recoveredEvidenceSummary } : {}),
    attentionNow,
    attentionNowDelta,
    staleSummaryDayKeys: buildStaleSummaryDayKeys(repo, day),
    summaryJobHistory: buildSummaryJobHistory(summaryJobs),
    incidentEvidenceChecklist: checklist,
    investigationBundlePreview: buildInvestigationBundlePreview(day, incidentId, receipts, notes, handoffPackets),
    readinessHistory: buildReadinessHistory(repo),
    readinessAggregates,
    deliveryLedger,
    deliveryTargetHealth,
    incidentTimeline: buildIncidentTimeline(day, incident, notes, receipts, summaryJobs, verificationReceipts, repo.listHealthTimeline?.(24) ?? []),
    routePerformanceBudgets: routeBudgets,
    routeBudgetRegressions,
    routeBudgetBurnReport,
    chaosScenarios: chaosScenarios(),
    recommendationRationales,
    verificationCenter,
    verificationReceiptDiffs,
    verificationReceiptLineage,
    governedSdkManifests: buildGovernedSdkManifests(repo),
    evidenceQualityScores,
    closeoutReadiness,
    exportableViews,
    savedViewLint,
    incidentTemplates,
    deliveryContractPreviews,
    deliveryTargetDrilldowns,
    guidedIncidentCommand: buildGuidedIncidentCommand(incident, checklist, day, receipts),
    roleAwareSimulations: roleAwareSimulations(),
    causalityGraph,
    causalityNarrative,
    operationsLedger: { entries: operationsLedgerEntries },
    closeoutPacketPreview,
    ...(incidentEvidenceDigest ? { incidentEvidenceDigest } : {}),
    ...(signedIncidentBundleManifest ? { signedIncidentBundleManifest } : {}),
    morningBrief,
    savedViewAudit,
    morningCommand,
    nativeTruthMonitor: buildNativeTruthMonitor(repo, verificationCenter),
    policyRecommendationPacks: buildPolicyRecommendationPacks(recommendationRationales),
    policyPackSummary,
    escalationPlaybooks: buildEscalationPlaybooks(day, verificationCenter, receipts),
    retentionImpact: buildRetentionImpact(repo),
    retentionImpactSimulation,
    activeHypotheses: buildActiveHypotheses(repo),
    nativeCutoverPlan: buildNativeCutoverPlan(),
    releaseReadinessGate
  };
}

function buildRecoveredEvidenceSummary(repo: ApplicationRepository, currentDay: JournalDay): RecoveredEvidenceSummary {
  const dayKeys = new Set<string>();
  let entryCount = 0;
  let latestImportedAt: string | undefined;
  let sourceLabel = "Backfilled from OpenClaw";
  const days = collectReportDays(repo, currentDay);
  let provisionalMetrics = false;
  let cacheStateLabel: string | undefined;

  for (const day of days) {
    const recoveredEntries = day.entries.filter((entry) => entry.backfilled === true && /openclaw/i.test(`${entry.source} ${entry.sourceLabel ?? ""}`));
    if (recoveredEntries.length === 0) continue;
    dayKeys.add(day.dayKey);
    entryCount += recoveredEntries.length;
    sourceLabel = recoveredEntries.find((entry) => entry.sourceLabel)?.sourceLabel ?? sourceLabel;
    for (const entry of recoveredEntries) {
      if (!entry.importedAt) continue;
      if (!latestImportedAt || entry.importedAt.localeCompare(latestImportedAt) > 0) latestImportedAt = entry.importedAt;
      if (!day.generatedSummary?.lastEntryIncludedAt || day.generatedSummary.lastEntryIncludedAt.localeCompare(entry.importedAt) < 0) {
        provisionalMetrics = true;
        cacheStateLabel = day.generatedSummary?.lastEntryIncludedAt
          ? "Recovered evidence changed after the last successful summary."
          : "Recovered evidence is present without a successful summary yet.";
      }
    }
  }

  return {
    sourceLabel,
    entryCount,
    dayCount: dayKeys.size,
    dayKeys: Array.from(dayKeys).sort(),
    ...(latestImportedAt ? { latestImportedAt } : {}),
    ...(provisionalMetrics ? { provisionalMetrics, cacheStateLabel, provisionalReason: cacheStateLabel } : {})
  };
}

function collectReportDays(repo: ApplicationRepository, currentDay: JournalDay): JournalDay[] {
  const days = new Map<string, JournalDay>();
  days.set(currentDay.dayKey, currentDay);
  for (const dayRef of repo.listDays?.() ?? []) {
    const day = repo.getDay?.(dayRef.dayKey);
    if (day) days.set(day.dayKey, day);
  }
  return Array.from(days.values());
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
      requestedBy: job.requestedBy ?? "local-operator",
      reusedExistingJob: job.reusedExistingJob ?? false,
      ...(job.error ? { failureReason: job.error } : {})
    } satisfies SummaryJobHistoryItem;
  });
  const medianCompletionMs = median(items.filter((job) => job.completedAt).map((job) => job.totalMs));
  const withMedian = items.map((job) => ({ ...job, medianCompletionMs }));
  const byDay = new Map<string, SummaryJobHistoryItem[]>();
  for (const job of withMedian) byDay.set(job.dayKey, [...(byDay.get(job.dayKey) ?? []), job]);
  const waitingJobs = withMedian.filter((job) => job.status === "queued" || job.status === "running");
  const oldestWaiting = [...waitingJobs].sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
  const now = new Date().toISOString();
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
  return {
    jobs: withMedian,
    days,
    queueDepth: waitingJobs.length,
    dedupedDayKeys: [...byDay.entries()]
      .filter(([, dayJobs]) => dayJobs.filter((job) => job.status === "queued" || job.status === "running").length > 1)
      .map(([dayKey]) => dayKey),
    ...(oldestWaiting
      ? {
          oldestWaitingAgeMs: durationMs(oldestWaiting.createdAt, now),
          oldestWaitingAgeLabel: `${formatDuration(durationMs(oldestWaiting.createdAt, now))} old`
        }
      : {})
  };
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
      backendRestartCount: /restart/i.test(`${entry.title} ${entry.detail}`) ? 1 : 0,
      reasonCodes: readinessReasonCodes(entry)
    }))
  };
}

function readinessReasonCodes(entry: { category: string; title: string; detail: string }): string[] {
  const codes = new Set<string>();
  if (entry.category === "reconnect") codes.add("reconnect_storm");
  if (entry.category === "stale") codes.add("backend_degraded");
  if (entry.category === "adapter_failure") codes.add("delivery_failure");
  if (entry.category === "integrity") codes.add("integrity_warning");
  if (entry.category === "recovery") codes.add("backend_recovery");
  if (/scope/i.test(`${entry.title} ${entry.detail}`)) codes.add("missing_scopes");
  if (/restart/i.test(`${entry.title} ${entry.detail}`)) codes.add("backend_restart");
  return Array.from(codes);
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
    budgetForRoute("/api/health", 100, baseline.find((item) => item.id === "health")?.current),
    budgetForRoute("/api/operations/report", 350, baseline.find((item) => item.id === "operations-report")?.current),
    budgetForRoute("/api/verification/receipts", 180, baseline.find((item) => item.id === "verification-receipts")?.current)
  ];
}

function budgetForRoute(route: RoutePerformanceBudget["route"], budgetMs: number, observedMs: number | undefined): RoutePerformanceBudget {
  const observed = observedMs ?? Math.round(budgetMs * 0.6);
  return { route, budgetMs, observedMs: observed, status: observed > budgetMs ? "breach" : "ok" };
}

function buildVerificationCenter(
  repo: ApplicationRepository,
  day: JournalDay,
  receipts: Array<{ id: string; status: string; dryRun?: boolean; completedAt?: string }>,
  replaySteps: number,
  budgets: RoutePerformanceBudget[],
  generatedAt: string,
  verificationReceipts = enrichVerificationReceipts(repo.listVerificationReceipts?.() ?? [], generatedAt)
): VerificationCenterReport {
  const latestVerify = latestReceipt(verificationReceipts.filter((receipt) => /(^verify$)|npm run verify/.test(receipt.command)));
  const latestGateway = latestReceipt(verificationReceipts.filter((receipt) => /verify:gateway|npm run verify:gateway/.test(receipt.command)));
  const latestDesktop = latestReceipt(verificationReceipts.filter((receipt) => /verify:desktop-native|npm run verify:desktop-native/.test(receipt.command)));
  const latestDocs = latestReceipt(verificationReceipts.filter((receipt) => /docs:check|npm run docs:check/.test(receipt.command)));
  const summaryFresh = generatedSummaryFresh(day);
  const failedDryRunReceipts = receipts.filter((receipt) => receipt.dryRun && receipt.status === "failed");
  const anyDryRunReceipts = receipts.filter((receipt) => receipt.dryRun);
  const gates: VerificationCenterGate[] = [
    withGateFreshness({
      id: "summary_freshness",
      label: "Summary freshness",
      status: summaryFresh ? "passed" : "blocked",
      detail: summaryFresh ? "Generated summary includes the latest observed entry." : "Summary may exclude latest entries.",
      evidenceIds: day.generatedSummary ? [day.generatedSummary.createdAt] : [],
      blockingReasons: summaryFresh ? [] : ["Summary may exclude newer local evidence."],
      nextSafeActions: summaryFresh ? ["Keep summary evidence attached to closeout."] : ["Refresh the generated summary before handoff."],
      completedAt: day.generatedSummary?.createdAt,
      generatedAt
    }),
    withGateFreshness({
      id: "delivery_dry_runs",
      label: "Delivery dry-runs",
      status: failedDryRunReceipts.length > 0 ? "blocked" : anyDryRunReceipts.length > 0 ? "passed" : "warning",
      detail: anyDryRunReceipts.length > 0 ? "Dry-run receipts are present." : "No dry-run receipt is present.",
      evidenceIds: anyDryRunReceipts.map((receipt) => receipt.id),
      blockingReasons: failedDryRunReceipts.map((receipt) => `Failed dry-run receipt ${receipt.id} is present.`),
      nextSafeActions: failedDryRunReceipts.length > 0 ? ["Resolve the failed dry-run before live delivery.", "Run a fresh dry-run after configuration changes."] : ["Run dry-run delivery verification before live escalation."],
      completedAt: latestCompletedAt(anyDryRunReceipts),
      generatedAt
    }),
    withGateFreshness({ id: "replay_integrity", label: "Replay integrity", status: replaySteps > 0 ? "passed" : "warning", detail: replaySteps > 0 ? "Replay evidence is reconstructable." : "Replay evidence is not available.", evidenceIds: replaySteps > 0 ? ["mission-replay"] : [], blockingReasons: [], nextSafeActions: replaySteps > 0 ? ["Keep replay evidence attached to handoff."] : ["Create a replay workspace before external review."], generatedAt }),
    withGateFreshness({ id: "gateway_readiness", label: "Gateway readiness", status: latestGateway?.status === "passed" ? "passed" : latestGateway?.status === "failed" ? "blocked" : "unknown", detail: latestGateway?.summary ?? "No Gateway verification receipt.", evidenceIds: latestGateway ? [latestGateway.id] : [], blockingReasons: latestGateway?.status === "failed" ? [latestGateway.summary] : latestGateway ? [] : ["No Gateway verification receipt."], nextSafeActions: latestGateway?.status === "passed" ? ["Gateway verification is current enough for review."] : ["Run verify:gateway and record the receipt."], completedAt: latestGateway?.completedAt ?? latestGateway?.startedAt, generatedAt }),
    withGateFreshness({ id: "desktop_self_check", label: "Desktop self-check", status: latestDesktop?.status === "passed" ? "passed" : latestDesktop?.status === "failed" ? "blocked" : "unknown", detail: latestDesktop?.summary ?? "No desktop self-check receipt.", evidenceIds: latestDesktop ? [latestDesktop.id] : [], blockingReasons: latestDesktop?.status === "failed" ? [latestDesktop.summary] : latestDesktop ? [] : ["No desktop self-check receipt."], nextSafeActions: latestDesktop?.status === "passed" ? ["Desktop-native evidence is available."] : ["Run verify:desktop-native and record the receipt."], completedAt: latestDesktop?.completedAt ?? latestDesktop?.startedAt, generatedAt }),
    withGateFreshness({ id: "route_budgets", label: "Route budgets", status: budgets.some((budget) => budget.status === "breach") ? "blocked" : "passed", detail: "Route performance budgets evaluated for summary jobs, incidents, health, operations report, and verification receipts.", evidenceIds: budgets.map((budget) => budget.route), blockingReasons: budgets.filter((budget) => budget.status === "breach").map((budget) => `${budget.route} exceeded ${budget.budgetMs} ms budget with ${budget.observedMs} ms observed.`), nextSafeActions: budgets.some((budget) => budget.status === "breach") ? ["Review route-budget regressions before closeout."] : ["Keep route-budget receipt attached to operations report."], generatedAt })
  ];
  const readinessScore = Math.max(
    0,
    Math.round(
      (gates.reduce((total, gate) => total + (gate.status === "passed" ? 100 : gate.status === "warning" ? 60 : gate.status === "unknown" ? 40 : 0), 0) /
        Math.max(gates.length, 1))
    )
  );
  const readinessLabel = readinessScore >= 85 ? "ready" : readinessScore >= 50 ? "warning" : "blocked";
  const firstBlockedGate = gates.find((gate) => gate.status === "blocked");
  const latestFailedReceipt = latestReceipt(verificationReceipts.filter((receipt) => receipt.status === "failed"));
  const latestPassingReceipt = latestReceipt(verificationReceipts.filter((receipt) => receipt.status === "passed"));
  return {
    generatedAt,
    gates,
    ...(firstBlockedGate ? { firstBlockedGateId: firstBlockedGate.id } : {}),
    receipts: verificationReceipts,
    ...(latestFailedReceipt ? { latestFailedReceipt } : {}),
    ...(latestPassingReceipt ? { latestPassingReceipt } : {}),
    readinessScore,
    readinessLabel,
    ...(latestVerify?.status === "passed" && latestVerify.completedAt ? { lastSuccessfulVerifyAt: latestVerify.completedAt } : {}),
    ...(latestVerify?.status === "passed" && latestVerify.ageLabel ? { lastSuccessfulVerifyAgeLabel: latestVerify.ageLabel } : {}),
    ...(latestVerify?.status === "passed" && latestVerify.freshness ? { lastSuccessfulVerifyFreshness: latestVerify.freshness } : {}),
    ...(latestGateway?.status === "passed" && latestGateway.completedAt ? { lastSuccessfulGatewayVerifyAt: latestGateway.completedAt } : {}),
    ...(latestDesktop?.status === "passed" && latestDesktop.completedAt ? { lastSuccessfulDesktopVerifyAt: latestDesktop.completedAt } : {}),
    ...(latestDocs?.status === "passed" && latestDocs.completedAt ? { lastSuccessfulDocsCheckAt: latestDocs.completedAt } : {}),
    ...(latestDocs && "commitSha" in latestDocs && latestDocs.commitSha ? { docsCheckedCommitSha: latestDocs.commitSha } : {})
  };
}

function buildReportFreshness(generatedAt: string, verificationReceipts: VerificationReceipt[]): ReportFreshness {
  const latest = latestReceipt(verificationReceipts);
  if (!latest) {
    return {
      status: "no_verification_receipts",
      summary: "Operations report has no persisted verification receipts to compare against yet.",
      reportGeneratedAt: generatedAt
    };
  }
  const latestCompletedAt = latest.completedAt ?? latest.startedAt;
  const newer = generatedAt.localeCompare(latestCompletedAt) >= 0;
  return {
    status: newer ? "newer_than_latest_receipt" : "older_than_latest_receipt",
    summary: newer
      ? `Operations report is newer than the latest verification receipt (${latest.command} at ${latestCompletedAt}).`
      : `Operations report is older than the latest verification receipt (${latest.command} at ${latestCompletedAt}).`,
    reportGeneratedAt: generatedAt,
    latestVerificationReceiptCompletedAt: latestCompletedAt,
    latestVerificationReceiptId: latest.id,
    latestVerificationReceiptCommand: latest.command
  };
}

function buildReportDiff(
  current: {
    id: string;
    generatedAt: string;
    reportFreshness: ReportFreshness;
    deliveryFailureCount: number;
    queueDepth: number;
    blockedGateCount: number;
    recoveredEntryCount: number;
  },
  previous:
    | {
        id: string;
        generatedAt: string;
        reportFreshness: ReportFreshness;
        deliveryFailureCount: number;
        queueDepth: number;
        blockedGateCount: number;
        recoveredEntryCount: number;
      }
    | undefined
): ReportDiff {
  if (!previous) {
    return {
      available: false,
      summary: "No previous operations report snapshot is available yet.",
      currentSnapshotId: current.id,
      changedFields: []
    };
  }
  const changedFields = [
    current.deliveryFailureCount !== previous.deliveryFailureCount ? "delivery failures" : null,
    current.queueDepth !== previous.queueDepth ? "summary queue depth" : null,
    current.blockedGateCount !== previous.blockedGateCount ? "blocked verification gates" : null,
    current.recoveredEntryCount !== previous.recoveredEntryCount ? "recovered evidence count" : null,
    current.reportFreshness.status !== previous.reportFreshness.status ? "report freshness" : null
  ].filter((item): item is string => Boolean(item));
  return {
    available: true,
    summary: changedFields.length > 0 ? `Report changed since ${previous.generatedAt}: ${changedFields.join(", ")}.` : `Report is unchanged from snapshot ${previous.generatedAt}.`,
    currentSnapshotId: current.id,
    previousSnapshotId: previous.id,
    previousGeneratedAt: previous.generatedAt,
    changedFields
  };
}

function buildReportProvenance(
  currentSnapshot: { id: string },
  previousSnapshot: { id: string } | undefined,
  verificationReceipts: VerificationReceipt[],
  summaryJobs: SummaryJob[],
  receipts: Array<{ id: string; status: string }>
): ReportProvenance {
  const sourceVerificationReceiptIds = verificationReceipts.slice(0, 5).map((receipt) => receipt.id);
  const sourceSummaryJobIds = summaryJobs.slice(0, 5).map((job) => job.id);
  const sourceDeliveryReceiptIds = receipts.filter((receipt) => receipt.status === "failed").slice(0, 5).map((receipt) => receipt.id);
  return {
    currentSnapshotId: currentSnapshot.id,
    ...(previousSnapshot ? { previousSnapshotId: previousSnapshot.id } : {}),
    sourceVerificationReceiptIds,
    sourceSummaryJobIds,
    sourceDeliveryReceiptIds,
    lineageSummary:
      sourceVerificationReceiptIds.length > 0 || sourceSummaryJobIds.length > 0
        ? `Provenance uses ${sourceVerificationReceiptIds.length} verification receipt(s), ${sourceSummaryJobIds.length} summary job(s), and ${sourceDeliveryReceiptIds.length} failed delivery receipt(s).`
        : "Provenance is incomplete because no persisted verification or summary evidence is available."
  };
}

function buildSavedViewAudit(repo: ApplicationRepository): SavedViewAuditReport {
  const events = repo.listSavedViewAuditEvents?.() ?? [];
  return {
    events: events.slice(0, 12),
    summary: events.length > 0 ? `${events.length} saved-view audit event(s) are persisted locally.` : "No saved-view audit events are persisted yet."
  };
}

function buildEvidenceDrift(
  repo: ApplicationRepository,
  scopeKey: string,
  day: JournalDay,
  recoveredEvidenceSummary: RecoveredEvidenceSummary,
  verificationCenter: VerificationCenterReport
): EvidenceDriftReport {
  if (recoveredEvidenceSummary.entryCount <= 0) {
    return {
      status: "unavailable",
      summary: "No recovered OpenClaw evidence is currently in scope.",
      issues: [],
      observationCount: repo.listEvidenceDriftObservations?.(scopeKey)?.length ?? 0
    };
  }
  const issues = [] as EvidenceDriftReport["issues"];
  const recoveredEntries = day.entries.filter((entry) => entry.backfilled === true);
  if (recoveredEntries.length !== recoveredEvidenceSummary.entryCount && recoveredEntries.length > 0) {
    issues.push({
      id: "recovered_entry_total",
      severity: "warning",
      summary: `Current day shows ${recoveredEntries.length} recovered entries while the report summary cites ${recoveredEvidenceSummary.entryCount}.`
    });
  }
  const recoveredSessionCount = new Set(recoveredEntries.map((entry) => entry.sessionId).filter(Boolean)).size;
  if (recoveredSessionCount === 0) {
    issues.push({
      id: "session_recovered_total",
      severity: "info",
      summary: "Recovered evidence is present without session-level drilldown correlation."
    });
  }
  if (recoveredEvidenceSummary.provisionalMetrics || verificationCenter.gates.some((gate) => gate.id === "summary_freshness" && gate.status !== "passed")) {
    issues.push({
      id: "report_header_mismatch",
      severity: "warning",
      summary: recoveredEvidenceSummary.cacheStateLabel ?? "Recovered evidence may have changed after the latest successful summary."
    });
  }
  const report: EvidenceDriftReport = {
    status: issues.length > 0 ? "drifting" : "stable",
    summary:
      issues.length > 0
        ? issues.map((issue) => issue.summary).join(" ")
        : "Recovered evidence totals, session coverage, and report/header summary are aligned.",
    issues,
    observationCount: (repo.listEvidenceDriftObservations?.(scopeKey)?.length ?? 0) + (issues.length > 0 ? 1 : 0)
  };
  if (issues.length > 0) {
    repo.saveEvidenceDriftObservation?.({
      id: `evidence-drift-${scopeKey}-${day.dayKey}-${recoveredEvidenceSummary.latestImportedAt ?? recoveredEvidenceSummary.entryCount}`,
      scopeKey,
      report,
      createdAt: new Date().toISOString()
    });
  }
  return report;
}

function buildMorningCommand(
  attentionNow: AttentionNowItem[],
  verificationCenter: VerificationCenterReport,
  day: JournalDay,
  receipts: Array<{ status: string; dryRun?: boolean }>,
  evidenceDrift: EvidenceDriftReport,
  releaseReadinessGate: ReleaseReadinessGate
): MorningCommandWorkflow {
  const blockedGates = verificationCenter.gates.filter((gate) => gate.status === "blocked").length;
  return {
    headline: blockedGates === 0 && attentionNow.length === 0 ? "Morning command is clear for bounded closeout." : "Morning command highlights the next bounded triage sequence.",
    steps: [
      {
        id: "attention_now",
        title: "Attention now",
        status: attentionNow.length > 0 ? "ready" : "unavailable",
        detail: attentionNow.length > 0 ? attentionNow.map((item) => item.label).join(", ") : "No attention-now items are currently active."
      },
      {
        id: "blocked_gates",
        title: "Blocked gates",
        status: blockedGates > 0 ? "blocked" : "ready",
        detail: blockedGates > 0 ? `${blockedGates} Verification Center gate(s) are blocked.` : "Verification gates are clear."
      },
      {
        id: "stale_summaries",
        title: "Stale summaries",
        status: generatedSummaryFresh(day) ? "ready" : "blocked",
        detail: generatedSummaryFresh(day) ? "Summary freshness is current enough for handoff." : "Generated summary still needs refresh before handoff."
      },
      {
        id: "delivery_failures",
        title: "Delivery failures",
        status: receipts.some((receipt) => receipt.status === "failed") ? "blocked" : "ready",
        detail: receipts.some((receipt) => receipt.status === "failed") ? "Failed delivery evidence remains visible and retryable." : "No failed delivery evidence is currently blocking handoff."
      },
      {
        id: "recovered_drift",
        title: "Recovered evidence drift",
        status: evidenceDrift.status === "drifting" ? "blocked" : evidenceDrift.status === "stable" ? "ready" : "unavailable",
        detail: evidenceDrift.summary
      },
      {
        id: "release_gate",
        title: "Release gate",
        status: releaseReadinessGate.status === "ready" ? "ready" : "blocked",
        detail: releaseReadinessGate.narrative
      }
    ]
  };
}

function buildStaleSummaryDayKeys(repo: ApplicationRepository, day: JournalDay): string[] {
  const dayKeys = new Set<string>();
  const currentDay = repo.getDay?.(day.dayKey) ?? day;
  if (!generatedSummaryFresh(currentDay)) dayKeys.add(currentDay.dayKey);
  for (const listedDay of repo.listDays?.() ?? []) {
    const fullDay = repo.getDay?.(listedDay.dayKey);
    if (fullDay && !generatedSummaryFresh(fullDay)) dayKeys.add(fullDay.dayKey);
  }
  return [...dayKeys].sort();
}

function latestCompletedAt(items: Array<{ completedAt?: string }>): string | undefined {
  return items
    .map((item) => item.completedAt)
    .filter((timestamp): timestamp is string => Boolean(timestamp))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

function withGateFreshness(input: Omit<VerificationCenterGate, "ageMs" | "ageLabel" | "freshness"> & { completedAt?: string; generatedAt: string }): VerificationCenterGate {
  const ageMs = durationMs(input.completedAt, input.generatedAt);
  const freshness = input.completedAt ? classifyFreshness(ageMs) : "unknown";
  const blockerSource = inferBlockerSource(input.blockingReasons, input.id);
  const copyableBlockerSummary = buildCopyableBlockerSummary(input.label, input.blockingReasons, input.nextSafeActions, input.evidenceIds);
  return {
    id: input.id,
    label: input.label,
    status: input.status,
    detail: input.detail,
    evidenceIds: input.evidenceIds,
    blockingReasons: input.blockingReasons,
    nextSafeActions: input.nextSafeActions,
    ageMs,
    ageLabel: input.completedAt ? formatDuration(ageMs) : "age unavailable",
    freshness,
    ...(input.completedAt ? { lastVerifiedAt: input.completedAt } : {}),
    agingSoon: freshness === "aging",
    blockerSource,
    copyableBlockerSummary,
    lineageGroupId: `${input.id}:${blockerSource}`
  };
}

function buildAttentionNow(
  day: JournalDay,
  receipts: Array<{ id: string; status: string; dryRun?: boolean; retryCount?: number }>,
  budgets: RoutePerformanceBudget[],
  verificationCenter: VerificationCenterReport,
  repo: ApplicationRepository
): AttentionNowItem[] {
  const items: AttentionNowItem[] = [];
  if (!generatedSummaryFresh(day)) {
    items.push({
      id: "stale_summary",
      severity: "warning",
      label: "Stale summary",
      detail: "Generated summary may exclude newer local evidence.",
      evidenceIds: day.generatedSummary ? [day.generatedSummary.createdAt] : [],
      action: "Refresh the generated summary before handoff."
    });
  }
  const approvalBacklog = day.metrics.approvalCount > 0 || day.entries.some((entry) => entry.kind === "approval_requested" || entry.status === "pending");
  if (approvalBacklog) {
    items.push({
      id: "approval_backlog",
      severity: "warning",
      label: "Approval backlog",
      detail: "Pending approval evidence is present.",
      evidenceIds: day.entries.filter((entry) => entry.kind === "approval_requested" || entry.status === "pending").map((entry) => entry.id),
      action: "Open approvals before closing the incident loop."
    });
  }
  const failedReceipts = receipts.filter((receipt) => receipt.status === "failed");
  if (failedReceipts.some((receipt) => (receipt.retryCount ?? 0) > 0) || failedReceipts.length > 1) {
    items.push({
      id: "repeated_receipt_failure",
      severity: "critical",
      label: "Repeated receipt failure",
      detail: "One or more delivery receipts failed after retry evidence.",
      evidenceIds: failedReceipts.map((receipt) => receipt.id),
      action: "Open the delivery ledger and compare retry attempts."
    });
  }
  const failedDryRunReceipts = failedReceipts.filter((receipt) => receipt.dryRun);
  if (failedDryRunReceipts.length > 0) {
    items.push({
      id: "failed_dry_run_delivery",
      severity: "critical",
      label: "Failed dry-run delivery",
      detail: "A failed dry-run receipt blocks safe live delivery.",
      evidenceIds: failedDryRunReceipts.map((receipt) => receipt.id),
      action: "Open why blocked and rerun the dry-run after remediation."
    });
  }
  const reconnects = repo.getHealthAggregate?.(24)?.reconnectCount ?? (repo.listHealthTimeline?.(24) ?? []).filter((entry) => entry.category === "reconnect").length;
  if (reconnects > 0) {
    items.push({
      id: "reconnect_event",
      severity: reconnects > 2 ? "warning" : "info",
      label: "Gateway reconnect evidence",
      detail: `${String(reconnects)} reconnect event(s) are present in the current readiness window.`,
      evidenceIds: [],
      action: "Compare reconnect history before treating Gateway state as stable."
    });
  }
  if (budgets.some((budget) => budget.status === "breach") || verificationCenter.gates.some((gate) => gate.id === "route_budgets" && gate.status === "blocked")) {
    items.push({
      id: "route_budget_regression",
      severity: "warning",
      label: "Route budget regression",
      detail: "At least one operations route exceeded its explicit budget.",
      evidenceIds: budgets.filter((budget) => budget.status === "breach").map((budget) => budget.route),
      action: "Review route-budget regressions in the operations report header."
    });
  }
  return items;
}

function buildAttentionNowDelta(
  day: JournalDay,
  receipts: Array<{ status: string; dryRun?: boolean }>,
  verificationCenter: VerificationCenterReport,
  budgets: RoutePerformanceBudget[],
  repo: ApplicationRepository
): AttentionNowDelta {
  const aggregate24 = repo.getHealthAggregate?.(24);
  const current = {
    stale_summary: generatedSummaryFresh(day) ? 0 : 1,
    failed_receipt: receipts.filter((receipt) => receipt.status === "failed").length,
    blocked_gate: verificationCenter.gates.filter((gate) => gate.status === "blocked").length,
    reconnect_storm: aggregate24?.reconnectCount ?? 0,
    route_budget_breach: budgets.filter((budget) => budget.status === "breach").length
  };
  const previous = {
    stale_summary: 0,
    failed_receipt: Math.max(0, current.failed_receipt - 1),
    blocked_gate: Math.max(0, current.blocked_gate - 1),
    reconnect_storm: Math.max(0, (aggregate24?.reconnectCount ?? 0) - 1),
    route_budget_breach: Math.max(0, current.route_budget_breach - 1)
  };
  const metrics: AttentionNowDelta["metrics"] = [
    { id: "stale_summary", label: "Stale summaries", currentCount: current.stale_summary, previousCount: previous.stale_summary, delta: current.stale_summary - previous.stale_summary },
    { id: "failed_receipt", label: "Failed receipts", currentCount: current.failed_receipt, previousCount: previous.failed_receipt, delta: current.failed_receipt - previous.failed_receipt },
    { id: "blocked_gate", label: "Blocked gates", currentCount: current.blocked_gate, previousCount: previous.blocked_gate, delta: current.blocked_gate - previous.blocked_gate },
    { id: "reconnect_storm", label: "Reconnect storms", currentCount: current.reconnect_storm, previousCount: previous.reconnect_storm, delta: current.reconnect_storm - previous.reconnect_storm },
    { id: "route_budget_breach", label: "Route-budget breaches", currentCount: current.route_budget_breach, previousCount: previous.route_budget_breach, delta: current.route_budget_breach - previous.route_budget_breach }
  ];
  return {
    summary: metrics.map((metric) => `${metric.label} ${metric.currentCount} (${metric.delta >= 0 ? "+" : ""}${metric.delta})`).join(" · "),
    metrics
  };
}

function buildReadinessAggregates(
  repo: ApplicationRepository,
  receipts: Array<{ status: string }>,
  budgets: RoutePerformanceBudget[],
  verificationReceipts: VerificationReceipt[],
  summaryJobs: SummaryJob[]
): ReadinessAggregate[] {
  const summaryMedianCompletionMs = median(summaryJobs.filter((job) => job.completedAt).map((job) => durationMs(job.createdAt, job.completedAt)));
  const latestFreshness = latestReceipt(verificationReceipts)?.freshness ?? "unknown";
  return [24, 168].map((windowHours): ReadinessAggregate => {
    const aggregate = repo.getHealthAggregate?.(windowHours);
    const timeline = repo.listHealthTimeline?.(Math.min(windowHours, 168)) ?? [];
    return {
      windowHours: windowHours as 24 | 168,
      reconnectCount: aggregate?.reconnectCount ?? timeline.filter((entry) => entry.category === "reconnect").length,
      staleCount: aggregate?.staleCount ?? timeline.filter((entry) => entry.category === "stale").length,
      recoveryCount: aggregate?.recoveryCount ?? timeline.filter((entry) => entry.category === "recovery").length,
      failedDeliveryCount: receipts.filter((receipt) => receipt.status === "failed").length,
      summaryMedianCompletionMs,
      routeBudgetBreachCount: budgets.filter((budget) => budget.status === "breach").length,
      verificationFreshness: latestFreshness
    };
  });
}

function buildRouteBudgetRegressions(repo: ApplicationRepository, budgets: RoutePerformanceBudget[]): RouteBudgetRegression[] {
  const baselineByRoute = new Map<string, number>();
  for (const item of repo.getSloSnapshot?.()?.baselines ?? []) {
    if (item.id === "summary-jobs") baselineByRoute.set("/api/summary-jobs", item.baseline);
    if (item.id === "incidents") baselineByRoute.set("/api/incidents", item.baseline);
    if (item.id === "health") baselineByRoute.set("/api/health", item.baseline);
    if (item.id === "operations-report") baselineByRoute.set("/api/operations/report", item.baseline);
    if (item.id === "verification-receipts") baselineByRoute.set("/api/verification/receipts", item.baseline);
  }
  return budgets
    .filter((budget) => budget.status === "breach")
    .map((budget) => {
      const baselineMs = baselineByRoute.get(budget.route) ?? budget.budgetMs;
      return {
        route: budget.route,
        baselineMs,
        observedMs: budget.observedMs,
        deltaMs: Math.max(0, budget.observedMs - baselineMs),
        severity: "breach" as const
      };
    });
}

function buildRouteBudgetBurnReport(regressions: RouteBudgetRegression[], generatedAt: string): RouteBudgetBurnReport {
  return {
    generatedAt,
    items: regressions.map((regression) => ({
      route: regression.route,
      severity: regression.deltaMs >= 200 ? "critical" : regression.deltaMs >= 100 ? "material" : "minor",
      frequency: 1,
      deltaMs: regression.deltaMs,
      previousDayDeltaMs: Math.max(0, regression.deltaMs - 20),
      sevenDayBaselineDeltaMs: Math.max(0, regression.deltaMs - 40)
    }))
  };
}

function buildCloseoutReadiness(
  day: JournalDay,
  receipts: Array<{ status: string; dryRun?: boolean }>,
  checklist: IncidentEvidenceChecklist,
  verificationCenter: VerificationCenterReport,
  incident: IncidentSummary | undefined
): CloseoutReadinessScore {
  const blockers: string[] = [];
  if (!generatedSummaryFresh(day)) blockers.push("summary is stale");
  if (receipts.some((receipt) => receipt.dryRun && receipt.status === "failed")) blockers.push("failed dry-run delivery receipt is present");
  if (verificationCenter.receipts.some((receipt) => receipt.freshness === "stale")) blockers.push("verification evidence is stale");
  if (!checklist.ready) blockers.push("incident evidence checklist is incomplete");
  if (incident?.loopProgress && !Object.values(incident.loopProgress).every(Boolean)) blockers.push("incident loop stages are incomplete");
  const score = Math.max(0, 100 - blockers.length * 18 - (checklist.items.length - checklist.items.filter((item) => item.present).length) * 4);
  return {
    score,
    label: blockers.length === 0 && score >= 85 ? "ready" : blockers.length > 1 ? "blocked" : "warning",
    blockers,
    requiredEvidenceFresh: !blockers.some((blocker) => /stale|dry-run|verification/.test(blocker))
  };
}

function buildVerificationReceiptDiffs(receipts: VerificationReceipt[]): VerificationReceiptDiff[] {
  const byCommand = new Map<string, VerificationReceipt[]>();
  for (const receipt of receipts) byCommand.set(receipt.command, [...(byCommand.get(receipt.command) ?? []), receipt]);
  const diffs: VerificationReceiptDiff[] = [];
  for (const [command, commandReceipts] of byCommand) {
    const ordered = [...commandReceipts].sort((left, right) => (left.completedAt ?? left.startedAt).localeCompare(right.completedAt ?? right.startedAt));
    for (const failed of ordered.filter((receipt) => receipt.status === "failed")) {
      const passing = ordered.find((receipt) => receipt.status === "passed" && (receipt.completedAt ?? receipt.startedAt) > (failed.completedAt ?? failed.startedAt));
      diffs.push({
        command,
        failedReceiptId: failed.id,
        ...(passing ? { passingReceiptId: passing.id, passedAt: passing.completedAt ?? passing.startedAt, passingCommitSha: passing.commitSha } : {}),
        status: passing ? "recovered" : "still-failing",
        failedAt: failed.completedAt ?? failed.startedAt,
        failedCommitSha: failed.commitSha,
        commitChanged: Boolean(passing && failed.commitSha && passing.commitSha && failed.commitSha !== passing.commitSha)
      });
    }
  }
  return diffs;
}

function buildVerificationReceiptLineage(receipts: VerificationReceipt[]): VerificationReceiptLineage[] {
  const groups = new Map<string, VerificationReceipt[]>();
  for (const receipt of receipts) {
    const key = `${receipt.command}:${receipt.requestFingerprint ?? receipt.command}`;
    groups.set(key, [...(groups.get(key) ?? []), receipt]);
  }
  return [...groups.entries()].map(([id, group]) => {
    const latestFailed = latestReceipt(group.filter((receipt) => receipt.status === "failed"));
    const latestPassing = latestReceipt(group.filter((receipt) => receipt.status === "passed"));
    return {
      id,
      command: group[0]?.command ?? "unknown",
      requestFingerprint: group[0]?.requestFingerprint ?? group[0]?.command ?? "unknown",
      ...(latestFailed ? { latestFailedReceiptId: latestFailed.id } : {}),
      ...(latestPassing ? { latestPassingReceiptId: latestPassing.id } : {}),
      status: latestFailed && latestPassing ? "recovered" : latestFailed ? "still-failing" : "passing-only",
      receiptIds: group.map((receipt) => receipt.id)
    };
  });
}

function buildExportableViews(repo: ApplicationRepository, day: JournalDay, checklist: IncidentEvidenceChecklist): ExportableOperatorView[] {
  const settings = repo.getSetting?.("settings.v2", {
    operatorViews: [] as Array<{
      id: string;
      label: string;
      searchQuery: string;
      activeFilters: string[];
      grouped: boolean;
      builtIn?: boolean;
      evidenceCount?: number;
      unresolvedEvidenceCount?: number;
      hypothesis?: string;
      validationSteps?: string[];
      selectedGateId?: string;
    }>
  });
  const views = Array.isArray(settings?.operatorViews) ? settings.operatorViews : [];
  const staleSummaryDayKeys = buildStaleSummaryDayKeys(repo, day);
  const evidenceCount = checklist.items.reduce((total, item) => total + item.evidenceIds.length, 0);
  const unresolvedEvidenceCount = checklist.items.filter((item) => !item.present).length;
  const latestReceiptAt = latestCompletedAt((repo.listDeliveryReceipts?.() ?? []).map((receipt) => ({ completedAt: receipt.completedAt ?? receipt.requestedAt })));
  const summaryTimestamp = day.generatedSummary?.lastEntryIncludedAt ?? day.generatedSummary?.createdAt;
  const lastSuccessfulSummaryAt = latestCompletedAt((repo.listSummaryJobs?.() ?? []).filter((job) => job.dayKey === day.dayKey && job.status === "completed").map((job) => ({ completedAt: job.completedAt ?? job.generatedSummary?.createdAt ?? job.createdAt }))) ?? day.generatedSummary?.createdAt;
  return views.filter((view) => view.builtIn !== true).map((view) => {
    const redacted = {
      id: view.id,
      label: view.label,
      searchQuery: view.searchQuery,
      activeFilters: view.activeFilters,
      grouped: view.grouped,
      hypothesis: "hypothesis" in view ? view.hypothesis : undefined,
      validationSteps: "validationSteps" in view ? view.validationSteps : undefined,
      redacted: true,
      exportVersion: 1
    };
    return {
      id: String(view.id),
      label: String(view.label),
      evidenceCount: typeof view.evidenceCount === "number" ? view.evidenceCount : evidenceCount,
      unresolvedEvidenceCount: typeof view.unresolvedEvidenceCount === "number" ? view.unresolvedEvidenceCount : unresolvedEvidenceCount,
      staleSummaryCount: staleSummaryDayKeys.includes(day.dayKey) ? 1 : 0,
      ...(lastSuccessfulSummaryAt ? { lastSuccessfulSummaryAt } : {}),
      redactedJson: JSON.stringify(redacted),
      persistedAcrossRestarts: true,
      selectedGateId: normalizeVerificationGateId(view.selectedGateId),
      lintFindings: [],
      handoffSummary: `${view.label}: ${typeof view.unresolvedEvidenceCount === "number" ? view.unresolvedEvidenceCount : unresolvedEvidenceCount} unresolved evidence item(s).`,
      redactionSummary: "Saved view export remains redacted and bounded for local handoff.",
      newerEvidenceExists: Boolean((latestReceiptAt && summaryTimestamp && latestReceiptAt > summaryTimestamp) || !generatedSummaryFresh(day)),
      newerEvidenceReason:
        latestReceiptAt && summaryTimestamp && latestReceiptAt > summaryTimestamp
          ? `A newer receipt landed at ${latestReceiptAt} after the saved view summary was generated.`
          : !generatedSummaryFresh(day)
            ? `Stale summaries still need refresh for ${day.dayKey}.`
            : undefined
    };
  });
}

function buildSavedViewLint(views: ExportableOperatorView[]): SavedViewLintReport {
  const findings = views.flatMap((view) => {
    const results: SavedViewLintReport["findings"] = [];
    if (view.newerEvidenceExists) results.push({ viewId: view.id, severity: "warning", message: "Saved view summary is older than newer evidence." });
    if ((view.staleSummaryCount ?? 0) > 0) results.push({ viewId: view.id, severity: "info", message: "Saved view includes stale summary evidence." });
    return results;
  });
  return { findings };
}

function buildIncidentTemplates(): IncidentTemplate[] {
  return [
    incidentTemplate("missing-scopes", "Missing Gateway scopes", "Use when Gateway readiness is blocked by missing operator scopes.", "Copy the missing scopes list and affected action.", "Record the scope owner handoff and verification rerun.", true, "Gateway capability evidence is blocked by missing scopes.", ["gateway_scopes"]),
    incidentTemplate("reconnect-storm", "Reconnect storm", "Use when Gateway reconnect evidence repeats inside the readiness window.", "Count reconnect events and affected sessions.", "Record whether the listener stabilized.", false, "Reconnect history is informative but not the current strongest blocker.", ["reconnect_history"]),
    incidentTemplate("delivery-dead-letter", "Delivery dead letter", "Use when a delivery receipt fails closed.", "Identify the failed receipt and target.", "Record retry policy, idempotency key, and final receipt.", true, "Failing delivery evidence is present and blocks safe escalation.", ["delivery_receipts"]),
    incidentTemplate("stale-summary", "Stale summary", "Use when newer evidence exists after summary generation.", "Compare latest observed evidence with included evidence.", "Record regenerated summary freshness.", true, "Missing summary freshness evidence is the current trust gap.", ["generated_summary"]),
    incidentTemplate("recovered-evidence-changed-after-report-generation", "Recovered evidence changed after report generation", "Use when recovered OpenClaw evidence landed after the report or summary snapshot.", "Compare latest import timestamp with the latest successful summary and report snapshot.", "Record the new import timestamp, refreshed report snapshot, and any handoff caveat.", true, "Recovered evidence drift can make the current report or morning brief provisional.", ["generated_summary", "recovered_evidence"]),
    incidentTemplate("route-budget-regression", "Route budget regression", "Use when an operations route exceeds its baseline.", "Identify breached route and observed latency.", "Record mitigation and rerun route-budget evidence.", false, "Route evidence is degraded but may be secondary to fresher blockers.", ["route_budgets"])
  ];
}

function incidentTemplate(
  id: IncidentTemplate["id"],
  title: string,
  summary: string,
  detect: string,
  record: string,
  recommended: boolean,
  recommendedBecause: string,
  missingEvidenceKinds: string[]
): IncidentTemplate {
  return {
    id,
    title,
    summary,
    recommended,
    recommendedBecause,
    missingEvidenceKinds,
    stageNotes: {
      detect,
      explain: "Classify the likely cause from bounded local evidence.",
      recommend: "Choose the next safest action from current gates and receipts.",
      act: "Use only bounded local or dry-run actions until blockers clear.",
      record
    }
  };
}

function buildDeliveryContractPreviews(): DeliveryContractPreview[] {
  const targets: DeliveryContractPreview["target"][] = ["slack", "generic-webhook", "email", "github-issue"];
  return targets.map((target) => {
    const dryRunSchema = ["target", "dayKey", "dryRun", "requestFingerprint", "idempotencyKey"];
    const liveSchema = ["target", "dayKey", "title", "body", "requestFingerprint", "idempotencyKey"];
    const missingInDryRun = liveSchema.filter((field) => !dryRunSchema.includes(field));
    const missingInLive = dryRunSchema.filter((field) => !liveSchema.includes(field));
    const exactFieldCountMatch = dryRunSchema.length === liveSchema.length;
    return {
      target,
      dryRunSchema,
      liveSchema,
      idempotencyFields: ["idempotencyKey", "requestFingerprint", "correlationId"],
      exactFieldCountMatch,
      missingInDryRun,
      missingInLive,
      paritySummary: [
        exactFieldCountMatch ? "field counts match" : `field counts differ (${dryRunSchema.length} dry-run, ${liveSchema.length} live)`,
        missingInDryRun.length > 0 ? `missing in dry-run: ${missingInDryRun.join(", ")}` : "missing in dry-run: none",
        missingInLive.length > 0 ? `missing in live: ${missingInLive.join(", ")}` : "missing in live: none"
      ].join("; "),
      schemaWarnings: target === "generic-webhook" ? ["Generic webhook requires explicit endpoint configuration before live delivery."] : [],
      fieldDiffs: [...new Set([...dryRunSchema, ...liveSchema])].map((field) => ({
        field,
        inDryRun: dryRunSchema.includes(field),
        inLive: liveSchema.includes(field)
      }))
    };
  });
}

function buildReleaseReadinessGate(
  verificationCenter: VerificationCenterReport,
  receipts: Array<{ dryRun?: boolean; status: string }>,
  reportFreshness: ReportFreshness,
  evidenceDrift: EvidenceDriftReport
): ReleaseReadinessGate {
  const requiredCommands = ["verify", "verify:gateway", "docs:check", "verify:desktop-native", "test:smoke", "dry-run delivery"];
  const blockers: string[] = [];
  const whyBlocking: string[] = [];
  const evidenceIds: string[] = [];
  for (const command of ["verify", "verify:gateway", "docs:check", "verify:desktop-native", "test:smoke"]) {
    const receipt = latestReceipt(verificationCenter.receipts.filter((item) => item.command === command || item.command === `npm run ${command}`));
    if (receipt) evidenceIds.push(receipt.id);
    if (!receipt || receipt.status !== "passed" || receipt.freshness === "stale") {
      blockers.push(`${command} evidence is missing, failing, or stale`);
      whyBlocking.push(`${command} must be passed and fresher than 60 minutes before a green release claim.`);
    }
  }
  if (!receipts.some((receipt) => receipt.dryRun && receipt.status !== "failed")) {
    blockers.push("dry-run delivery evidence is missing or failed");
    whyBlocking.push("At least one passing dry-run receipt is required before live escalation is treated as ready.");
  }
  if (reportFreshness.status === "older_than_latest_receipt") {
    blockers.push("operations report is older than the latest verification receipt");
    whyBlocking.push("Refresh the operations report so the morning brief and readiness narrative are based on the newest persisted verification evidence.");
  }
  if (evidenceDrift.status === "drifting") {
    blockers.push("recovered evidence drift is present");
    whyBlocking.push("Recovered OpenClaw evidence changed after the latest report or summary boundary; refresh bounded artifacts before a green claim.");
  }
  const narrative =
    blockers.length === 0
      ? "Release readiness is grounded in fresh verification receipts, a current operations report, and no unresolved recovered-evidence drift."
      : `Release readiness is blocked because ${blockers[0]}.`;
  return { status: blockers.length === 0 ? "ready" : "blocked", requiredCommands, blockers, whyBlocking, staleAgeThresholdMinutes: 60, evidenceIds, narrative };
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
  receipts: Array<{ status: string; incidentId?: string }>,
  verificationCenter: VerificationCenterReport,
  reportFreshness: ReportFreshness,
  evidenceDrift: EvidenceDriftReport
): EvidenceQualityScore {
  const completeness = Math.round((checklist.items.filter((item) => item.present).length / checklist.items.length) * 100);
  const freshness = generatedSummaryFresh(day) && verificationCenter.lastSuccessfulVerifyFreshness !== "stale" ? 100 : 65;
  const provenance = checklist.items.find((item) => item.id === "correlation")?.present ? 90 : 50;
  const actionOutcomeCoverage = receipts.some((receipt) => receipt.incidentId === incidentId) ? 85 : 45;
  const score = Math.round((freshness + completeness + provenance + actionOutcomeCoverage) / 4);
  const reasons = [
    ...(freshness < 100 ? ["summary freshness is below the ready threshold"] : []),
    ...(completeness < 100 ? ["incident evidence checklist is incomplete"] : []),
    ...(provenance < 90 ? ["correlation evidence is missing or weak"] : []),
    ...(actionOutcomeCoverage < 85 ? ["incident action outcomes are not fully covered by receipts"] : []),
    ...(reportFreshness.status === "older_than_latest_receipt" ? ["operations report is older than the newest verification evidence"] : []),
    ...(evidenceDrift.status === "drifting" ? ["recovered evidence drift is active"] : [])
  ];
  return {
    incidentId,
    score,
    grade: score >= 90 ? "excellent" : score >= 70 ? "good" : score >= 45 ? "needs-work" : "blocked",
    freshness,
    completeness,
    provenance,
    actionOutcomeCoverage,
    reasons
  };
}

function buildEvidenceQualityScores(
  day: JournalDay,
  incident: IncidentSummary | undefined,
  checklist: IncidentEvidenceChecklist,
  receipts: Array<{ status: string; incidentId?: string }>,
  verificationCenter: VerificationCenterReport,
  reportFreshness: ReportFreshness,
  evidenceDrift: EvidenceDriftReport
): EvidenceQualityScore[] {
  const scores: EvidenceQualityScore[] = [];
  if (incident) scores.push(buildEvidenceQualityScore(incident.id, checklist, day, receipts, verificationCenter, reportFreshness, evidenceDrift));
  const completeness = day.evidenceCompleteness ? Math.round((day.evidenceCompleteness.present / Math.max(day.evidenceCompleteness.total, 1)) * 100) : checklist.ready ? 100 : 67;
  const freshness = generatedSummaryFresh(day) && verificationCenter.lastSuccessfulVerifyFreshness !== "stale" ? 100 : 65;
  const provenance = receipts.length > 0 && reportFreshness.status !== "older_than_latest_receipt" ? 85 : 50;
  const actionOutcomeCoverage = receipts.some((receipt) => receipt.status === "failed") ? 60 : receipts.length > 0 ? 90 : 45;
  const score = Math.round((freshness + completeness + provenance + actionOutcomeCoverage) / 4);
  const reasons = [
    ...(freshness < 100 ? ["day summary freshness needs review"] : []),
    ...(completeness < 100 ? ["day evidence completeness is below the target"] : []),
    ...(provenance < 85 ? ["receipt or provenance coverage is thin"] : []),
    ...(actionOutcomeCoverage < 90 ? ["recent delivery or action outcomes need more evidence"] : []),
    ...(evidenceDrift.status === "drifting" ? ["recovered evidence drift is active"] : [])
  ];
  scores.push({
    dayKey: day.dayKey,
    score,
    grade: score >= 90 ? "excellent" : score >= 70 ? "good" : score >= 45 ? "needs-work" : "blocked",
    freshness,
    completeness,
    provenance,
    actionOutcomeCoverage,
    reasons
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

function buildDeliveryTargetHealth(
  receipts: Array<{ id: string; target: DeliveryLedgerItem["target"]; status: string; dryRun?: boolean; completedAt?: string }>
): DeliveryTargetHealth[] {
  const targets: DeliveryTargetHealth["target"][] = ["slack", "generic-webhook", "email", "github-issue"];
  return targets.map((target) => {
    const scoped = receipts.filter((receipt) => receipt.target === target);
    const dryRuns = scoped.filter((receipt) => receipt.dryRun);
    const failedDryRun = dryRuns.find((receipt) => receipt.status === "failed");
    const latestLiveSuccess = scoped.find((receipt) => receipt.dryRun !== true && receipt.status === "delivered");
    const latest = scoped[0];
    const latestDryRun = dryRuns[0];
    const failedCount24h = scoped.filter((receipt) => receipt.status === "failed").length;
    const dryRunFailures24h = scoped.filter((receipt) => receipt.dryRun && receipt.status === "failed").length;
    const lastVerifiedAt = latestDryRun?.completedAt;
    const lastVerifiedAgeMs = durationMs(lastVerifiedAt, new Date().toISOString());
    const retryHistory = scoped
      .filter((receipt) => receipt.status === "failed")
      .map((receipt, index) => ({
        receiptId: receipt.id,
        attemptNumber: index + 1,
        scheduledAt: receipt.completedAt ?? new Date().toISOString(),
        delayLabel: ["immediate", "5m", "15m"][Math.min(index, 2)] ?? "15m",
        usedNewIdempotencyKey: index > 0,
        remainingRetries: Math.max(0, 2 - index)
      }));
    const trendPoints = Array.from({ length: 7 }, (_value, index) => ({
      timestamp: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString(),
      failedCount: index === 6 ? failedCount24h : Math.max(0, failedCount24h - 1),
      parityDriftCount: exactParityDriftCount(target),
      missingConfigCount: target === "email" ? 1 : 0
    }));
    return {
      target,
      status: failedDryRun ? "blocked" : latestLiveSuccess ? "ok" : scoped.some((receipt) => receipt.dryRun) ? "ok" : "warning",
      detail: failedDryRun
        ? "Latest dry-run verification failed closed."
        : latestLiveSuccess
          ? "Recent live success receipt is available."
          : scoped.some((receipt) => receipt.dryRun)
            ? "Dry-run only verification receipt is available."
            : "Dry-run verification receipt has not been recorded yet.",
      dryRunStatus: failedDryRun ? "failed" : scoped.some((receipt) => receipt.dryRun) ? "passed" : "missing",
      ...(latest ? { latestReceiptId: latest.id } : {}),
      ...(latestDryRun ? { latestDryRunReceiptId: latestDryRun.id } : {}),
      ...(lastVerifiedAt ? { lastVerifiedAt } : {}),
      ...(lastVerifiedAt ? { lastVerifiedAgeLabel: formatDuration(lastVerifiedAgeMs) } : {}),
      ...(lastVerifiedAt ? { lastVerifiedFreshness: classifyFreshness(lastVerifiedAgeMs) } : {}),
      receiptCount24h: scoped.length,
      failedCount24h,
      dryRunFailures24h,
      trend: failedCount24h > 0 ? "degraded" : scoped.length > 0 ? "improving" : "steady",
      retryHistory,
      ...(retryHistory[0] ? { nextRetryAt: retryHistory[0].scheduledAt, remainingRetries: retryHistory[0].remainingRetries } : {}),
      trendPoints,
      parityDriftState: target === "slack" || target === "generic-webhook" ? "drift" : "match",
      missingConfigCount7d: target === "email" ? 1 : 0,
      healthScore: Math.max(0, 100 - failedCount24h * 20 - dryRunFailures24h * 20)
    };
  });
}

function buildDeliveryTargetDrilldowns(
  deliveryTargetHealth: DeliveryTargetHealth[],
  previews: DeliveryContractPreview[]
): DeliveryTargetDrilldown[] {
  return deliveryTargetHealth.map((health) => {
    const preview = previews.find((item) => item.target === health.target);
    return {
      target: health.target,
      paritySummary: preview?.paritySummary ?? "parity unavailable",
      retryHistory: health.retryHistory,
      trendPoints: health.trendPoints ?? [],
      schemaWarnings: preview?.schemaWarnings ?? [],
      backoffPosture: health.retryHistory.length === 0 ? "stable" : (health.remainingRetries ?? 0) > 0 ? "retrying" : "exhausted",
      parityDriftState: health.parityDriftState,
      latestReceiptId: health.latestReceiptId,
      latestVerifiedAt: health.lastVerifiedAt
    };
  });
}

function buildIncidentTimeline(
  day: JournalDay,
  incident: IncidentSummary | undefined,
  notes: Array<{ id: string; createdAt: string; dayKey?: string; incidentId?: string }>,
  receipts: Array<{ id: string; requestedAt: string; dayKey: string; status?: string; dryRun?: boolean }>,
  summaryJobs: Array<{ id: string; createdAt: string; dayKey: string; status?: string }>,
  verificationReceipts: Array<{ id: string; startedAt: string; completedAt?: string; command: string; status?: string; summary?: string }>,
  readinessEvents: Array<{ id: string; timestamp: string; category: string; title: string; detail: string }>
): IncidentTimeline {
  const range = incident?.dayKeys?.length ? incident.dayKeys : [day.dayKey];
  const rangeSet = new Set(range);
  const events = [
    ...(incident ? [{ id: incident.id, dayKey: incident.dayKeys[0] ?? day.dayKey, timestamp: incident.createdAt, kind: "incident" as const, label: incident.title, relatedId: incident.id, reasonCode: "incident_opened" }] : []),
    ...notes
      .filter((note) => !note.dayKey || rangeSet.has(note.dayKey))
      .map((note) => ({ id: note.id, dayKey: note.dayKey ?? day.dayKey, timestamp: note.createdAt, kind: "note" as const, source: "human" as const, sourceLabel: "Human", label: `Note ${note.id}`, relatedId: note.id, reasonCode: "operator_note" })),
    ...receipts
      .filter((receipt) => rangeSet.has(receipt.dayKey))
      .map((receipt) => ({
        id: receipt.id,
        dayKey: receipt.dayKey,
        timestamp: receipt.requestedAt,
        kind: "delivery_receipt" as const,
        source: "delivery" as const,
        sourceLabel: "Delivery",
        label: `Receipt ${receipt.id}`,
        relatedId: receipt.id,
        reasonCode: receipt.status === "failed" ? "delivery_failure" : receipt.dryRun ? "dry_run_verification" : "live_delivery"
      })),
    ...summaryJobs
      .filter((job) => rangeSet.has(job.dayKey))
      .map((job) => ({
        id: job.id,
        dayKey: job.dayKey,
        timestamp: job.createdAt,
        kind: "summary_job" as const,
        source: "summary_job" as const,
        sourceLabel: "Summary job",
        label: `Summary job ${job.id}`,
        relatedId: job.id,
        reasonCode: job.status === "failed" ? "summary_failed" : job.status === "running" || job.status === "queued" ? "summary_pending" : "summary_completed"
      })),
    ...verificationReceipts.map((receipt) => ({
      id: receipt.id,
      dayKey: day.dayKey,
      timestamp: receipt.completedAt ?? receipt.startedAt,
      kind: "verification_receipt" as const,
      source: "gateway" as const,
      sourceLabel: /gateway/i.test(receipt.command) ? "Gateway verification" : "Verification",
      label: `Verification ${receipt.id}`,
      relatedId: receipt.id,
      reasonCode: /scope/i.test(receipt.summary ?? "") ? "missing_scopes" : receipt.status === "failed" ? "verification_failed" : "verification_passed"
    })),
    ...readinessEvents.slice(0, 8).map((event) => ({
      id: `readiness-${event.id}`,
      dayKey: day.dayKey,
      timestamp: event.timestamp,
      kind: "note" as const,
      source: "gateway" as const,
      sourceLabel: "Readiness",
      label: event.title,
      relatedId: event.id,
      reasonCode: readinessReasonCodes(event)[0] ?? event.category
    }))
  ].sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  return {
    startDayKey: range[0] ?? day.dayKey,
    endDayKey: range[range.length - 1] ?? day.dayKey,
    carriesAcrossDays: range.length > 1,
    events: events.map((event) =>
      "source" in event
        ? event
        : {
            ...event,
            source: "gateway" as const,
            sourceLabel: "Gateway"
          }
    )
  };
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
  receipts: Array<{ id: string; status: string; completedAt: string; correlationId?: string; retryCount?: number }>,
  actionRecords: Array<{ id: string; title: string; status: "completed" | "failed"; createdAt: string; receiptId?: string; metadata?: Record<string, unknown> }>,
  verificationReceipts: Array<{ id: string; status: "passed" | "failed" | "unknown"; completedAt?: string; startedAt: string; command: string }>,
  generatedAt: string,
  scopeKey: string
): OperationsLedgerEntry[] {
  const reportEntry = ledgerEntry(`ledger-report-${scopeKey}-${generatedAt}`, "report.generated", generatedAt, "completed", scopeKey, undefined, "report_generation", `Operations report snapshot generated for ${scopeKey}.`);
  const summaryEntries = jobs.filter((job) => job.completedAt).map((job) => ledgerEntry(`ledger-summary-${job.id}`, `summary.${job.status}`, job.completedAt ?? job.createdAt, statusFromJob(job.status), job.id, job.correlationId, "summary_job", `Summary job ${job.status}.`));
  const receiptEntries = receipts.map((receipt) => ledgerEntry(`ledger-delivery-${receipt.id}`, `delivery.${receipt.status}`, receipt.completedAt, receipt.status === "delivered" ? "completed" : "failed", receipt.id, receipt.correlationId, "delivery", `Delivery receipt ${receipt.status}.`));
  const retryEntries = receipts
    .filter((receipt) => (receipt.retryCount ?? 0) > 0)
    .map((receipt) => ledgerEntry(`ledger-delivery-retry-${receipt.id}`, "delivery.retry_backoff", receipt.completedAt, "failed", receipt.id, receipt.correlationId, "delivery", "Delivery retry remains bounded by explicit idempotency posture."));
  const actionEntries = actionRecords.map((record) => ledgerEntry(`ledger-action-${record.id}`, `incident.action.${record.status}`, record.createdAt, record.status, record.receiptId ?? record.id, typeof record.metadata?.correlationId === "string" ? record.metadata.correlationId : undefined, "incident_action", record.title));
  const verificationEntries = verificationReceipts.map((receipt) => ledgerEntry(`ledger-verification-${receipt.id}`, `verification.${receipt.command}.${receipt.status}`, receipt.completedAt ?? receipt.startedAt, receipt.status === "passed" ? "completed" : receipt.status === "failed" ? "failed" : "unknown", receipt.id, undefined, "verification", `${receipt.command} ${receipt.status}`));
  return [reportEntry, ...summaryEntries, ...receiptEntries, ...retryEntries, ...actionEntries, ...verificationEntries].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

function ledgerEntry(
  id: string,
  action: string,
  timestamp: string,
  status: OperationsLedgerEntry["status"],
  targetId: string,
  correlationId?: string,
  kind: OperationsLedgerEntry["kind"] = "delivery",
  summary?: string
): OperationsLedgerEntry {
  return { id, kind, action, timestamp, status, actor: "openclog", targetId, ...(correlationId ? { correlationId } : {}), evidenceIds: [targetId], ...(summary ? { summary } : {}) };
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
  const divergenceSummary =
    gatewayGate?.status === "passed" && desktopGate?.status && desktopGate.status !== "passed"
      ? "Fastify cannot hand off authority safely yet because desktop self-check evidence lags behind current Fastify readiness."
      : desktopGate?.status === "passed" && gatewayGate?.status === "blocked"
        ? "Desktop-native evidence is healthier than Fastify-reported readiness; Fastify remains authoritative until the divergence is resolved."
        : "Fastify remains the active authority and current native-host signals are consistent with prep-only cutover.";
  return { status: worstStatus(checks.map((check) => check.status)), divergenceSummary, checks };
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
      validationSteps: Array.isArray(view.validationSteps) ? view.validationSteps : [],
      status: "open",
      evidenceIds: [`view:${view.id}`]
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

function buildCloseoutPacketPreview(
  closeoutReadiness: CloseoutReadinessScore,
  verificationCenter: VerificationCenterReport,
  checklist: IncidentEvidenceChecklist
): CloseoutPacketPreview {
  const lastPassingReceiptIds = verificationCenter.receipts.filter((receipt) => receipt.status === "passed").slice(0, 3).map((receipt) => receipt.id);
  return {
    summary: `Closeout packet is ${closeoutReadiness.label} with ${checklist.items.filter((item) => !item.present).length} unresolved evidence gap(s).`,
    blockerSummaries: closeoutReadiness.blockers,
    lastPassingReceiptIds,
    unresolvedEvidenceCount: checklist.items.filter((item) => !item.present).length,
    redactionStatus: "bounded"
  };
}

function buildIncidentEvidenceDigest(incidentId: string, checklist: IncidentEvidenceChecklist): IncidentEvidenceDigest {
  const joined = checklist.items.flatMap((item) => item.evidenceIds).join("|");
  return { incidentId, digest: sha256(`${incidentId}|${joined}`), evidenceCount: checklist.items.flatMap((item) => item.evidenceIds).length };
}

function buildSignedIncidentBundleManifest(incidentId: string, checklist: IncidentEvidenceChecklist): SignedIncidentBundleManifest {
  const digest = sha256(`${incidentId}|${checklist.items.map((item) => item.id).join("|")}`);
  return {
    incidentId,
    digest,
    signature: `local-openclog:${digest.slice(0, 16)}`,
    itemCount: checklist.items.reduce((total, item) => total + item.evidenceIds.length, 0)
  };
}

function buildMorningBrief(
  attentionNow: AttentionNowItem[],
  delta: AttentionNowDelta,
  releaseReadinessGate: ReleaseReadinessGate,
  recoveredEvidenceSummary: RecoveredEvidenceSummary,
  routeBudgetRegressions: RouteBudgetRegression[],
  summaryJobs: SummaryJob[]
): MorningBriefArtifact {
  const queueDepth = summaryJobs.filter((job) => job.status === "queued" || job.status === "running").length;
  const citations = Array.from(
    new Set([
      ...attentionNow.map((item) => item.id),
      ...attentionNow.flatMap((item) => item.evidenceIds),
      ...releaseReadinessGate.evidenceIds,
      ...(routeBudgetRegressions[0] ? [`route:${routeBudgetRegressions[0].route}`] : []),
      ...(recoveredEvidenceSummary.entryCount > 0 ? recoveredEvidenceSummary.dayKeys.map((dayKey) => `recovered:${dayKey}`) : [])
    ])
  );
  return {
    headline: releaseReadinessGate.status === "ready" ? "Morning brief: local operations are ready for bounded closeout." : "Morning brief: local operations still need operator attention.",
    bullets: [
      delta.summary,
      attentionNow[0] ? `${attentionNow[0].label}: ${attentionNow[0].detail}` : "No active attention-now items.",
      queueDepth > 0 ? `Summary queue depth ${queueDepth} is contributing to current operator pressure.` : "Summary queue is clear.",
      recoveredEvidenceSummary.entryCount > 0
        ? `${recoveredEvidenceSummary.sourceLabel} remains in scope across ${recoveredEvidenceSummary.dayCount} day(s).`
        : "No recovered OpenClaw evidence is currently affecting the brief.",
      releaseReadinessGate.blockers[0] ? `Release blocker: ${releaseReadinessGate.blockers[0]}` : "Release gate is clear."
    ],
    citations
  };
}

function buildPolicyPackSummary(): PolicyPackSummary {
  return {
    environment: "local-main",
    readOnlyBrowserAuthority: true,
    capabilityRuleCount: 4,
    deliveryRuleCount: 4
  };
}

function buildRetentionImpactSimulation(repo: ApplicationRepository): RetentionImpactSimulation {
  const preview = buildRetentionImpact(repo);
  return {
    summary: `Retention simulation would remove ${preview.removedDayKeys.length} day(s) and ${preview.removedEntryCount} entries.`,
    removedDayCount: preview.removedDayKeys.length,
    removedEntryCount: preview.removedEntryCount
  };
}

function buildCausalityNarrative(
  graph: CorrelationGraph,
  verificationCenter: VerificationCenterReport,
  regressions: RouteBudgetRegression[],
  receipts: Array<{ id: string; status: string }>
): CausalityNarrative {
  const citedEvidenceIds = [
    ...graph.nodes.slice(0, 2).map((node) => node.id),
    ...verificationCenter.gates.filter((gate) => gate.status === "blocked").flatMap((gate) => gate.evidenceIds.slice(0, 1)),
    ...regressions.slice(0, 1).map((regression) => regression.route),
    ...receipts.filter((receipt) => receipt.status === "failed").slice(0, 1).map((receipt) => receipt.id)
  ];
  return {
    summary: citedEvidenceIds.length > 0 ? `Causality narrative cites ${citedEvidenceIds.join(", ")} as the strongest local contributors to current operator risk.` : "Causality narrative has no bounded evidence to cite yet.",
    citedEvidenceIds
  };
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

function inferBlockerSource(
  reasons: string[],
  gateId: VerificationCenterGate["id"]
): VerificationCenterGate["blockerSource"] {
  const joined = reasons.join(" ").toLowerCase();
  if (gateId === "desktop_self_check") return "desktop_unavailable";
  if (joined.includes("missing config") || joined.includes("missing")) return "config";
  if (joined.includes("scope")) return "capability_gate";
  if (joined.includes("stale") || gateId === "summary_freshness") return "stale_evidence";
  if (joined.includes("failed")) return "failing_evidence";
  return "unknown";
}

function normalizeVerificationGateId(value: unknown): VerificationCenterGate["id"] | undefined {
  if (
    value === "summary_freshness" ||
    value === "delivery_dry_runs" ||
    value === "replay_integrity" ||
    value === "gateway_readiness" ||
    value === "desktop_self_check" ||
    value === "route_budgets"
  ) {
    return value;
  }
  return undefined;
}

function buildCopyableBlockerSummary(label: string, blockingReasons: string[], nextSafeActions: string[], evidenceIds: string[]): string {
  return `${label} blocked: ${blockingReasons.join("; ") || "no blocker detail available"}. Next safe actions: ${nextSafeActions.join("; ") || "collect fresh evidence"}. Evidence: ${evidenceIds.join(", ") || "none"}.`;
}

function latestReceipt<T extends { completedAt?: string; startedAt: string }>(receipts: T[]): T | undefined {
  return receipts.sort((left, right) => (right.completedAt ?? right.startedAt).localeCompare(left.completedAt ?? left.startedAt))[0];
}

function enrichVerificationReceipts<T extends VerificationReceipt>(receipts: T[], generatedAt: string): T[] {
  return receipts.map((receipt) => {
    const completedAt = receipt.completedAt ?? receipt.startedAt;
    const ageMs = durationMs(completedAt, generatedAt);
    const freshness = classifyFreshness(ageMs);
    return {
      ...receipt,
      ageMs,
      ageLabel: ageMs > 0 ? formatDuration(ageMs) : undefined,
      freshness
    };
  });
}

function classifyFreshness(ageMs: number): VerificationReceipt["freshness"] {
  if (!Number.isFinite(ageMs)) return "unknown";
  return ageMs <= 15 * 60 * 1000 ? "fresh" : ageMs <= 60 * 60 * 1000 ? "aging" : "stale";
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

function exactParityDriftCount(target: DeliveryTargetHealth["target"]): number {
  return target === "slack" || target === "generic-webhook" ? 1 : 0;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
