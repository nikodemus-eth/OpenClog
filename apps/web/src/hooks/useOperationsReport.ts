import type { OperationsBacklogReport } from "@openclog/core";

export function normalizeOperationsReport(report: OperationsBacklogReport): OperationsBacklogReport {
  return {
    ...report,
    recoveredEvidenceSummary: report.recoveredEvidenceSummary
      ? {
          ...report.recoveredEvidenceSummary,
          dayKeys: report.recoveredEvidenceSummary.dayKeys ?? [],
          provisionalMetrics: report.recoveredEvidenceSummary.provisionalMetrics ?? false
        }
      : report.recoveredEvidenceSummary,
    summaryJobHistory: {
      ...report.summaryJobHistory,
      jobs: report.summaryJobHistory.jobs.map((job) => ({
        ...job,
        requestedBy: job.requestedBy ?? "unknown",
        reusedExistingJob: job.reusedExistingJob ?? false
      })),
      dedupedDayKeys: report.summaryJobHistory.dedupedDayKeys ?? []
    },
    attentionNowDelta: report.attentionNowDelta ?? {
      summary: "No attention delta available yet.",
      metrics: []
    },
    routeBudgetBurnReport: report.routeBudgetBurnReport ?? {
      generatedAt: report.generatedAt,
      items: []
    },
    verificationReceiptLineage: report.verificationReceiptLineage ?? [],
    readinessHistory: {
      ...report.readinessHistory,
      points: report.readinessHistory.points.map((point) => ({
        ...point,
        reasonCodes: point.reasonCodes ?? []
      }))
    },
    exportableViews: report.exportableViews.map((view) => ({
      ...view,
      lintFindings: view.lintFindings ?? [],
      lastSuccessfulSummaryAt: view.lastSuccessfulSummaryAt
    })),
    savedViewLint: report.savedViewLint ?? {
      findings: []
    },
    incidentTemplates: report.incidentTemplates.map((template) => ({
      ...template,
      recommended: template.recommended ?? false,
      missingEvidenceKinds: template.missingEvidenceKinds ?? []
    })),
    deliveryContractPreviews: report.deliveryContractPreviews.map((preview) => ({
      ...preview,
      fieldDiffs: preview.fieldDiffs ?? []
    })),
    deliveryTargetHealth: report.deliveryTargetHealth.map((item) => ({
      ...item,
      retryHistory: item.retryHistory ?? [],
      trendPoints: item.trendPoints ?? []
    })),
    deliveryTargetDrilldowns:
      report.deliveryTargetDrilldowns ??
      report.deliveryTargetHealth.map((item) => ({
        target: item.target,
        paritySummary: "Dry-run/live parity snapshot unavailable from the current report payload.",
        retryHistory: item.retryHistory ?? [],
        trendPoints: item.trendPoints ?? [],
        schemaWarnings: []
      })),
    incidentTimeline: {
      ...report.incidentTimeline,
      carriesAcrossDays: report.incidentTimeline.carriesAcrossDays ?? false,
      events: report.incidentTimeline.events.map((event) => ({
        ...event,
        reasonCode: event.reasonCode
      }))
    },
    verificationCenter: {
      ...report.verificationCenter,
      gates: report.verificationCenter.gates.map((gate) => ({
        ...gate,
        agingSoon: gate.agingSoon ?? false,
        blockingReasons: gate.blockingReasons ?? [],
        nextSafeActions: gate.nextSafeActions ?? [],
        evidenceIds: gate.evidenceIds ?? []
      }))
    },
    closeoutPacketPreview: report.closeoutPacketPreview ?? {
      summary: "Closeout packet preview unavailable from current local evidence.",
      blockerSummaries: [],
      lastPassingReceiptIds: [],
      unresolvedEvidenceCount: 0,
      redactionStatus: "bounded"
    },
    morningBrief: report.morningBrief ?? {
      headline: "Morning brief unavailable.",
      bullets: [],
      citations: []
    },
    savedViewAudit: report.savedViewAudit ?? {
      events: [],
      summary: "Saved-view audit is unavailable."
    },
    morningCommand: report.morningCommand ?? {
      headline: "Morning command unavailable.",
      steps: []
    },
    governedSdkManifests: report.governedSdkManifests.map((manifest) => ({
      ...manifest,
      permissions: manifest.permissions ?? [],
      failureModes: manifest.failureModes ?? []
    })),
    evidenceQualityScores: report.evidenceQualityScores.map((score) => ({
      ...score,
      reasons: score.reasons ?? []
    })),
    policyPackSummary: report.policyPackSummary ?? {
      environment: "local",
      readOnlyBrowserAuthority: true,
      capabilityRuleCount: 0,
      deliveryRuleCount: 0
    },
    nativeTruthMonitor: {
      ...report.nativeTruthMonitor,
      divergenceSummary: report.nativeTruthMonitor.divergenceSummary ?? ""
    },
    retentionImpactSimulation: report.retentionImpactSimulation ?? {
      summary: "Retention impact simulation unavailable.",
      removedDayCount: 0,
      removedEntryCount: 0
    },
    activeHypotheses: report.activeHypotheses.map((hypothesis) => ({
      ...hypothesis,
      status: hypothesis.status ?? "open",
      validationSteps: hypothesis.validationSteps ?? [],
      evidenceIds: hypothesis.evidenceIds ?? []
    })),
    causalityNarrative: report.causalityNarrative ?? {
      summary: "Causality narrative unavailable.",
      citedEvidenceIds: []
    },
    releaseReadinessGate: {
      ...report.releaseReadinessGate,
      blockers: report.releaseReadinessGate.blockers ?? [],
      whyBlocking: report.releaseReadinessGate.whyBlocking ?? [],
      staleAgeThresholdMinutes: report.releaseReadinessGate.staleAgeThresholdMinutes ?? 0,
      evidenceIds: report.releaseReadinessGate.evidenceIds ?? [],
      narrative: report.releaseReadinessGate.narrative ?? "Release readiness narrative unavailable."
    }
  };
}

export function describeReportFreshness(report: OperationsBacklogReport | null): string | null {
  if (!report) return null;
  if (report.reportFreshness.status === "newer_than_latest_receipt") return "Report freshness: newer than latest verification receipt";
  if (report.reportFreshness.status === "older_than_latest_receipt") return "Report freshness: older than latest verification receipt";
  return "Report freshness: no verification receipts yet";
}

export function describeRecoveredEvidenceProvisional(report: OperationsBacklogReport | null): string | null {
  if (!report?.recoveredEvidenceSummary?.provisionalMetrics) return null;
  return report.recoveredEvidenceSummary.provisionalReason ?? report.recoveredEvidenceSummary.cacheStateLabel ?? "Recovered evidence totals are provisional.";
}

export function findLatestSmokeReceipt(report: OperationsBacklogReport | null) {
  return report?.verificationCenter.receipts.find((receipt) => receipt.command === "test:smoke" || receipt.command === "npm run test:smoke");
}
