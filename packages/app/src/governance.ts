import type { ApplicationRepository, PaginatedListResult } from "./contracts.js";
import { latestEntryAt, paginateItems, requireMethod, sortByTimestamp } from "./utils.js";

export function buildGovernanceModule(repo: ApplicationRepository) {
  return {
    getBackendFingerprint() {
      return requireMethod(repo.getBackendFingerprint, "getBackendFingerprint")();
    },
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
    },
    completeCloseout({ dayKey, exportTargets }: { dayKey: string; exportTargets: string[] }) {
      return requireMethod(repo.completeCloseout, "completeCloseout")(dayKey, exportTargets);
    },
    listVerificationReceipts() {
      const generatedAt = new Date().toISOString();
      return requireMethod(repo.listVerificationReceipts, "listVerificationReceipts")().map((receipt) => {
        const completedAt = receipt.completedAt ?? receipt.startedAt;
        const ageMs = verificationDurationMs(completedAt, generatedAt);
        return {
          ...receipt,
          ageMs,
          ageLabel: ageMs > 0 ? formatVerificationAge(ageMs) : undefined,
          freshness: ageMs <= 15 * 60 * 1000 ? "fresh" : ageMs <= 60 * 60 * 1000 ? "aging" : "stale"
        };
      });
    },
    createInvestigationWorkspace(input: { dayKeys: string[]; title?: string }) {
      return requireMethod(repo.createInvestigationWorkspace, "createInvestigationWorkspace")(input);
    },
    getInvestigationWorkspace({ id }: { id: string }) {
      const workspace = requireMethod(repo.getInvestigationWorkspace, "getInvestigationWorkspace")(id);
      if (!workspace) throw new Error(`investigation_workspace_not_found:${id}`);
      return workspace;
    },
    getRemoteOpsPolicy() {
      return requireMethod(repo.getRemoteOpsPolicy, "getRemoteOpsPolicy")();
    }
  };
}

function verificationDurationMs(start: string | undefined, end: string | undefined): number {
  if (!start || !end) return 0;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  return Math.max(0, endMs - startMs);
}

function formatVerificationAge(durationMsValue: number): string {
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
