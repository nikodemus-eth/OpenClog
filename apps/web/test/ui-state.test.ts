import { describe, expect, test } from "vitest";
import type { JournalEntry } from "@openclog/core";
import { timelineDisplayText } from "../src/components/event-display.js";
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
      "degraded_connectivity",
      "security_warnings"
    ]);
    expect(store.getState().gateway.status).toBe("blocked");
  });
});

describe("browser-visible event safety", () => {
  test("redacts secret-like values and summarizes raw technical payloads", () => {
    const entry = buildEntry(
      [
        "Authorization: Bearer live-secret-token",
        "OPENCLAW_GATEWAY_TOKEN=oc_token_123456",
        "SMTP_PASSWORD=mail-secret",
        "oauth_access_token=oauth-secret",
        "cookie: session=raw-cookie",
        '{"raw_event_redacted_json":{"nested":"value"},"headers":{"authorization":"Bearer nope"}}',
        "/Users/m4/OpenClog/private/token-file.txt",
        "The operator-facing summary stays visible."
      ].join("\n")
    );

    const display = timelineDisplayText(entry, false);

    expect(display.body).toContain("[REDACTED_SECRET]");
    expect(display.body).toContain("[REDACTED_PAYLOAD]");
    expect(display.body).toContain("[LOCAL_PATH]");
    expect(display.redactions.map((redaction) => redaction.reason)).toEqual(
      expect.arrayContaining(["auth_header", "cookie", "token_like", "smtp", "oauth", "raw_gateway_payload", "unsafe_local_path"])
    );
    expect(display.body).not.toMatch(/live-secret-token|oc_token_123456|mail-secret|oauth-secret|raw-cookie|token-file/i);
    expect(display.expanded).toBe(false);
  });

  test("renders long entries as previews until expanded", () => {
    const entry = buildEntry(`${"OpenClog event detail. ".repeat(20)}Final sentence.`);

    const preview = timelineDisplayText(entry, false);
    const expanded = timelineDisplayText(entry, true);

    expect(preview.body.length).toBeLessThan(expanded.body.length);
    expect(preview.hasMore).toBe(true);
    expect(preview.redactions.map((redaction) => redaction.reason)).toContain("long_preview");
    expect(preview.body.endsWith("...")).toBe(true);
    expect(expanded.body).toContain("Final sentence.");
    expect(expanded.hasMore).toBe(false);
  });
});

function buildEntry(body: string): JournalEntry {
  return {
    id: "entry-browser-safe",
    dayKey: "2026-05-02",
    source: "gateway",
    kind: "assistant_message",
    title: "OpenClog response",
    body,
    timestamp: "2026-05-02T12:00:00.000Z",
    status: "info",
    severity: "info",
    redacted: true
  };
}
