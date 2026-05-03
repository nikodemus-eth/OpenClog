import type { JournalEntry } from "@openclog/core";

const previewLimit = 260;

const lineRedactionPatterns = [
  /authorization:\s*bearer\s+[^\s,;]+/gi,
  /cookie:\s*[^\n]+/gi,
  /\b(?:openclaw_gateway_token|gateway_token|api[_-]?key|access[_-]?token|refresh[_-]?token|oauth[_-]?[a-z_]*token|smtp[_-]?password|password|secret)\s*[:=]\s*[^\s,;]+/gi,
  /\b(?:oc_token|sk-[a-z0-9_-]+|ghp_[a-z0-9_]+)[a-z0-9_-]*/gi
];

const rawPayloadPattern = /raw_event|raw gateway|gateway frame|"authorization"|"cookie"|"headers"|"env"|process\.env/i;
const localPathPattern = /(?:\/Users|\/opt|\/private|\/var|\/tmp)\/[^\s'")\]}]+/g;

export interface TimelineDisplayText {
  body: string;
  expanded: boolean;
  hasMore: boolean;
}

export function timelineDisplayText(entry: JournalEntry, expanded: boolean): TimelineDisplayText {
  const safeBody = sanitizeBrowserVisibleText(entry.body ?? "");
  const hasMore = safeBody.length > previewLimit;
  return {
    body: hasMore && !expanded ? `${safeBody.slice(0, previewLimit).trimEnd()}...` : safeBody,
    expanded,
    hasMore: hasMore && !expanded
  };
}

export function sanitizeBrowserVisibleText(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => sanitizeLine(line))
    .join("\n")
    .trim();
}

function sanitizeLine(line: string): string {
  const withoutPayload = rawPayloadPattern.test(line) ? "[REDACTED_PAYLOAD]" : line;
  return lineRedactionPatterns.reduce((current, pattern) => current.replace(pattern, "[REDACTED_SECRET]"), withoutPayload).replace(localPathPattern, "[LOCAL_PATH]");
}
