import type {
  AlertFinding,
  AlertRule,
  AnalyticsSnapshot,
  DeliveryReceipt,
  GeneratedProfileSummary,
  IncidentActionRecord,
  IncidentSummary,
  InvestigationNote,
  IntegrationPayload,
  JournalDay,
  JournalSearchResult,
  LineageRecord,
  MissionReplay,
  OpenClogSettings,
  PluginExecutionResult,
  PluginManifest,
  RetentionClass,
  RetentionClassPreview,
  RetentionPolicy,
  RetentionPreview,
  SearchPreset,
  ServiceHealthTimelineEntry,
  SessionDrilldown,
  SummaryProfile,
  CorrelationGraph,
  IntegrityMonitorReport
} from "@openclog/core";

export interface PaginatedSearchResult {
  items: JournalSearchResult[];
  nextCursor?: string;
}

export interface PaginatedSessionDrilldown extends SessionDrilldown {
  nextCursor?: string;
}

export interface PaginatedListResult<T> {
  items: T[];
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

export interface SearchRepository {
  searchEntries(query: string): JournalSearchResult[];
}

export interface DrilldownRepository {
  getDrilldown(sessionKey: string): SessionDrilldown;
}

export interface RetentionRepository {
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

export interface AlertsRepository {
  listAlertRules(): AlertRule[];
  evaluateAlertRules(dayKey: string): AlertFinding[];
  setAlertState(ruleId: string, state: AlertStateRecord): AlertStateRecord;
  getAlertState(ruleId: string): AlertStateRecord | undefined;
}

export interface IncidentRepository {
  getIncident(id: string): IncidentSummary | undefined;
  listIncidents(): IncidentSummary[];
  getDay(dayKey: string): JournalDay | null;
  saveInvestigationNote(note: InvestigationNote): InvestigationNote;
  listInvestigationNotes(filter?: {
    dayKey?: string;
    incidentId?: string;
  }): InvestigationNote[];
  listIncidentActionRecords(filter?: { incidentId?: string }): IncidentActionRecord[];
  saveIncidentActionRecord(record: IncidentActionRecord): IncidentActionRecord;
  generateSummary(dayKey: string): JournalDay["generatedSummary"];
}

export interface IntegrationRepository {
  buildIntegrationPayload(target: IntegrationPayload["target"], dayKey: string): IntegrationPayload;
  deliverIntegration(target: DeliveryReceipt["target"], dayKey: string, incidentId?: string): DeliveryReceipt;
  createGithubIssue(dayKey: string, incidentId?: string): DeliveryReceipt;
  listDeliveryReceipts(): DeliveryReceipt[];
}

export interface GovernanceRepository {
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
  getIntegrityReport(): {
    checkedEntries: number;
    mismatchedEntryIds: string[];
    missingRedactedHashes: string[];
    ok: boolean;
  };
}

export interface SettingsRepository {
  getSetting<T>(key: string, fallback: T): T;
  setSetting(key: string, value: unknown): void;
}

export type ApplicationRepository = Partial<
  SearchRepository &
    DrilldownRepository &
    RetentionRepository &
    AlertsRepository &
    IncidentRepository &
    IntegrationRepository &
    GovernanceRepository &
    SettingsRepository
>;

export interface UpdateSettingsInput {
  theme?: string;
  showToolCalls?: boolean;
  searchPresets?: SearchPreset[];
  operatorViews?: OpenClogSettings["operatorViews"];
}
