import type {
  AlertFinding,
  AlertRule,
  AnalyticsSnapshot,
  CloseoutPlan,
  CorrelationGraph,
  DeliveryAdapterTarget,
  DeliveryReceipt,
  GeneratedProfileSummary,
  IncidentSummary,
  IncidentWorkspace,
  IntegrityMonitorReport,
  InvestigationNote,
  IntegrationPayload,
  JournalDay,
  JournalEntry,
  JournalSearchResult,
  LineageRecord,
  MissionReplay,
  PluginExecutionResult,
  PluginManifest,
  ReplayBundleDiff,
  RetentionClass,
  RetentionClassPreview,
  RetentionPolicy,
  RetentionPreview,
  ServiceHealthTimelineEntry,
  SessionDrilldown,
  SummaryProfile
} from "@openclog/core";

export interface PaginatedSearchResult {
  items: JournalSearchResult[];
  nextCursor?: string;
}

export interface PaginatedSessionDrilldown extends SessionDrilldown {
  nextCursor?: string;
}

export interface RetentionSnapshotRecord {
  id: string;
  createdAt: string;
  preview: RetentionPreview;
  days: JournalDay[];
}

export interface AlertStateRecord {
  ruleId: string;
  acknowledgedAt?: string;
  snoozedUntil?: string;
}

interface SearchRepository {
  searchEntries(query: string): JournalSearchResult[];
}

interface DrilldownRepository {
  getDrilldown(sessionKey: string): SessionDrilldown;
}

interface RetentionRepository {
  listDays(): Array<Omit<JournalDay, "entries">>;
  getDay(dayKey: string): JournalDay | null;
  previewRetention(policy: RetentionPolicy): RetentionPreview;
  deleteDays(dayKeys: string[]): void;
  saveRetentionSnapshot(snapshot: RetentionSnapshotRecord): RetentionSnapshotRecord;
  getRetentionSnapshot(id: string): RetentionSnapshotRecord | undefined;
  restoreRetentionSnapshot(snapshot: RetentionSnapshotRecord): void;
  listRetentionClasses(): RetentionClass[];
  saveRetentionClass(retentionClass: RetentionClass): RetentionClass;
  previewRetentionByClass(): RetentionClassPreview[];
}

interface AlertsRepository {
  listAlertRules(): AlertRule[];
  evaluateAlertRules(dayKey: string): AlertFinding[];
  setAlertState(ruleId: string, state: AlertStateRecord): AlertStateRecord;
  getAlertState(ruleId: string): AlertStateRecord | undefined;
}

interface IncidentRepository {
  getIncident(id: string): IncidentSummary | undefined;
  listIncidents(): IncidentSummary[];
  getDay(dayKey: string): JournalDay | null;
  saveInvestigationNote(note: InvestigationNote): InvestigationNote;
  listInvestigationNotes(filter?: {
    dayKey?: string;
    incidentId?: string;
  }): InvestigationNote[];
}

interface IntegrationRepository {
  buildIntegrationPayload(target: IntegrationPayload["target"], dayKey: string): IntegrationPayload;
  deliverIntegration(target: DeliveryAdapterTarget, dayKey: string, incidentId?: string): DeliveryReceipt;
  listDeliveryReceipts(): DeliveryReceipt[];
}

interface GovernanceRepository {
  getLineage(entryId: string): LineageRecord | undefined;
  listSummaryProfiles(): SummaryProfile[];
  generateSummaryProfile(profileId: SummaryProfile["id"], dayKey: string): GeneratedProfileSummary;
  runIntegrityMonitor(): IntegrityMonitorReport;
  listIntegrityReports(): IntegrityMonitorReport[];
  getAnalytics(): AnalyticsSnapshot;
  buildMissionReplay(incidentId: string): MissionReplay;
  buildCorrelationGraph(incidentId: string): CorrelationGraph;
  listPlugins(): PluginManifest[];
  registerPlugin(plugin: PluginManifest): PluginManifest;
  runPlugin(pluginId: string): PluginExecutionResult;
  listHealthTimeline(limit?: number): ServiceHealthTimelineEntry[];
}

type ApplicationRepository = Partial<
  SearchRepository & DrilldownRepository & RetentionRepository & AlertsRepository & IncidentRepository & IntegrationRepository & GovernanceRepository
>;

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
    applyRetention(policy: RetentionPolicy): RetentionSnapshotRecord {
      const preview = requireMethod(repo.previewRetention, "previewRetention")(policy);
      const days = requireMethod(repo.listDays, "listDays")()
        .map((day) => requireMethod(repo.getDay, "getDay")(day.dayKey))
        .filter((day): day is JournalDay => day !== null);
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
    listInvestigationNotes(filter?: { dayKey?: string; incidentId?: string }): InvestigationNote[] {
      return requireMethod(repo.listInvestigationNotes, "listInvestigationNotes")(filter);
    },
    getIncidentWorkspace({ incidentId }: { incidentId: string }): IncidentWorkspace {
      const incident = requireMethod(repo.getIncident, "getIncident")(incidentId);
      if (!incident) throw new Error(`incident_not_found:${incidentId}`);
      const notes = requireMethod(repo.listInvestigationNotes, "listInvestigationNotes")({ incidentId });
      const days = incident.dayKeys
        .map((dayKey) => requireMethod(repo.getDay, "getDay")(dayKey))
        .filter((day): day is JournalDay => day !== null);
      const entries = incident.entryIds
        .map((entryId) => days.flatMap((day) => day.entries).find((entry) => entry.id === entryId))
        .filter((entry): entry is JournalEntry => entry !== undefined);
      const sessionKeys = [...new Set(entries.map((entry) => entry.sessionId).filter((sessionKey): sessionKey is string => Boolean(sessionKey)))];
      const alertFindings = incident.dayKeys.flatMap((dayKey) => requireMethod(repo.evaluateAlertRules, "evaluateAlertRules")(dayKey)).filter((finding) => finding.triggered);
      const suggestedNextActions = [
        ...incident.runbookSuggestions.map((suggestion) => suggestion.title),
        ...(notes.length === 0 ? ["Capture the first operator investigation note."] : []),
        ...(alertFindings.length > 0 ? ["Review active alert findings before export."] : [])
      ];
      return {
        incident,
        entries,
        alertFindings,
        generatedSummary: days[0]?.generatedSummary,
        notes,
        sessionKeys,
        suggestedNextActions
      };
    },
    buildIntegrationPayload({ target, dayKey }: { target: IntegrationPayload["target"]; dayKey: string }): IntegrationPayload {
      return requireMethod(repo.buildIntegrationPayload, "buildIntegrationPayload")(target, dayKey);
    },
    deliverIntegration({ target, dayKey, incidentId }: { target: DeliveryAdapterTarget; dayKey: string; incidentId?: string }): DeliveryReceipt {
      return requireMethod(repo.deliverIntegration, "deliverIntegration")(target, dayKey, incidentId);
    },
    listDeliveryReceipts(): DeliveryReceipt[] {
      return requireMethod(repo.listDeliveryReceipts, "listDeliveryReceipts")();
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
    listHealthTimeline({ limit = 10 }: { limit?: number } = {}): ServiceHealthTimelineEntry[] {
      return requireMethod(repo.listHealthTimeline, "listHealthTimeline")(limit);
    }
  };
}

function requireMethod<T>(method: T | undefined, name: string): T {
  if (!method) throw new Error(`application_repository_missing:${name}`);
  return method;
}

function paginateItems<T>(items: T[], limit: number, cursor?: string): { items: T[]; nextCursor?: string } {
  const pageSize = Math.max(1, Math.floor(limit));
  const offset = Number.parseInt(cursor ?? "0", 10);
  const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
  const page = items.slice(safeOffset, safeOffset + pageSize);
  const nextOffset = safeOffset + page.length;
  return {
    items: page,
    nextCursor: nextOffset < items.length ? String(nextOffset) : undefined
  };
}

function diffRecordKeys(left: Record<string, unknown> | undefined, right: Record<string, unknown> | undefined): string[] {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  return [...keys].filter((key) => JSON.stringify(left?.[key]) !== JSON.stringify(right?.[key]));
}

function buildBundleEntryMetadata(entries: Array<{ id?: string; [key: string]: unknown }>): Record<string, unknown> {
  return Object.fromEntries(entries.map((entry) => [String(entry.id ?? "missing"), Object.keys(entry).sort()]));
}

function classifyReplayBundleDiff(diff: {
  addedEntryIds: string[];
  removedEntryIds: string[];
  summaryChanged: boolean;
  markdownChanged: boolean;
  changedManifestFields: string[];
  changedMetadataFields: string[];
}): ReplayBundleDiff["changeClass"] {
  if (diff.addedEntryIds.length > 0 || diff.removedEntryIds.length > 0) return "evidence_shape";
  if (diff.changedMetadataFields.length > 0 || diff.changedManifestFields.length > 0) return "metadata_only";
  if (diff.summaryChanged || diff.markdownChanged) return "narrative_only";
  return "unchanged";
}

function latestEntryAt(entries: JournalEntry[]): string {
  return entries.reduce((latest, entry) => (entry.timestamp > latest ? entry.timestamp : latest), "");
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
