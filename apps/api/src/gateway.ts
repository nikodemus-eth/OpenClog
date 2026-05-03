import type { GatewayNegotiatedState } from "@openclog/core";

export interface GatewayCall {
  method: string;
  params: Record<string, unknown>;
}

export interface GatewayPort {
  calls: GatewayCall[];
  getState(): GatewayNegotiatedState & { stale?: boolean };
  request(method: string, params: Record<string, unknown>): Promise<unknown>;
}

