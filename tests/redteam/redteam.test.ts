import { describe, expect, test } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { browserVisibleEntryText, classifyComposerInput, redactGatewayPayload, toPersistableRedactedEvent } from "../../packages/core/src/index.js";

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

  test("redacts browser-visible expanded text with explicit reason metadata", () => {
    const display = browserVisibleEntryText(
      {
        id: "red-team-browser",
        dayKey: "2026-05-03",
        source: "gateway",
        kind: "assistant_message",
        title: "OpenClaw response",
        body: [
          "Authorization: Bearer browser-secret",
          "cookie: session=raw-cookie",
          "SMTP_PASSWORD=smtp-secret",
          "raw Gateway frame {\"headers\":{\"authorization\":\"Bearer nope\"}}",
          "/Users/m4/OpenClog/.env"
        ].join("\n"),
        timestamp: "2026-05-03T12:00:00.000Z",
        status: "info",
        severity: "info",
        redacted: true
      },
      { expanded: true }
    );

    expect(display.body).not.toMatch(/browser-secret|raw-cookie|smtp-secret|Bearer nope|\.env/);
    expect(display.redactions.map((redaction) => redaction.reason)).toEqual(
      expect.arrayContaining(["auth_header", "cookie", "smtp", "raw_gateway_payload", "unsafe_local_path"])
    );
  });

  test("native Stitch integration does not import remote generated assets", () => {
    const scanned = collectSourceFiles(process.cwd(), [
      "apps/web/src",
      "packages/core/src",
      "scripts"
    ]);
    const forbidden = /cdn\.tailwindcss|fonts\.googleapis|fonts\.gstatic|lh3\.googleusercontent|Material Symbols|material-symbols|googleapis\.com\/css|<script[^>]+https?:\/\//i;
    const matches = scanned.flatMap((file) => {
      const content = readFileSync(file, "utf8");
      return forbidden.test(content) ? [file] : [];
    });

    expect(matches).toEqual([]);
  });
});

function collectSourceFiles(root: string, relativeDirs: string[]): string[] {
  const files: string[] = [];
  for (const relativeDir of relativeDirs) walk(join(root, relativeDir), files);
  return files.filter((file) => /\.(css|html|js|jsx|mjs|cjs|ts|tsx|svg)$/.test(file));
}

function walk(path: string, files: string[]): void {
  const stat = statSync(path);
  if (stat.isFile()) {
    files.push(path);
    return;
  }
  for (const child of readdirSync(path)) {
    if (child === "node_modules" || child === "dist" || child === "coverage" || child === "test-results") continue;
    walk(join(path, child), files);
  }
}
