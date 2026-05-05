import type { InvestigationNote } from "@openclog/core";
import { buildIncidentWorkspace, executeIncidentAction } from "./incident-loop.js";
import type { ApplicationRepository } from "./contracts.js";
import { paginateItems, requireMethod } from "./utils.js";

export function buildIncidentsModule(repo: ApplicationRepository) {
  return {
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
    listInvestigationNotes(filter?: { dayKey?: string; incidentId?: string; cursor?: string; limit?: number }) {
      const items = requireMethod(repo.listInvestigationNotes, "listInvestigationNotes")({
        dayKey: filter?.dayKey,
        incidentId: filter?.incidentId
      });
      return paginateItems(items, filter?.limit ?? 20, filter?.cursor);
    },
    getIncidentWorkspace({ incidentId }: { incidentId: string }) {
      return buildIncidentWorkspace(repo, incidentId);
    },
    executeIncidentAction({
      incidentId,
      actionId,
      body,
      pluginId
    }: {
      incidentId: string;
      actionId: Parameters<typeof executeIncidentAction>[1]["actionId"];
      body?: string;
      pluginId?: string;
    }) {
      return executeIncidentAction(repo, { incidentId, actionId, body, pluginId });
    },
    listIncidentRulePacks() {
      return repo.listIncidentRulePacks ? repo.listIncidentRulePacks() : [];
    }
  };
}
