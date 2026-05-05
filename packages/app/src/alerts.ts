import type { AlertFinding, AlertRule } from "@openclog/core";
import type { AlertStateRecord, ApplicationRepository } from "./contracts.js";
import { requireMethod } from "./utils.js";

export function buildAlertsModule(repo: ApplicationRepository) {
  return {
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
    }
  };
}
