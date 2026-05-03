import { assertDottedGatewayMethod, type GatewayEventLike, requiredOperatorScopes } from "@openclog/core";
import type { GatewayCall, GatewayPort, GatewayRuntimeState } from "./gateway.js";

export interface MemoryGatewayOptions {
  ready?: boolean;
}

export interface MemoryGateway extends GatewayPort {
  emit(event: GatewayEventLike): void;
}

export function createMemoryGateway(options: MemoryGatewayOptions = {}): MemoryGateway {
  const calls: GatewayCall[] = [];
  const listeners = new Set<(event: GatewayEventLike) => void>();
  const state: GatewayRuntimeState = options.ready
    ? { status: "ready", role: "operator", scopes: [...requiredOperatorScopes], missingScopes: [], canIssueControlActions: true, stale: false }
    : { status: "degraded", role: "operator", scopes: ["operator.read", "operator.write"], missingScopes: ["operator.approvals"], canIssueControlActions: false, stale: true };
  return {
    calls,
    close: () => {},
    emit(event) {
      for (const listener of listeners) listener(event);
    },
    getState() {
      return { ...state };
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
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
