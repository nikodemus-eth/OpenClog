import { describe, expect, test } from "vitest";
import type { JournalEntry } from "../src/index.js";
import {
  browserVisibleEntryText,
  buildTimelineDisplayItems,
  displayProductCopy,
  entryBelongsToGroup,
  formatTimelineGroupSummary
} from "../src/index.js";

describe("browser-visible display safety", () => {
  test("redacts sensitive values with reason metadata and keeps full text behind disclosure", () => {
    const entry = buildEntry({
      body: [
        "Authorization: Bearer live-secret-token",
        "cookie: session=raw-cookie",
        "OPENCLAW_GATEWAY_TOKEN=oc_token_123456",
        "oauth_access_token=oauth-secret",
        "SMTP_PASSWORD=mail-secret",
        "APP_SECRET=env-secret",
        '{"raw_event_redacted_json":{"headers":{"authorization":"Bearer nope"}}}',
        "/Users/m4/OpenClog/private/token-file.txt",
        `${"Long OpenClog detail. ".repeat(30)}Final sentence.`
      ].join("\n")
    });

    const preview = browserVisibleEntryText(entry, { expanded: false });
    const expanded = browserVisibleEntryText(entry, { expanded: true });

    expect(preview.body).not.toMatch(/live-secret-token|raw-cookie|oc_token_123456|oauth-secret|mail-secret|env-secret|token-file|authorization":"Bearer/i);
    expect(expanded.body).not.toMatch(/live-secret-token|raw-cookie|oc_token_123456|oauth-secret|mail-secret|env-secret|token-file|authorization":"Bearer/i);
    expect(preview.redactions.map((redaction) => redaction.reason)).toEqual(
      expect.arrayContaining(["auth_header", "cookie", "token_like", "oauth", "smtp", "env_assignment", "raw_gateway_payload", "unsafe_local_path", "long_preview"])
    );
    expect(preview.hasMore).toBe(true);
    expect(expanded.hasMore).toBe(false);
    expect(expanded.body).toContain("Final sentence.");
  });

  test("keeps local paths only for operator-facing event types", () => {
    const path = "/Users/m4/OpenClog/operator-notes.md";

    expect(browserVisibleEntryText(buildEntry({ body: path, kind: "assistant_message" }), { expanded: true }).body).toContain("[LOCAL_PATH]");
    expect(browserVisibleEntryText(buildEntry({ body: path, kind: "note" }), { expanded: true }).body).toContain(path);
  });

  test("handles missing entry body as empty browser-visible text", () => {
    expect(browserVisibleEntryText(buildEntry({ body: undefined }), { expanded: false })).toMatchObject({
      body: "",
      expanded: false,
      hasMore: false,
      redactions: []
    });
  });
});

describe("timeline display grouping", () => {
  test("groups 3 or more adjacent similar low-value OpenClaw responses inside a two-minute window", () => {
    const entries = [
      buildEntry({ id: "older", body: "setup", timestamp: "2026-05-03T12:15:00.000Z" }),
      buildEntry({ id: "r1", body: "pong", timestamp: "2026-05-03T12:18:00.000Z" }),
      buildEntry({ id: "r2", body: "pong", timestamp: "2026-05-03T12:18:30.000Z" }),
      buildEntry({ id: "r3", body: "pong", timestamp: "2026-05-03T12:19:00.000Z" })
    ];

    const items = buildTimelineDisplayItems(entries, { grouped: true });
    const group = items.find((item) => item.kind === "group");

    expect(group).toMatchObject({
      kind: "group",
      entryIds: ["r3", "r2", "r1"],
      count: 3,
      firstTimestamp: "2026-05-03T12:18:00.000Z",
      lastTimestamp: "2026-05-03T12:19:00.000Z",
      source: "openclaw",
      eventKind: "assistant_message",
      status: "info",
      groupingReason: "adjacent_similar_low_value"
    });
    expect(group?.sanitizedBodySignature).toBe("openclaw response pong");
    expect(group ? formatTimelineGroupSummary(group) : "").toContain("3 similar OpenClaw responses between");
    expect(group ? formatTimelineGroupSummary(group) : "").toContain("display-only");
    expect(group ? entryBelongsToGroup(group, "r2") : false).toBe(true);
    expect(group ? entryBelongsToGroup(group, "missing") : true).toBe(false);
  });

  test("summarizes grouped tool and non-OpenClaw events with explainable labels", () => {
    const toolGroup = buildTimelineDisplayItems(
      [
        buildEntry({ id: "t1", kind: "tool_call", source: "tool", title: "Tool call", body: "read", timestamp: "2026-05-03T12:18:00.000Z" }),
        buildEntry({ id: "t2", kind: "tool_call", source: "tool", title: "Tool call", body: "read", timestamp: "2026-05-03T12:18:30.000Z" }),
        buildEntry({ id: "t3", kind: "tool_call", source: "tool", title: "Tool call", body: "read", timestamp: "2026-05-03T12:19:00.000Z" })
      ],
      { grouped: true }
    ).find((item) => item.kind === "group");
    const gatewayGroup = buildTimelineDisplayItems(
      [
        buildEntry({ id: "g1", source: "gateway", title: "Gateway event", body: "heartbeat", timestamp: "2026-05-03T12:18:00.000Z" }),
        buildEntry({ id: "g2", source: "gateway", title: "Gateway event", body: "heartbeat", timestamp: "2026-05-03T12:18:30.000Z" }),
        buildEntry({ id: "g3", source: "gateway", title: "Gateway event", body: "heartbeat", timestamp: "2026-05-03T12:19:00.000Z" })
      ],
      { grouped: true }
    ).find((item) => item.kind === "group");

    expect(toolGroup ? formatTimelineGroupSummary(toolGroup) : "").toContain("similar tool events");
    expect(gatewayGroup ? formatTimelineGroupSummary(gatewayGroup) : "").toContain("similar gateway events");
    expect(entryBelongsToGroup({ kind: "entry", entry: buildEntry({}) }, "entry")).toBe(false);
  });

  test("does not group pairs, distant entries, critical entries, actionable entries, user messages, or approvals", () => {
    const ungroupable = [
      buildEntry({ id: "p1", body: "pair", timestamp: "2026-05-03T12:19:00.000Z" }),
      buildEntry({ id: "p2", body: "pair", timestamp: "2026-05-03T12:18:30.000Z" }),
      buildEntry({ id: "far1", body: "far", timestamp: "2026-05-03T12:10:00.000Z" }),
      buildEntry({ id: "far2", body: "far", timestamp: "2026-05-03T12:07:00.000Z" }),
      buildEntry({ id: "far3", body: "far", timestamp: "2026-05-03T12:04:00.000Z" }),
      buildEntry({ id: "user1", body: "ping", kind: "user_message", source: "user", timestamp: "2026-05-03T12:03:00.000Z" }),
      buildEntry({ id: "user2", body: "ping", kind: "user_message", source: "user", timestamp: "2026-05-03T12:02:30.000Z" }),
      buildEntry({ id: "user3", body: "ping", kind: "user_message", source: "user", timestamp: "2026-05-03T12:02:00.000Z" }),
      buildEntry({ id: "approval", kind: "approval_requested", status: "pending", approvalId: "approval-1", timestamp: "2026-05-03T12:01:00.000Z" }),
      buildEntry({ id: "warn", status: "failed", severity: "warning", timestamp: "2026-05-03T12:00:00.000Z" }),
      buildEntry({ id: "action", actions: [{ id: "open", label: "Open", kind: "open" }], timestamp: "2026-05-03T11:59:00.000Z" })
    ];

    const groupedItems = buildTimelineDisplayItems(ungroupable, { grouped: true });

    expect(groupedItems.every((item) => item.kind === "entry")).toBe(true);
  });

  test("raw mode preserves individual newest-first redacted entries", () => {
    const items = buildTimelineDisplayItems(
      [
        buildEntry({ id: "old", body: "old", timestamp: "2026-05-03T12:00:00.000Z" }),
        buildEntry({ id: "new", body: "Authorization: Bearer secret", timestamp: "2026-05-03T12:01:00.000Z" })
      ],
      { grouped: false }
    );

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: "entry", entry: { id: "new" } });
    expect(items[1]).toMatchObject({ kind: "entry", entry: { id: "old" } });
  });

  test("keeps stable ordering for equal or invalid timestamps", () => {
    const items = buildTimelineDisplayItems(
      [
        buildEntry({ id: "first", timestamp: "2026-05-03T12:00:00.000Z" }),
        buildEntry({ id: "second", timestamp: "2026-05-03T12:00:00.000Z" }),
        buildEntry({ id: "invalid", timestamp: "not-a-date" })
      ],
      { grouped: false }
    );

    expect(items.map((item) => (item.kind === "entry" ? item.entry.id : item.id))).toEqual(["first", "second", "invalid"]);
  });

  test("keeps actor labels and defaults missing statuses inside groups", () => {
    const group = buildTimelineDisplayItems(
      [
        buildEntry({ id: "a1", actorLabel: "Highfather", status: undefined, timestamp: "2026-05-03T12:18:00.000Z" }),
        buildEntry({ id: "a2", actorLabel: "Highfather", status: undefined, timestamp: "2026-05-03T12:18:30.000Z" }),
        buildEntry({ id: "a3", actorLabel: "Highfather", status: undefined, timestamp: "2026-05-03T12:19:00.000Z" })
      ],
      { grouped: true }
    ).find((item) => item.kind === "group");

    expect(group).toMatchObject({ kind: "group", actorLabel: "Highfather", status: "info" });
  });
});

describe("product copy display guard", () => {
  test("normalizes stale product-facing source text", () => {
    const staleTitle = ["OpenClaw", "Journal"].join(" ");

    expect(displayProductCopy(staleTitle)).toBe("OpenClog Journal");
    expect(displayProductCopy(`The ${staleTitle} archive`)).toBe("The OpenClog Journal archive");
  });
});

function buildEntry(overrides: Partial<JournalEntry>): JournalEntry {
  return {
    id: "entry",
    dayKey: "2026-05-03",
    source: "openclaw",
    kind: "assistant_message",
    title: "OpenClaw response",
    body: "pong",
    timestamp: "2026-05-03T12:00:00.000Z",
    status: "info",
    severity: "info",
    redacted: true,
    ...overrides
  };
}
