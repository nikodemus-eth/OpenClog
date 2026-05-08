import { buildAlertsModule } from "./alerts.js";
import { buildCapabilitiesModule } from "./capabilities.js";
import type { ApplicationRepository } from "./contracts.js";
import { buildDeliveryModule } from "./delivery.js";
import { buildGovernanceModule } from "./governance.js";
import { buildIncidentsModule } from "./incidents.js";
import { buildMonitoringImportModule } from "./monitoring-import.js";
import { buildOperationsModule } from "./operations.js";
import { buildRetentionModule } from "./retention.js";
import { buildSearchModule } from "./search.js";
import { buildSettingsModule } from "./summary-jobs.js";

export * from "./contracts.js";

export function createOpenClogApplication({ repo }: { repo: ApplicationRepository }) {
  return {
    ...buildSearchModule(repo),
    ...buildSettingsModule(repo),
    ...buildRetentionModule(repo),
    ...buildAlertsModule(repo),
    ...buildIncidentsModule(repo),
    ...buildMonitoringImportModule(repo),
    ...buildOperationsModule(repo),
    ...buildDeliveryModule(repo),
    ...buildGovernanceModule(repo),
    ...buildCapabilitiesModule(repo)
  };
}
