import type { GatewayNegotiatedState } from "@openclog/core";
import type { GatewayEventLike } from "@openclog/core";

export interface GatewayServiceRecoveryState {
  enabled: boolean;
  lastAttemptAt?: string;
  lastReason?: string;
  lastResult?: "success" | "failed" | "skipped";
  nextAllowedAt?: string;
  restartCount: number;
}

export interface GatewayRuntimeState extends GatewayNegotiatedState {
  connectionStatus?: "connected" | "connecting" | "disconnected";
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  lastErrorReason?: string;
  nextReconnectAt?: string;
  reconnectAttempt?: number;
  serviceRecovery?: GatewayServiceRecoveryState;
  stale?: boolean;
}

export interface GatewayCall {
  method: string;
  params: Record<string, unknown>;
}

export interface GatewayPort {
  calls: GatewayCall[];
  close?: () => void;
  getState(): GatewayRuntimeState;
  onEvent(listener: (event: GatewayEventLike) => void): () => void;
  request(method: string, params: Record<string, unknown>): Promise<unknown>;
}
