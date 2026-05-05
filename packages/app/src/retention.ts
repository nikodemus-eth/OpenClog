import type { RetentionClass } from "@openclog/core";
import type { ApplicationRepository, RetentionSnapshotRecord } from "./contracts.js";
import { requireMethod, titleCase } from "./utils.js";

export function buildRetentionModule(repo: ApplicationRepository) {
  return {
    applyRetention(policy: { keepDays: number; includeAudit: boolean; includeRedactedEvents: boolean; includeSummaries: boolean }): RetentionSnapshotRecord {
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
    previewRetentionByClass() {
      return requireMethod(repo.previewRetentionByClass, "previewRetentionByClass")();
    }
  };
}
