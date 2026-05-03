import type { JournalEntry, JournalEntryKind, JournalEntrySource, JournalEntryStatus, JournalSeverity } from "./types.js";

const previewLimit = 260;
const groupWindowMs = 120_000;
const staleProductTitlePattern = new RegExp(`\\b${["OpenClaw", "Journal"].join(" ")}\\b`, "g");

export type BrowserRedactionReason =
  | "credential"
  | "token_like"
  | "auth_header"
  | "cookie"
  | "oauth"
  | "smtp"
  | "env_assignment"
  | "raw_gateway_payload"
  | "unsafe_local_path"
  | "long_preview";

export interface BrowserVisibleRedaction {
  reason: BrowserRedactionReason;
}

export interface BrowserVisibleText {
  body: string;
  expanded: boolean;
  hasMore: boolean;
  redactions: BrowserVisibleRedaction[];
}

export type TimelineGroupingReason = "adjacent_similar_low_value";

export type TimelineDisplayItem =
  | { kind: "entry"; entry: JournalEntry }
  | {
      kind: "group";
      id: string;
      entryIds: string[];
      entries: JournalEntry[];
      count: number;
      firstTimestamp: string;
      lastTimestamp: string;
      actorLabel?: string;
      source: JournalEntrySource;
      eventKind: JournalEntryKind;
      status: JournalEntryStatus | "info";
      sanitizedBodySignature: string;
      groupingReason: TimelineGroupingReason;
      title: string;
    };

export function displayProductCopy(value: string): string {
  return value.replace(staleProductTitlePattern, "OpenClog Journal");
}

export function browserVisibleEntryText(entry: JournalEntry, options: { expanded: boolean }): BrowserVisibleText {
  const safe = sanitizeBrowserVisibleText(entry.body ?? "", entry);
  const hasMore = safe.body.length > previewLimit;
  const redactions = [...safe.redactions];
  if (hasMore && !options.expanded) redactions.push({ reason: "long_preview" });
  return {
    body: hasMore && !options.expanded ? `${safe.body.slice(0, previewLimit).trimEnd()}...` : safe.body,
    expanded: options.expanded,
    hasMore: hasMore && !options.expanded,
    redactions: dedupeRedactions(redactions)
  };
}

export function buildTimelineDisplayItems(entries: JournalEntry[], options: { grouped: boolean }): TimelineDisplayItem[] {
  const orderedEntries = newestFirst(entries);
  if (!options.grouped) return orderedEntries.map((entry) => ({ kind: "entry", entry }));

  const items: TimelineDisplayItem[] = [];
  for (let index = 0; index < orderedEntries.length; index += 1) {
    const entry = orderedEntries[index];
    if (!isGroupableEntry(entry)) {
      items.push({ kind: "entry", entry });
      continue;
    }

    const run = [entry];
    const newestMs = timestampMs(entry.timestamp);
    let nextIndex = index + 1;
    while (nextIndex < orderedEntries.length && isSimilarGroupEntry(entry, orderedEntries[nextIndex], newestMs)) {
      run.push(orderedEntries[nextIndex]);
      nextIndex += 1;
    }

    if (run.length >= 3) {
      items.push(buildGroup(run));
      index = nextIndex - 1;
    } else {
      items.push(...run.map((runEntry) => ({ kind: "entry" as const, entry: runEntry })));
      index = nextIndex - 1;
    }
  }
  return items;
}

export function formatTimelineGroupSummary(group: Extract<TimelineDisplayItem, { kind: "group" }>): string {
  return `${group.count} similar ${groupLabel(group)} between ${formatDisplayTime(group.firstTimestamp)} and ${formatDisplayTime(group.lastTimestamp)}. Grouping is display-only; full redacted journal history is preserved.`;
}

export function entryBelongsToGroup(group: TimelineDisplayItem, entryId: string): boolean {
  return group.kind === "group" && group.entryIds.includes(entryId);
}

function sanitizeBrowserVisibleText(value: string, entry: JournalEntry): { body: string; redactions: BrowserVisibleRedaction[] } {
  const redactions: BrowserVisibleRedaction[] = [];
  const body = value
    .split(/\r?\n/)
    .map((line) => sanitizeLine(line, entry, redactions))
    .join("\n")
    .trim();
  return { body, redactions: dedupeRedactions(redactions) };
}

function sanitizeLine(line: string, entry: JournalEntry, redactions: BrowserVisibleRedaction[]): string {
  let current = displayProductCopy(line);
  if (rawPayloadPattern.test(current)) {
    redactions.push({ reason: "raw_gateway_payload" });
    return "[REDACTED_PAYLOAD]";
  }
  for (const rule of redactionRules) {
    current = current.replace(rule.pattern, () => {
      redactions.push({ reason: rule.reason });
      return "[REDACTED_SECRET]";
    });
  }
  if (!allowsLocalPath(entry.kind)) {
    current = current.replace(localPathPattern, () => {
      redactions.push({ reason: "unsafe_local_path" });
      return "[LOCAL_PATH]";
    });
  }
  return current;
}

const redactionRules: Array<{ pattern: RegExp; reason: BrowserRedactionReason }> = [
  { pattern: /authorization:\s*bearer\s+[^\s,;]+/gi, reason: "auth_header" },
  { pattern: /cookie:\s*[^\n]+/gi, reason: "cookie" },
  { pattern: /\boauth[_-]?[a-z_]*token\s*[:=]\s*[^\s,;]+/gi, reason: "oauth" },
  { pattern: /\bsmtp[_-]?password\s*[:=]\s*[^\s,;]+/gi, reason: "smtp" },
  { pattern: /\b(?:openclaw_gateway_token|gateway_token|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*[^\s,;]+/gi, reason: "token_like" },
  { pattern: /\b(?:oc_token|sk-[a-z0-9_-]+|ghp_[a-z0-9_]+)[a-z0-9_-]*/gi, reason: "token_like" },
  { pattern: /\b[A-Z][A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|KEY)\s*=\s*[^\s,;]+/g, reason: "env_assignment" },
  { pattern: /\b(?:password|secret|credential)\s*[:=]\s*[^\s,;]+/gi, reason: "credential" }
];

const rawPayloadPattern = /raw_event|raw gateway|gateway frame|"authorization"|"cookie"|"headers"|"env"|process\.env/i;
const localPathPattern = /(?:\/Users|\/opt|\/private|\/var|\/tmp)\/[^\s'")\]}]+/g;

function allowsLocalPath(kind: JournalEntryKind): boolean {
  return kind === "note" || kind === "user_message" || kind === "approval_requested" || kind === "approval_resolved";
}

function dedupeRedactions(redactions: BrowserVisibleRedaction[]): BrowserVisibleRedaction[] {
  return [...new Set(redactions.map((redaction) => redaction.reason))].map((reason) => ({ reason }));
}

function newestFirst(entries: JournalEntry[]): JournalEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((left, right) => {
      const timestampOrder = timestampMs(right.entry.timestamp) - timestampMs(left.entry.timestamp);
      return timestampOrder === 0 ? left.index - right.index : timestampOrder;
    })
    .map(({ entry }) => entry);
}

function isSimilarGroupEntry(anchor: JournalEntry, candidate: JournalEntry, newestMs: number): boolean {
  return (
    isGroupableEntry(candidate) &&
    Math.abs(newestMs - timestampMs(candidate.timestamp)) <= groupWindowMs &&
    groupActor(anchor) === groupActor(candidate) &&
    anchor.source === candidate.source &&
    anchor.kind === candidate.kind &&
    groupStatus(anchor) === groupStatus(candidate) &&
    bodySignature(anchor) === bodySignature(candidate)
  );
}

function isGroupableEntry(entry: JournalEntry): boolean {
  return (
    (entry.kind === "assistant_message" || entry.kind === "tool_call" || entry.kind === "tool_result") &&
    !entry.approvalId &&
    !entry.actions?.length &&
    isLowValueStatus(entry.status) &&
    isLowValueSeverity(entry.severity)
  );
}

function isLowValueStatus(status: JournalEntryStatus | undefined): boolean {
  return status === undefined || status === "info" || status === "success";
}

function isLowValueSeverity(severity: JournalSeverity | undefined): boolean {
  return severity === undefined || severity === "info";
}

function buildGroup(entries: JournalEntry[]): Extract<TimelineDisplayItem, { kind: "group" }> {
  const sortedChronological = [...entries].sort((left, right) => timestampMs(left.timestamp) - timestampMs(right.timestamp));
  const anchor = entries[0];
  return {
    kind: "group",
    id: `group-${entries.map((entry) => entry.id).join("-")}`,
    entryIds: entries.map((entry) => entry.id),
    entries,
    count: entries.length,
    firstTimestamp: sortedChronological[0].timestamp,
    lastTimestamp: sortedChronological[sortedChronological.length - 1].timestamp,
    ...(anchor.actorLabel ? { actorLabel: anchor.actorLabel } : {}),
    source: anchor.source,
    eventKind: anchor.kind,
    status: groupStatus(anchor),
    sanitizedBodySignature: bodySignature(anchor),
    groupingReason: "adjacent_similar_low_value",
    title: displayProductCopy(anchor.title)
  };
}

function bodySignature(entry: JournalEntry): string {
  const body = browserVisibleEntryText(entry, { expanded: true }).body.replace(/\[(?:REDACTED_SECRET|REDACTED_PAYLOAD|LOCAL_PATH)\]/g, "");
  return normalizeSignature(`${displayProductCopy(entry.title)} ${body}`);
}

function normalizeSignature(value: string): string {
  return value.toLocaleLowerCase().replace(/\d+/g, "#").replace(/[^\p{Letter}\p{Number}\s#-]/gu, " ").replace(/\s+/g, " ").trim();
}

function groupActor(entry: JournalEntry): string {
  return `${entry.actorLabel ?? ""}:${entry.source}`;
}

function groupStatus(entry: JournalEntry): JournalEntryStatus | "info" {
  return entry.status ?? "info";
}

function timestampMs(timestamp: string): number {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDisplayTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function groupLabel(group: Extract<TimelineDisplayItem, { kind: "group" }>): string {
  if (group.source === "openclaw" && group.eventKind === "assistant_message") return "OpenClaw responses";
  if (group.eventKind === "tool_call" || group.eventKind === "tool_result") return "tool events";
  return `${group.source} events`;
}
