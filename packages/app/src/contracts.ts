import type {
  AlertFinding,
  AlertRule,
  AnalyticsSnapshot,
  BackendFingerprint,
  BundleVerificationResult,
  CloseoutCompletion,
  DeliveryReceipt,
  DeliveryRequestOptions,
  DeliverySecretRef,
  DeliveryAdapterTarget,
  GeneratedProfileSummary,
  HealthAggregate,
  HealthHistoryEntry,
  IncidentRulePack,
  IncidentActionRecord,
  IncidentSummary,
  InvestigationWorkspace,
  InvestigationNote,
  IntegrationPayload,
  JournalDay,
  JournalSearchResult,
  LineageRecord,
  MissionReplay,
  OpenClogSettings,
  OperatorRunbook,
  PluginExecutionResult,
  PluginManifest,
  RemoteOpsPolicy,
  ReplayWorkspace,
  RetentionClass,
  RetentionClassPreview,
  RetentionPolicy,
  RetentionPreview,
  SearchPreset,
  ServiceHealthTimelineEntry,
  SessionDrilldown,
  SummaryJob,
  SummaryProfile,
  CorrelationGraph,
  SloSnapshot,
  IntegrityMonitorReport,
  VerificationReceipt
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
  listIncidentRulePacks?(): IncidentRulePack[];
}

export interface IntegrationRepository {
  buildIntegrationPayload(target: IntegrationPayload["target"], dayKey: string): IntegrationPayload;
  deliverIntegration(target: DeliveryReceipt["target"], dayKey: string, options?: DeliveryRequestOptions): DeliveryReceipt;
  createGithubIssue(dayKey: string, options?: DeliveryRequestOptions): DeliveryReceipt;
  listDeliveryReceipts(): DeliveryReceipt[];
  retryDeliveryReceipt(id: string): DeliveryReceipt;
  verifyIntegrationTarget(target: DeliveryAdapterTarget, dayKey: string): DeliveryReceipt;
}

export interface GovernanceRepository {
  getBackendFingerprint(): BackendFingerprint;
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
  runPlugin(pluginId: string, options?: { dryRun?: boolean }): PluginExecutionResult;
  listHealthTimeline(limit?: number): ServiceHealthTimelineEntry[];
  listHealthHistory(limit: number): HealthHistoryEntry[];
  createSummaryJob(dayKey: string): SummaryJob;
  getSummaryJob(jobId: string): SummaryJob | undefined;
  verifyReplayBundle(bundle: { manifest?: Record<string, unknown>; day?: { dayKey?: string; entries?: unknown[] }; markdown?: string }): BundleVerificationResult;
  createReplayWorkspace(dayKey: string): ReplayWorkspace;
  getSloSnapshot(): SloSnapshot;
  generateOperatorRunbook(): OperatorRunbook;
  completeCloseout(dayKey: string, exportTargets: string[]): CloseoutCompletion;
  listVerificationReceipts(): VerificationReceipt[];
  createInvestigationWorkspace(input: { dayKeys: string[]; title?: string }): InvestigationWorkspace;
  getInvestigationWorkspace(id: string): InvestigationWorkspace | undefined;
  getRemoteOpsPolicy(): RemoteOpsPolicy;
  getHealthAggregate(limit?: number): HealthAggregate;
  getIntegrityReport(): {
    checkedEntries: number;
    mismatchedEntryIds: string[];
    missingRedactedHashes: string[];
    ok: boolean;
  };
}

export interface SecureStorageRepository {
  deleteSecret?(ref: DeliverySecretRef): boolean;
  getSecret?(ref: DeliverySecretRef): string | undefined;
  setSecret?(ref: DeliverySecretRef, value: string): DeliverySecretRef;
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
    SecureStorageRepository &
    SettingsRepository
>;

export interface UpdateSettingsInput {
  theme?: string;
  showToolCalls?: boolean;
  searchPresets?: SearchPreset[];
  operatorViews?: OpenClogSettings["operatorViews"];
}
