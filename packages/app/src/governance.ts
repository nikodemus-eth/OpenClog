import type { ApplicationRepository, PaginatedListResult } from "./contracts.js";
import { latestEntryAt, paginateItems, requireMethod, sortByTimestamp } from "./utils.js";

export function buildGovernanceModule(repo: ApplicationRepository) {
  return {
    getLineage({ entryId }: { entryId: string }) {
      const lineage = requireMethod(repo.getLineage, "getLineage")(entryId);
      if (!lineage) throw new Error(`lineage_not_found:${entryId}`);
      return lineage;
    },
    listSummaryProfiles() {
      return requireMethod(repo.listSummaryProfiles, "listSummaryProfiles")();
    },
    generateSummaryProfile({ profileId, dayKey }: { profileId: "default-operator" | "escalation" | "export"; dayKey: string }) {
      return requireMethod(repo.generateSummaryProfile, "generateSummaryProfile")(profileId, dayKey);
    },
    runIntegrityMonitor() {
      return requireMethod(repo.runIntegrityMonitor, "runIntegrityMonitor")();
    },
    listIntegrityReports() {
      return requireMethod(repo.listIntegrityReports, "listIntegrityReports")();
    },
    getAnalytics() {
      return requireMethod(repo.getAnalytics, "getAnalytics")();
    },
    buildMissionReplay({ incidentId }: { incidentId: string }) {
      return requireMethod(repo.buildMissionReplay, "buildMissionReplay")(incidentId);
    },
    buildCorrelationGraph({ incidentId }: { incidentId: string }) {
      return requireMethod(repo.buildCorrelationGraph, "buildCorrelationGraph")(incidentId);
    },
    listHealthTimeline({ limit = 10, cursor }: { limit?: number; cursor?: string } = {}) {
      return paginateItems(requireMethod(repo.listHealthTimeline, "listHealthTimeline")(Math.max(limit * 3, 30)), limit, cursor);
    },
    getHealthAggregate(limit = 20) {
      return requireMethod(repo.getHealthAggregate, "getHealthAggregate")(limit);
    },
    listIncidentActionRecords({
      incidentId,
      cursor,
      limit = 20,
      sort = "createdAt:desc"
    }: {
      incidentId?: string;
      cursor?: string;
      limit?: number;
      sort?: "createdAt:asc" | "createdAt:desc" | "status:asc" | "status:desc";
    } = {}): PaginatedListResult<ReturnType<NonNullable<ApplicationRepository["listIncidentActionRecords"]>>[number]> {
      const records = requireMethod(repo.listIncidentActionRecords, "listIncidentActionRecords")({ incidentId });
      const sorted =
        sort === "createdAt:asc"
          ? sortByTimestamp(records, "createdAt", "asc")
          : sort === "status:asc"
            ? [...records].sort((left, right) => left.status.localeCompare(right.status) || right.createdAt.localeCompare(left.createdAt))
            : sort === "status:desc"
              ? [...records].sort((left, right) => right.status.localeCompare(left.status) || right.createdAt.localeCompare(left.createdAt))
              : sortByTimestamp(records, "createdAt", "desc");
      return paginateItems(sorted, limit, cursor);
    },
    listHealthHistory(limit = 5) {
      return requireMethod(repo.listHealthHistory, "listHealthHistory")(limit);
    },
    getSloSnapshot() {
      return requireMethod(repo.getSloSnapshot, "getSloSnapshot")();
    },
    generateOperatorRunbook() {
      return requireMethod(repo.generateOperatorRunbook, "generateOperatorRunbook")();
    },
    createSummaryJob(dayKey: string) {
      return requireMethod(repo.createSummaryJob, "createSummaryJob")(dayKey);
    },
    getSummaryJob(jobId: string) {
      return requireMethod(repo.getSummaryJob, "getSummaryJob")(jobId);
    },
    buildCloseoutPlan({
      dayKey,
      keepDays,
      exportTargets
    }: {
      dayKey: string;
      keepDays: number;
      exportTargets: string[];
    }) {
      const day = requireMethod(repo.getDay, "getDay")(dayKey);
      if (!day) throw new Error(`day_not_found:${dayKey}`);
      const retentionPreview = requireMethod(repo.previewRetention, "previewRetention")({
        keepDays,
        includeAudit: true,
        includeRedactedEvents: true,
        includeSummaries: true
      });
      const incidents = requireMethod(repo.listIncidents, "listIncidents")().filter((incident) => incident.dayKeys.includes(dayKey));
      const notes = requireMethod(repo.listInvestigationNotes, "listInvestigationNotes")({ dayKey });
      const summaryFresh = Boolean(day.generatedSummary && latestEntryAt(day.entries) <= day.generatedSummary.createdAt);
      return {
        dayKey,
        generatedSummaryFresh: summaryFresh,
        retentionPreview,
        incidentCount: incidents.length,
        noteCount: notes.length,
        exportTargets,
        checklist: [
          summaryFresh ? "Generated summary is current." : "Regenerate the day summary before closing out.",
          incidents.length > 0 ? `${incidents.length} incident record(s) ready for review.` : "Capture an incident snapshot if this day needs escalation.",
          notes.length > 0 ? `${notes.length} investigation note(s) recorded.` : "Add at least one operator investigation note.",
          `Retention preview would remove ${retentionPreview.removedDayKeys.length} day(s).`,
          exportTargets.length > 0 ? `Prepare exports for ${exportTargets.join(", ")}.` : "Select export targets before handoff."
        ]
      };
    }
  };
}
