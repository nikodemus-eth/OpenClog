import { redactGatewayPayload, stableHash } from "./redaction.js";
import type { GatewayEventLike, JournalEntry } from "./types.js";

export function normalizeGatewayEvent(event: GatewayEventLike): JournalEntry {
  const payload = asRecord(event.payload);
  const message = asRecord(payload.message);
  const timestamp = toTimestamp(payload.ts ?? payload.createdAtMs ?? message.timestamp);
  const dayKey = timestamp.slice(0, 10);
  const base = { id: normalizedEventId(event), dayKey, timestamp, rawEventHash: stableHash(event), redacted: true };
  if (event.event === "session.message") return normalizeSessionMessage(payload, base);
  if (event.event === "chat") return normalizeSessionMessage(payload, base);
  if (event.event === "session.tool") return normalizeTool(payload, base);
  if (event.event === "exec.approval.requested") return normalizeApprovalRequested(payload, base);
  if (event.event === "exec.approval.resolved") return normalizeApprovalResolved(payload, base);
  if (event.event === "sequence.gap") return normalizeSequenceGap(payload, base);
  return {
    ...base,
    source: "gateway",
    kind: "system_status",
    title: event.event,
    body: JSON.stringify(payload),
    status: "info",
    severity: "info"
  };
}

function normalizeSessionMessage(payload: Record<string, unknown>, base: BaseEntry): JournalEntry {
  const message = asRecord(payload.message);
  const role = stringValue(payload.role) || stringValue(message.role);
  const source = role === "user" ? "user" : "openclaw";
  return {
    ...base,
    source,
    kind: role === "user" ? "user_message" : "assistant_message",
    title: role === "user" ? "User message" : "OpenClaw response",
    body: redactedText(stringValue(payload.text) || stringValue(message.text) || contentText(message.content)),
    sessionId: stringValue(payload.key) || stringValue(payload.sessionKey),
    status: "info",
    severity: "info"
  };
}

function normalizeTool(payload: Record<string, unknown>, base: BaseEntry): JournalEntry {
  const data = asRecord(payload.data);
  return {
    ...base,
    source: "tool",
    kind: "tool_result",
    title: "Tool call",
    body: redactedText(stringValue(payload.body) || stringValue(data.text) || stringValue(data.result)) || `Called ${stringValue(payload.toolName) || stringValue(data.name)}.`,
    sessionId: stringValue(payload.key) || stringValue(payload.sessionKey),
    toolName: stringValue(payload.toolName) || stringValue(data.name),
    status: statusValue(payload.status ?? data.phase),
    severity: payload.status === "failed" || data.phase === "error" ? "error" : "info"
  };
}

function normalizeApprovalRequested(payload: Record<string, unknown>, base: BaseEntry): JournalEntry {
  const request = asRecord(payload.request);
  return {
    ...base,
    source: "gateway",
    kind: "approval_requested",
    title: "Approval requested",
    body: stringValue(request.command),
    approvalId: stringValue(payload.id),
    status: "pending",
    severity: "warning",
    actions: [
      { id: "approve", label: "Approve", kind: "approve" },
      { id: "decline", label: "Decline", kind: "decline", danger: true }
    ]
  };
}

function normalizeApprovalResolved(payload: Record<string, unknown>, base: BaseEntry): JournalEntry {
  return {
    ...base,
    source: "gateway",
    kind: "approval_resolved",
    title: "Approval resolved",
    body: stringValue(payload.decision),
    approvalId: stringValue(payload.id),
    status: payload.decision === "allow-once" || payload.decision === "allow-always" ? "approved" : "declined",
    severity: "info"
  };
}

function normalizeSequenceGap(payload: Record<string, unknown>, base: BaseEntry): JournalEntry {
  return {
    ...base,
    source: "gateway",
    kind: "system_status",
    title: "Gateway event sequence gap",
    body: `Expected ${String(payload.expected)} but received ${String(payload.received)}. Rebuilding visible state.`,
    status: "failed",
    severity: "warning"
  };
}

type BaseEntry = Pick<JournalEntry, "id" | "dayKey" | "timestamp" | "rawEventHash" | "redacted">;

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      const block = asRecord(item);
      return stringValue(block.text) || stringValue(block.content);
    })
    .filter(Boolean)
    .join("\n");
}

function normalizedEventId(event: GatewayEventLike): string {
  const payload = asRecord(event.payload);
  const message = asRecord(payload.message);
  return stableHash({
    event: event.event,
    sessionKey: stringValue(payload.sessionKey) || stringValue(payload.key),
    messageIdentity: payload.messageSeq ?? stringValue(payload.messageId),
    role: stringValue(payload.role) || stringValue(message.role),
    text: stringValue(payload.text) || stringValue(message.text) || contentText(message.content),
    approvalId: stringValue(payload.id),
    seq: event.seq
  });
}

function redactedText(value: string): string {
  return String(redactGatewayPayload(value).redacted);
}

function statusValue(value: unknown): JournalEntry["status"] {
  return value === "success" || value === "failed" || value === "running" ? value : "info";
}

function toTimestamp(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
  return new Date("2026-05-02T12:00:00.000Z").toISOString();
}
