import { describe, expect, test } from "vitest";
import { buildRouteParams, readRouteFromParams } from "../src/hooks/useJournalRouting.js";

describe("journal routing", () => {
  test("treats empty day query values as unset and falls back to the default day", () => {
    const params = new URLSearchParams("day=&view=grouped&q=reconnect");

    expect(readRouteFromParams(params, "2026-05-03")).toMatchObject({
      selectedDayKey: "2026-05-03",
      grouped: true,
      searchQuery: "reconnect"
    });
  });

  test("omits the day query when no selected day key is available", () => {
    const params = buildRouteParams({
      selectedDayKey: "",
      grouped: true,
      activeFilters: [],
      focusedEntryId: null,
      searchQuery: ""
    });

    expect(params.toString()).toBe("view=grouped");
  });

  test("normalizes duplicate filters, whitespace-only entries, and trimmed query state", () => {
    const route = readRouteFromParams(
      new URLSearchParams("day=%202026-05-04%20&view=raw&filters=errors,unknown,errors,approvals,backfilled_openclaw&entry=%20&q=%20gateway%20"),
      "2026-05-03"
    );

    expect(route).toEqual({
      selectedDayKey: "2026-05-04",
      grouped: false,
      activeFilters: ["errors", "approvals", "backfilled_openclaw"],
      focusedEntryId: null,
      searchQuery: "gateway"
    });

    expect(
      buildRouteParams({
        selectedDayKey: " 2026-05-04 ",
        grouped: false,
        activeFilters: ["errors", "errors", "approvals", "backfilled_openclaw"],
        focusedEntryId: " entry-1 ",
        searchQuery: " gateway "
      }).toString()
    ).toBe("day=2026-05-04&view=raw&filters=errors%2Capprovals%2Cbackfilled_openclaw&entry=entry-1&q=gateway");
  });
});
