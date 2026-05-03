import { describe, expect, test } from "vitest";
import { classifyComposerInput, redactGatewayPayload, toPersistableRedactedEvent } from "../../packages/core/src/index.js";

describe("red-team fixtures", () => {
  test("blocks command escalation through composer text", () => {
    for (const input of ["/config unset auth.token", "/secrets resolve OPENAI_API_KEY", "/pairing approve abc", "/update run"]) {
      expect(classifyComposerInput(input).blocked).toBe(true);
    }
  });

  test("redacts xss-adjacent and secret-bearing Gateway payloads before storage", () => {
    const payload = {
      text: "<script>fetch('/api?token=abc')</script>",
      rawToolPayload: "COOKIE=session-secret\nOPENAI_API_KEY=sk-secret"
    };
    const redacted = redactGatewayPayload(payload);
    const persistable = toPersistableRedactedEvent(payload);

    expect(JSON.stringify(redacted.redacted)).not.toContain("sk-secret");
    expect(JSON.stringify(redacted.redacted)).not.toContain("session-secret");
    expect(persistable.raw_event_redacted_json).not.toContain("rawToolPayload\":\"COOKIE");
  });
});

