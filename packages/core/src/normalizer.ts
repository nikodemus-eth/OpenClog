import { stableHash } from "./redaction.js";
import type { GatewayEventLike, JournalEntry } from "./types.js";

export function normalizeGatewayEvent(event: GatewayEventLike): JournalEntry {
  const payload = asRecord(event.payload);
  const timestamp = toTimestamp(payload.ts ?? payload.createdAtMs);
  const dayKey = timestamp.slice(0, 10);
  const base = { id: stableHash(event), dayKey, timestamp, rawEventHash: stableHash(event), redacted: true };
  if (event.event === "session.message") return normalizeSessionMessage(payload, base);
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
  const role = stringValue(payload.role);
  const source = role === "user" ? "user" : "openclaw";
  return {
    ...base,
    source,
    kind: role === "user" ? "user_message" : "assistant_message",
    title: role === "user" ? "User message" : "OpenClaw response",
    body: stringValue(payload.text),
    sessionId: stringValue(payload.key),
    status: "info",
    severity: "info"
  };
}

function normalizeTool(payload: Record<string, unknown>, base: BaseEntry): JournalEntry {
  return {
    ...base,
    source: "tool",
    kind: "tool_result",
    title: "Tool call",
    body: stringValue(payload.body) || `Called ${stringValue(payload.toolName)}.`,
    sessionId: stringValue(payload.key),
    toolName: stringValue(payload.toolName),
    status: statusValue(payload.status),
    severity: payload.status === "failed" ? "error" : "info"
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

function statusValue(value: unknown): JournalEntry["status"] {
  return value === "success" || value === "failed" || value === "running" ? value : "info";
}

function toTimestamp(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  return new Date("2026-05-02T12:00:00.000Z").toISOString();
}

