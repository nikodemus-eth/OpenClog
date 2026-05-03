import { describe, expect, test } from "vitest";
import { redactGatewayPayload, toPersistableRedactedEvent } from "../src/index.js";

describe("redaction", () => {
  test("redacts tokens, cookies, env values, and secret-looking text before persistence", () => {
    const payload = {
      auth: { token: "oc_token_123", headers: { authorization: "Bearer abc", cookie: "sid=secret" } },
      env: { OPENAI_API_KEY: "sk-live", PATH: "/usr/bin" },
      body: "normal text with password=super-secret and harmless notes",
      nested: [{ toolPayload: "api_key=abc123" }]
    };

    const result = redactGatewayPayload(payload);

    expect(JSON.stringify(result.redacted)).not.toContain("oc_token_123");
    expect(JSON.stringify(result.redacted)).not.toContain("Bearer abc");
    expect(JSON.stringify(result.redacted)).not.toContain("sid=secret");
    expect(JSON.stringify(result.redacted)).not.toContain("sk-live");
    expect(JSON.stringify(result.redacted)).not.toContain("super-secret");
    expect(result.report.redactionCount).toBeGreaterThanOrEqual(5);
  });

  test("produces stable hashes while storing only redacted JSON fields", () => {
    const event = { event: "session.message", payload: { text: "token=abc" } };
    const first = toPersistableRedactedEvent(event);
    const second = toPersistableRedactedEvent(event);

    expect(first.raw_event_hash).toBe(second.raw_event_hash);
    expect(first.raw_event_redacted_json).toContain("[REDACTED");
    expect(first.redaction_report_json).toContain("redactionCount");
    expect(Object.keys(first).sort()).toEqual([
      "raw_event_hash",
      "raw_event_redacted_json",
      "redaction_report_json"
    ]);
  });

  test("leaves primitive and harmless strings intact while redacting bearer strings", () => {
    expect(redactGatewayPayload(42).redacted).toBe(42);
    expect(redactGatewayPayload(null).redacted).toBeNull();
    expect(redactGatewayPayload("hello world").redacted).toBe("hello world");
    expect(redactGatewayPayload("Bearer abc.def").redacted).toBe("Bearer [REDACTED_SECRET]");
    expect(redactGatewayPayload("api_key=abc123").redacted).toBe("api_key=[REDACTED_SECRET]");
    expect(redactGatewayPayload("sk-abcdef").redacted).toBe("[REDACTED_SECRET]");
    expect(redactGatewayPayload(["token=abc", "plain"]).redacted).toEqual(["token=[REDACTED_SECRET]", "plain"]);
  });
});
