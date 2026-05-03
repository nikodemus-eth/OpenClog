import type { GatewayMethod } from "./protocol.js";

export type ComposerMode = "note" | "ask" | "command";

export interface ComposerClassification {
  mode: ComposerMode;
  body: string;
  gatewayMethod: GatewayMethod | null;
  createSessionFirst: boolean;
  blocked: boolean;
  reason?: string;
}

const blockedSlashPrefixes = ["/config", "/secrets", "/pairing", "/install", "/update"] as const;

export function classifyComposerInput(input: string): ComposerClassification {
  const trimmed = input.trim();
  const blockedPrefix = blockedSlashPrefixes.find((prefix) => trimmed.toLowerCase().startsWith(prefix));
  if (blockedPrefix) return blockedCommand(blockedPrefix);
  if (trimmed.toLowerCase().startsWith("/note")) return note(trimmed.slice(5).trim());
  if (trimmed.toLowerCase().startsWith("note:")) return note(trimmed.slice(5).trim());
  if (trimmed.toLowerCase().startsWith("/ask")) return gateway("ask", trimmed.slice(4).trim());
  if (trimmed.toLowerCase().startsWith("/cmd")) return gateway("command", trimmed.slice(4).trim());
  return gateway(inferMode(trimmed), trimmed);
}

function note(body: string): ComposerClassification {
  return { mode: "note", body, gatewayMethod: null, createSessionFirst: false, blocked: false };
}

function gateway(mode: "ask" | "command", body: string): ComposerClassification {
  return { mode, body, gatewayMethod: "sessions.send", createSessionFirst: true, blocked: false };
}

function blockedCommand(prefix: string): ComposerClassification {
  return {
    mode: "command",
    body: prefix,
    gatewayMethod: null,
    createSessionFirst: false,
    blocked: true,
    reason: `${prefix} requires a scope outside operator.read, operator.write, and operator.approvals`
  };
}

function inferMode(value: string): "ask" | "command" {
  return /^(create|run|start|stop|abort|open|send|deploy)\b/i.test(value) ? "command" : "ask";
}

