import { assertDottedGatewayMethod, type GatewayNegotiatedState, requiredOperatorScopes } from "@openclog/core";
import type { GatewayCall, GatewayPort } from "./gateway.js";

export interface MemoryGatewayOptions {
  ready?: boolean;
}

export function createMemoryGateway(options: MemoryGatewayOptions = {}): GatewayPort {
  const calls: GatewayCall[] = [];
  const state: GatewayNegotiatedState & { stale?: boolean } = options.ready
    ? { status: "ready", role: "operator", scopes: [...requiredOperatorScopes], missingScopes: [], canIssueControlActions: true, stale: false }
    : { status: "degraded", role: "operator", scopes: ["operator.read", "operator.write"], missingScopes: ["operator.approvals"], canIssueControlActions: false, stale: true };
  return {
    calls,
    getState() {
      return { ...state };
    },
    async request(method, params) {
      assertDottedGatewayMethod(method);
      calls.push({ method, params });
      if (method === "sessions.create") return { key: "agent:hugin:main" };
      if (method === "exec.approval.list") return { approvals: [] };
      return { ok: true };
    }
  };
}
