import type { AlertFinding, AlertRule, IntegrationPayload, JournalDay, JournalSearchResult, RetentionPolicy, RetentionPreview, SessionDrilldown } from "@openclog/core";
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
}
interface AlertsRepository {
    listAlertRules(): AlertRule[];
    evaluateAlertRules(dayKey: string): AlertFinding[];
    setAlertState(ruleId: string, state: AlertStateRecord): AlertStateRecord;
    getAlertState(ruleId: string): AlertStateRecord | undefined;
}
interface IntegrationRepository {
    buildIntegrationPayload(target: IntegrationPayload["target"], dayKey: string): IntegrationPayload;
}
type ApplicationRepository = Partial<SearchRepository & DrilldownRepository & RetentionRepository & AlertsRepository & IntegrationRepository>;
export declare function createOpenClogApplication({ repo }: {
    repo: ApplicationRepository;
}): {
    searchEntries({ query, limit, cursor }: {
        query: string;
        limit?: number;
        cursor?: string;
    }): PaginatedSearchResult;
    getSessionDrilldown({ sessionKey, limit, cursor }: {
        sessionKey: string;
        limit?: number;
        cursor?: string;
    }): PaginatedSessionDrilldown;
    applyRetention(policy: RetentionPolicy): RetentionSnapshotRecord;
    rollbackRetention(snapshotId: string): {
        restoredDayKeys: string[];
    };
    acknowledgeAlert({ ruleId, acknowledgedAt }: {
        ruleId: string;
        acknowledgedAt: string;
    }): AlertStateRecord;
    snoozeAlert({ ruleId, snoozedUntil }: {
        ruleId: string;
        snoozedUntil: string;
    }): AlertStateRecord;
    listAlerts({ dayKey }: {
        dayKey: string;
    }): {
        rules: AlertRule[];
        findings: Array<AlertFinding & AlertStateRecord>;
    };
    buildIntegrationPayload({ target, dayKey }: {
        target: IntegrationPayload["target"];
        dayKey: string;
    }): IntegrationPayload;
    inspectReplayBundle(bundle: {
        day?: {
            dayKey?: string;
            entries?: unknown[];
        };
        markdown?: string;
    }): {
        dayKey: string;
        entryCount: number;
        markdownPreview: string;
    };
};
export {};
//# sourceMappingURL=index.d.ts.map