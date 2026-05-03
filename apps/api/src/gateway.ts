import type { GatewayNegotiatedState } from "@openclog/core";
import type { GatewayEventLike } from "@openclog/core";

export interface GatewayCall {
  method: string;
  params: Record<string, unknown>;
}

export interface GatewayPort {
  calls: GatewayCall[];
  getState(): GatewayNegotiatedState & { stale?: boolean };
  onEvent(listener: (event: GatewayEventLike) => void): () => void;
  request(method: string, params: Record<string, unknown>): Promise<unknown>;
}
