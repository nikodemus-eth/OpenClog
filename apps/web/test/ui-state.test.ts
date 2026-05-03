import { describe, expect, test } from "vitest";
import { createJournalStore } from "../src/state/journal-store.js";

describe("journal UI state", () => {
  test("keeps safety surfaces visible across theme changes", () => {
    const store = createJournalStore();

    store.getState().setGatewayStatus({ status: "blocked", missingScopes: ["operator.approvals"], stale: true });
    store.getState().setTheme("blackbeards-log");

    expect(store.getState().themeId).toBe("blackbeards-log");
    expect(store.getState().visibleSafetySurfaces).toEqual([
      "errors",
      "pending_approvals",
      "stale_gateway_state",
      "blocked_auth",
      "degraded_connectivity"
    ]);
    expect(store.getState().gateway.status).toBe("blocked");
  });
});

