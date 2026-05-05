import type {
  AlertFinding,
  AlertRule,
  AnalyticsSnapshot,
  CloseoutPlan,
  CorrelationGraph,
  DeliveryReceipt,
  GeneratedProfileSummary,
  IncidentWorkspace,
  IntegrityMonitorReport,
  InvestigationNote,
  IntegrationPayload,
  LineageRecord,
  MissionReplay,
  OpenClogSettings,
  PluginExecutionResult,
  PluginManifest,
  ReplayBundleDiff,
  RetentionClass,
  RetentionClassPreview,
  RetentionPolicy,
  ServiceHealthTimelineEntry,
  SummaryProfile
} from "@openclog/core";
import { buildIncidentWorkspace, executeIncidentAction } from "./incident-loop.js";
import type {
  AlertStateRecord,
  ApplicationRepository,
  PaginatedListResult,
  PaginatedSearchResult,
  PaginatedSessionDrilldown,
  RetentionSnapshotRecord,
  UpdateSettingsInput
} from "./contracts.js";
import { getSettings, updateSettings } from "./settings.js";
import {
  buildBundleEntryMetadata,
  classifyReplayBundleDiff,
  diffRecordKeys,
  latestEntryAt,
  paginateItems,
  requireMethod,
  titleCase
} from "./utils.js";

export * from "./contracts.js";

export function createOpenClogApplication({ repo }: { repo: ApplicationRepository }) {
  return {
    searchEntries({ query, limit = 50, cursor }: { query: string; limit?: number; cursor?: string }): PaginatedSearchResult {
      const results = requireMethod(repo.searchEntries, "searchEntries")(query);
      return paginateItems(results, limit, cursor);
    },
    getSessionDrilldown({
      sessionKey,
      limit = 100,
      cursor
    }: {
      sessionKey: string;
      limit?: number;
      cursor?: string;
    }): PaginatedSessionDrilldown {
      const drilldown = requireMethod(repo.getDrilldown, "getDrilldown")(sessionKey);
      const page = paginateItems(drilldown.entries, limit, cursor);
      return { ...drilldown, entries: page.items, nextCursor: page.nextCursor };
    },
    getSettings(): OpenClogSettings {
      return getSettings(repo);
    },
    updateSettings(input: UpdateSettingsInput): OpenClogSettings {
      return updateSettings(repo, input);
    },
    applyRetention(policy: RetentionPolicy): RetentionSnapshotRecord {
      const preview = requireMethod(repo.previewRetention, "previewRetention")(policy);
      const days = requireMethod(repo.listDays, "listDays")()
        .map((day) => requireMethod(repo.getDay, "getDay")(day.dayKey))
        .filter((day): day is NonNullable<typeof day> => day !== null);
      const snapshot: RetentionSnapshotRecord = {
        id: `retention-${Date.now()}`,
        createdAt: new Date().toISOString(),
        preview,
        days
      };
      requireMethod(repo.saveRetentionSnapshot, "saveRetentionSnapshot")(snapshot);
      requireMethod(repo.deleteDays, "deleteDays")(preview.removedDayKeys);
      return snapshot;
    },
    rollbackRetention(snapshotId: string): { restoredDayKeys: string[] } {
      const snapshot = requireMethod(repo.getRetentionSnapshot, "getRetentionSnapshot")(snapshotId);
      if (!snapshot) throw new Error(`retention_snapshot_not_found:${snapshotId}`);
      requireMethod(repo.restoreRetentionSnapshot, "restoreRetentionSnapshot")(snapshot);
      return { restoredDayKeys: requireMethod(repo.listDays, "listDays")().map((day) => day.dayKey) };
    },
    listRetentionClasses(): RetentionClass[] {
      return requireMethod(repo.listRetentionClasses, "listRetentionClasses")();
    },
    saveRetentionClass({ id, keepDays, includeRollback = true }: { id: RetentionClass["id"]; keepDays: number; includeRollback?: boolean }): RetentionClass {
      const current = requireMethod(repo.listRetentionClasses, "listRetentionClasses")().find((item) => item.id === id);
      return requireMethod(repo.saveRetentionClass, "saveRetentionClass")({
        id,
        label: current?.label ?? titleCase(id.replaceAll("_", " ")),
        description: current?.description ?? `${titleCase(id.replaceAll("_", " "))} retention policy.`,
        policy: { keepDays, includeRollback },
        updatedAt: new Date().toISOString()
      });
    },
    previewRetentionByClass(): RetentionClassPreview[] {
      return requireMethod(repo.previewRetentionByClass, "previewRetentionByClass")();
    },
    acknowledgeAlert({ ruleId, acknowledgedAt }: { ruleId: string; acknowledgedAt: string }): AlertStateRecord {
      const current = requireMethod(repo.getAlertState, "getAlertState")(ruleId);
      return requireMethod(repo.setAlertState, "setAlertState")(ruleId, { ...current, ruleId, acknowledgedAt });
    },
    snoozeAlert({ ruleId, snoozedUntil }: { ruleId: string; snoozedUntil: string }): AlertStateRecord {
      const current = requireMethod(repo.getAlertState, "getAlertState")(ruleId);
      return requireMethod(repo.setAlertState, "setAlertState")(ruleId, { ...current, ruleId, snoozedUntil });
    },
    listAlerts({ dayKey }: { dayKey: string }): { rules: AlertRule[]; findings: Array<AlertFinding & AlertStateRecord> } {
      const rules = requireMethod(repo.listAlertRules, "listAlertRules")();
      const findings = requireMethod(repo.evaluateAlertRules, "evaluateAlertRules")(dayKey).map((finding) => ({
        ...finding,
        ...(requireMethod(repo.getAlertState, "getAlertState")(finding.ruleId) ?? { ruleId: finding.ruleId })
      }));
      return { rules, findings };
    },
    saveInvestigationNote({
      dayKey,
      incidentId,
      sessionKey,
      body,
      linkedEntryIds,
      author = "local-user"
    }: {
      dayKey: string;
      incidentId?: string;
      sessionKey?: string;
      body: string;
      linkedEntryIds?: string[];
      author?: string;
    }): InvestigationNote {
      const now = new Date().toISOString();
      return requireMethod(repo.saveInvestigationNote, "saveInvestigationNote")({
        id: globalThis.crypto.randomUUID(),
        dayKey,
        ...(incidentId ? { incidentId } : {}),
        ...(sessionKey ? { sessionKey } : {}),
        author,
        body,
        linkedEntryIds: linkedEntryIds ?? [],
        createdAt: now,
        updatedAt: now
      });
    },
    listInvestigationNotes(filter?: { dayKey?: string; incidentId?: string; cursor?: string; limit?: number }): PaginatedListResult<InvestigationNote> {
      const items = requireMethod(repo.listInvestigationNotes, "listInvestigationNotes")({
        dayKey: filter?.dayKey,
        incidentId: filter?.incidentId
      });
      return paginateItems(items, filter?.limit ?? 20, filter?.cursor);
    },
    getIncidentWorkspace({ incidentId }: { incidentId: string }): IncidentWorkspace {
      return buildIncidentWorkspace(repo, incidentId);
    },
    executeIncidentAction({
      incidentId,
      actionId,
      body,
      pluginId
    }: {
      incidentId: string;
      actionId: IncidentWorkspace["loop"]["act"][number]["id"];
      body?: string;
      pluginId?: string;
    }) {
      return executeIncidentAction(repo, { incidentId, actionId, body, pluginId });
    },
    buildIntegrationPayload({ target, dayKey }: { target: IntegrationPayload["target"]; dayKey: string }): IntegrationPayload {
      return requireMethod(repo.buildIntegrationPayload, "buildIntegrationPayload")(target, dayKey);
    },
    deliverIntegration({ target, dayKey, incidentId }: { target: DeliveryReceipt["target"]; dayKey: string; incidentId?: string }): DeliveryReceipt {
      return requireMethod(repo.deliverIntegration, "deliverIntegration")(target, dayKey, incidentId);
    },
    listDeliveryReceipts({ cursor, limit = 20 }: { cursor?: string; limit?: number } = {}): PaginatedListResult<DeliveryReceipt> {
      return paginateItems(requireMethod(repo.listDeliveryReceipts, "listDeliveryReceipts")(), limit, cursor);
    },
    inspectReplayBundle(bundle: { day?: { dayKey?: string; entries?: unknown[] }; markdown?: string }) {
      return {
        dayKey: bundle.day?.dayKey ?? "unknown",
        entryCount: Array.isArray(bundle.day?.entries) ? bundle.day.entries.length : 0,
        markdownPreview: typeof bundle.markdown === "string" ? bundle.markdown.slice(0, 500) : ""
      };
    },
    diffReplayBundles({
      left,
      right
    }: {
      left: { manifest?: Record<string, unknown>; day?: { dayKey?: string; summary?: string; entries?: Array<{ id?: string; [key: string]: unknown }> }; markdown?: string };
      right: { manifest?: Record<string, unknown>; day?: { dayKey?: string; summary?: string; entries?: Array<{ id?: string; [key: string]: unknown }> }; markdown?: string };
    }): ReplayBundleDiff {
      const leftEntries = Array.isArray(left.day?.entries) ? left.day.entries : [];
      const rightEntries = Array.isArray(right.day?.entries) ? right.day.entries : [];
      const leftIds = new Set(leftEntries.map((entry) => entry.id).filter((id): id is string => typeof id === "string"));
      const rightIds = new Set(rightEntries.map((entry) => entry.id).filter((id): id is string => typeof id === "string"));
      const addedEntryIds = [...rightIds].filter((id) => !leftIds.has(id));
      const removedEntryIds = [...leftIds].filter((id) => !rightIds.has(id));
      const summaryChanged = (left.day?.summary ?? "") !== (right.day?.summary ?? "");
      const markdownChanged = (left.markdown ?? "") !== (right.markdown ?? "");
      const changedManifestFields = diffRecordKeys(left.manifest, right.manifest);
      const changedMetadataFields = diffRecordKeys(buildBundleEntryMetadata(leftEntries), buildBundleEntryMetadata(rightEntries));
      return {
        changeClass: classifyReplayBundleDiff({
          addedEntryIds,
          removedEntryIds,
          summaryChanged,
          markdownChanged,
          changedManifestFields,
          changedMetadataFields
        }),
        leftDayKey: left.day?.dayKey ?? "unknown",
        rightDayKey: right.day?.dayKey ?? "unknown",
        addedEntryIds,
        removedEntryIds,
        summaryChanged,
        markdownChanged,
        entryCountDelta: rightEntries.length - leftEntries.length,
        changedManifestFields,
        changedMetadataFields
      };
    },
    buildCloseoutPlan({
      dayKey,
      keepDays,
      exportTargets
    }: {
      dayKey: string;
      keepDays: number;
      exportTargets: string[];
    }): CloseoutPlan {
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
    getLineage({ entryId }: { entryId: string }): LineageRecord {
      const lineage = requireMethod(repo.getLineage, "getLineage")(entryId);
      if (!lineage) throw new Error(`lineage_not_found:${entryId}`);
      return lineage;
    },
    listSummaryProfiles(): SummaryProfile[] {
      return requireMethod(repo.listSummaryProfiles, "listSummaryProfiles")();
    },
    generateSummaryProfile({ profileId, dayKey }: { profileId: SummaryProfile["id"]; dayKey: string }): GeneratedProfileSummary {
      return requireMethod(repo.generateSummaryProfile, "generateSummaryProfile")(profileId, dayKey);
    },
    runIntegrityMonitor(): IntegrityMonitorReport {
      return requireMethod(repo.runIntegrityMonitor, "runIntegrityMonitor")();
    },
    listIntegrityReports(): IntegrityMonitorReport[] {
      return requireMethod(repo.listIntegrityReports, "listIntegrityReports")();
    },
    getAnalytics(): AnalyticsSnapshot {
      return requireMethod(repo.getAnalytics, "getAnalytics")();
    },
    buildMissionReplay({ incidentId }: { incidentId: string }): MissionReplay {
      return requireMethod(repo.buildMissionReplay, "buildMissionReplay")(incidentId);
    },
    buildCorrelationGraph({ incidentId }: { incidentId: string }): CorrelationGraph {
      return requireMethod(repo.buildCorrelationGraph, "buildCorrelationGraph")(incidentId);
    },
    listPlugins(): PluginManifest[] {
      return requireMethod(repo.listPlugins, "listPlugins")();
    },
    registerPlugin(plugin: PluginManifest): PluginManifest {
      return requireMethod(repo.registerPlugin, "registerPlugin")(plugin);
    },
    runPlugin({ pluginId }: { pluginId: string }): PluginExecutionResult {
      return requireMethod(repo.runPlugin, "runPlugin")(pluginId);
    },
    listHealthTimeline({ limit = 10, cursor }: { limit?: number; cursor?: string } = {}): PaginatedListResult<ServiceHealthTimelineEntry> {
      return paginateItems(requireMethod(repo.listHealthTimeline, "listHealthTimeline")(Math.max(limit * 3, 30)), limit, cursor);
    }
  };
}
