import type { PersistableRedactedEvent } from "./types.js";

const secretKeyPattern = /(?:token|authorization|cookie|password|secret|api[_-]?key|env|rawtoolpayload|headers)/i;
const secretTextPattern = /(Bearer\s+)[A-Za-z0-9._~+/=-]+|((?:token|password|api[_-]?key|cookie)=)[^\s"'`]+|(sk-[A-Za-z0-9_-]+)/gi;

export interface RedactionReport {
  redactionCount: number;
  redactedPaths: string[];
}

export interface RedactionResult {
  redacted: unknown;
  hash: string;
  report: RedactionReport;
}

export function stableHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function redactGatewayPayload(payload: unknown): RedactionResult {
  const report: RedactionReport = { redactionCount: 0, redactedPaths: [] };
  const redacted = redactValue(payload, "$", report);
  return { redacted, hash: stableHash(payload), report };
}

export function toPersistableRedactedEvent(event: unknown): PersistableRedactedEvent {
  const result = redactGatewayPayload(event);
  return {
    raw_event_redacted_json: JSON.stringify(result.redacted),
    raw_event_hash: result.hash,
    redaction_report_json: JSON.stringify(result.report)
  };
}

function redactValue(value: unknown, path: string, report: RedactionReport): unknown {
  if (typeof value === "string") return redactString(value, path, report);
  if (Array.isArray(value)) return value.map((item, index) => redactValue(item, `${path}[${index}]`, report));
  if (value !== null && typeof value === "object") return redactObject(value as Record<string, unknown>, path, report);
  return value;
}

function redactObject(value: Record<string, unknown>, path: string, report: RedactionReport): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const nextPath = `${path}.${key}`;
      if (secretKeyPattern.test(key)) return [key, redactSecret(nextPath, report)];
      return [key, redactValue(item, nextPath, report)];
    })
  );
}

function redactString(value: string, path: string, report: RedactionReport): string {
  if (!secretTextPattern.test(value)) return value;
  secretTextPattern.lastIndex = 0;
  report.redactionCount += 1;
  report.redactedPaths.push(path);
  return value.replace(secretTextPattern, (_match, bearerPrefix: string | undefined, assignmentPrefix: string | undefined) => {
    if (bearerPrefix) return `${bearerPrefix}[REDACTED_SECRET]`;
    if (assignmentPrefix) return `${assignmentPrefix}[REDACTED_SECRET]`;
    return "[REDACTED_SECRET]";
  });
}

function redactSecret(path: string, report: RedactionReport): string {
  report.redactionCount += 1;
  report.redactedPaths.push(path);
  return "[REDACTED_SECRET]";
}
