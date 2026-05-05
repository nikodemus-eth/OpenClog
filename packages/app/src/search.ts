import type { ApplicationRepository, PaginatedSearchResult, PaginatedSessionDrilldown } from "./contracts.js";
import { paginateItems, requireMethod } from "./utils.js";

export function buildSearchModule(repo: ApplicationRepository) {
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
    }
  };
}
