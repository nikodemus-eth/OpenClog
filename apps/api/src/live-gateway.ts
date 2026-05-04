import { execFile } from "node:child_process";
import { promisify } from "node:util";
import WebSocket from "ws";
import {
  assertDottedGatewayMethod,
  buildConnectRequest,
  buildReconnectPlan,
  evaluateHelloOk,
  isLoopbackGatewayUrl,
  redactGatewayPayload,
  type HelloOkLike
} from "@openclog/core";
import type { GatewayEventLike } from "@openclog/core";
import { buildSignedGatewayDevice, classifyGatewayConnectionError, type OpenClawDeviceIdentity } from "./device-auth.js";
import type { GatewayCall, GatewayPort, GatewayRuntimeState, GatewayServiceRecoveryState } from "./gateway.js";

const execFileAsync = promisify(execFile);

export interface LiveGatewayOptions {
  activeSessionKey?: string;
  deviceIdentity?: OpenClawDeviceIdentity;
  deviceIdentityProvider?: () => OpenClawDeviceIdentity | undefined;
  heartbeatMs?: number;
  reconnect?: {
    initialDelayMs?: number;
    jitterMs?: number;
    maxDelayMs?: number;
  };
  serviceRecovery?: {
    cooldownMs?: number;
    enabled?: boolean;
    failureThreshold?: number;
    minFailureWindowMs?: number;
    platform?: NodeJS.Platform;
    restartGatewayService?: () => Promise<void>;
  };
  timeoutMs?: number;
  token?: string;
  tokenProvider?: () => string | undefined;
  url: string;
}

export async function createLiveGateway(options: LiveGatewayOptions): Promise<GatewayPort> {
  const gateway = new LiveGateway(options);
  await gateway.start();
  return gateway;
}

class LiveGateway implements GatewayPort {
  readonly calls: GatewayCall[] = [];
  private closed = false;
  private consecutiveFailures = 0;
  private counter = 0;
  private eventListeners = new Set<(event: GatewayEventLike) => void>();
  private firstFailureAtMs: number | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastEventSeq: number | null = null;
  private pending = new Map<string, { reject: (error: Error) => void; resolve: (value: unknown) => void; timer: NodeJS.Timeout }>();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private serviceRecovery: GatewayServiceRecoveryState = {
    enabled: false,
    restartCount: 0
  };
  private state: GatewayRuntimeState = {
    status: "degraded",
    role: "operator",
    scopes: [],
    missingScopes: [],
    canIssueControlActions: false,
    connectionStatus: "disconnected",
    reconnectAttempt: 0,
    stale: true
  };
  private ws: WebSocket | null = null;

  constructor(private readonly options: LiveGatewayOptions) {
    this.serviceRecovery.enabled = options.serviceRecovery?.enabled === true;
    this.state.serviceRecovery = { ...this.serviceRecovery };
  }

  async start(): Promise<void> {
    if (!isLoopbackGatewayUrl(this.options.url)) {
      throw new Error("remote/non-loopback Gateway URL blocked for backend gateway-client auth");
    }
    try {
      await this.openAndNegotiate();
    } catch (error) {
      this.recordConnectionFailure(error);
      this.scheduleReconnect();
    }
  }

  close(): void {
    this.closed = true;
    this.clearReconnectTimer();
    this.clearHeartbeatTimer();
    this.rejectPending(new Error("Gateway connection closed"));
    this.ws?.removeAllListeners();
    this.ws?.close();
    this.ws = null;
  }

  getState(): GatewayRuntimeState {
    return {
      ...this.state,
      missingScopes: [...this.state.missingScopes],
      scopes: [...this.state.scopes],
      serviceRecovery: this.state.serviceRecovery ? { ...this.state.serviceRecovery } : undefined
    };
  }

  onEvent(listener: (event: GatewayEventLike) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  async request(method: string, params: Record<string, unknown>, id = `req-${++this.counter}`, allowWhileConnecting = false): Promise<unknown> {
    assertDottedGatewayMethod(method);
    if (!allowWhileConnecting && this.state.connectionStatus !== "connected") throw new Error("Gateway reconnecting; control actions are temporarily unavailable");
    if (!allowWhileConnecting && !this.state.canIssueControlActions) throw new Error("Gateway control actions blocked until required scopes are negotiated");
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("Gateway socket is not open");
    this.calls.push({ method, params: redactGatewayPayload(params).redacted as Record<string, unknown> });
    const promise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        const error = new Error(`Gateway request timeout: ${method}`);
        if (!allowWhileConnecting) this.handleConnectionProblem(error);
        reject(error);
      }, this.timeoutMs());
      this.pending.set(id, { resolve, reject, timer });
    });
    this.ws.send(JSON.stringify({ type: "req", id, method, params }));
    return promise;
  }

  private async openAndNegotiate(): Promise<void> {
    this.clearHeartbeatTimer();
    const socket = new WebSocket(this.options.url);
    this.ws = socket;
    this.setConnectingState();
    socket.on("message", (raw) => this.handleFrame(socket, raw));
    socket.on("close", () => this.handleSocketClosed(socket, new Error("Gateway socket closed")));
    socket.on("error", (error) => this.handleSocketClosed(socket, error instanceof Error ? error : new Error(String(error))));
    const challenge = await this.waitForChallenge(socket);
    const token = this.readToken();
    const deviceIdentity = this.readDeviceIdentity();
    const frame = buildConnectRequest({
      id: "connect",
      nonce: challenge,
      token,
      device:
        deviceIdentity && token
          ? buildSignedGatewayDevice({
              identity: deviceIdentity,
              nonce: challenge,
              platform: process.platform,
              token
            })
          : undefined,
      platform: process.platform,
      instanceId: "openclog-api"
    });
    const hello = (await this.request(frame.method, frame.params, frame.id, true)) as HelloOkLike;
    this.state = {
      ...evaluateHelloOk(hello),
      connectionStatus: "connected",
      lastConnectedAt: new Date().toISOString(),
      lastDisconnectedAt: this.state.lastDisconnectedAt,
      lastErrorReason: undefined,
      lastLiveEventAt: this.state.lastLiveEventAt,
      nextReconnectAt: undefined,
      reconnectCount: (this.state.reconnectCount ?? 0) + 1,
      reconnectAttempt: 0,
      serviceRecovery: { ...this.serviceRecovery },
      stale: false
    };
    this.consecutiveFailures = 0;
    this.firstFailureAtMs = null;
    if (this.state.canIssueControlActions) {
      for (const call of buildReconnectPlan(this.options.activeSessionKey ?? "agent:highfather:main")) {
        await this.request(call.method, call.params);
      }
      this.emitGatewayEvent("gateway.reconnected", { status: "ready", ts: Date.now() });
      this.startHeartbeat();
    }
  }

  private handleFrame(socket: WebSocket, raw: WebSocket.RawData): void {
    if (socket !== this.ws) return;
    const frame = JSON.parse(String(raw)) as { error?: { message?: string }; event?: string; id?: string; ok?: boolean; payload?: unknown; seq?: number; type?: string };
    if (frame.type === "event" && frame.event) {
      this.emitEvent({ event: frame.event, payload: frame.payload, seq: frame.seq });
      return;
    }
    if (frame.type !== "res" || !frame.id) return;
    const pending = this.pending.get(frame.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(frame.id);
    if (frame.ok) pending.resolve(frame.payload);
    else pending.reject(new Error(frame.error?.message ?? "Gateway request failed"));
  }

  private emitEvent(event: GatewayEventLike): void {
    this.state = {
      ...this.state,
      lastLiveEventAt: new Date().toISOString()
    };
    if (typeof event.seq === "number") {
      if (this.lastEventSeq !== null && event.seq !== this.lastEventSeq + 1) {
        this.notifyListeners({
          event: "sequence.gap",
          payload: {
            expected: this.lastEventSeq + 1,
            received: event.seq,
            ts: Date.now()
          }
        });
      }
      this.lastEventSeq = event.seq;
    }
    this.notifyListeners(event);
  }

  private emitGatewayEvent(event: string, payload: Record<string, unknown>): void {
    this.notifyListeners({ event, payload });
  }

  private notifyListeners(event: GatewayEventLike): void {
    for (const listener of this.eventListeners) listener(event);
  }

  private handleConnectionProblem(error: Error): void {
    this.handleSocketClosed(this.ws, error);
  }

  private handleSocketClosed(socket: WebSocket | null, error: Error): void {
    if (this.closed || socket !== this.ws) return;
    this.recordDisconnect(error);
    this.scheduleReconnect();
  }

  private recordDisconnect(error: Error): void {
    this.clearHeartbeatTimer();
    this.rejectPending(error);
    this.ws?.removeAllListeners();
    this.ws = null;
    this.state = {
      ...this.state,
      canIssueControlActions: false,
      connectionStatus: "connecting",
      lastDisconnectedAt: new Date().toISOString(),
      lastErrorReason: classifyGatewayConnectionError(error),
      status: this.state.status === "blocked" ? "blocked" : "degraded",
      stale: true
    };
  }

  private recordConnectionFailure(error: unknown): void {
    const now = Date.now();
    this.consecutiveFailures += 1;
    this.firstFailureAtMs ??= now;
    this.clearHeartbeatTimer();
    this.rejectPending(error instanceof Error ? error : new Error(String(error)));
    this.ws?.removeAllListeners();
    this.ws = null;
    this.state = {
      ...this.state,
      canIssueControlActions: false,
      connectionStatus: "connecting",
      lastDisconnectedAt: new Date(now).toISOString(),
      lastErrorReason: classifyGatewayConnectionError(error),
      reconnectAttempt: this.consecutiveFailures,
      status: this.state.status === "blocked" ? "blocked" : "degraded",
      stale: true
    };
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    const delayMs = this.reconnectDelayMs(this.consecutiveFailures + 1);
    this.state = {
      ...this.state,
      connectionStatus: "connecting",
      nextReconnectAt: new Date(Date.now() + delayMs).toISOString(),
      reconnectAttempt: this.consecutiveFailures
    };
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.reconnectOnce();
    }, delayMs);
  }

  private async reconnectOnce(): Promise<void> {
    try {
      await this.openAndNegotiate();
    } catch (error) {
      this.recordConnectionFailure(error);
      await this.maybeRecoverGatewayService();
      this.scheduleReconnect();
    }
  }

  private async maybeRecoverGatewayService(): Promise<void> {
    const recovery = this.options.serviceRecovery;
    if (recovery?.enabled !== true) return;
    const now = Date.now();
    const cooldownMs = recovery.cooldownMs ?? 300_000;
    const threshold = recovery.failureThreshold ?? 5;
    const minFailureWindowMs = recovery.minFailureWindowMs ?? 60_000;
    const failureWindowMs = this.firstFailureAtMs === null ? 0 : now - this.firstFailureAtMs;
    const nextAllowed = this.serviceRecovery.nextAllowedAt ? Date.parse(this.serviceRecovery.nextAllowedAt) : 0;
    if (
      this.consecutiveFailures < threshold ||
      failureWindowMs < minFailureWindowMs ||
      now < nextAllowed ||
      (recovery.platform ?? process.platform) !== "darwin" ||
      !isLoopbackGatewayUrl(this.options.url) ||
      !isRecoverableForServiceRestart(this.state.lastErrorReason ?? "")
    ) {
      this.serviceRecovery = { ...this.serviceRecovery, enabled: true, lastResult: "skipped" };
      this.state = { ...this.state, serviceRecovery: { ...this.serviceRecovery } };
      return;
    }
    this.serviceRecovery = {
      ...this.serviceRecovery,
      enabled: true,
      lastAttemptAt: new Date(now).toISOString(),
      lastReason: this.state.lastErrorReason,
      nextAllowedAt: new Date(now + cooldownMs).toISOString()
    };
    try {
      await (recovery.restartGatewayService ?? restartLaunchAgentGateway)();
      this.serviceRecovery = {
        ...this.serviceRecovery,
        lastResult: "success",
        restartCount: this.serviceRecovery.restartCount + 1
      };
    } catch {
      this.serviceRecovery = {
        ...this.serviceRecovery,
        lastResult: "failed"
      };
    }
    this.state = { ...this.state, serviceRecovery: { ...this.serviceRecovery } };
  }

  private startHeartbeat(): void {
    const heartbeatMs = this.options.heartbeatMs ?? 30_000;
    if (heartbeatMs <= 0) return;
    this.heartbeatTimer = setTimeout(() => {
      void this.request("health", {})
        .then(() => {
          if (!this.closed && this.state.connectionStatus === "connected") this.startHeartbeat();
        })
        .catch((error) => this.handleConnectionProblem(error instanceof Error ? error : new Error(String(error))));
    }, heartbeatMs);
  }

  private readToken(): string | undefined {
    return this.options.tokenProvider?.() ?? this.options.token;
  }

  private readDeviceIdentity(): OpenClawDeviceIdentity | undefined {
    return this.options.deviceIdentityProvider?.() ?? this.options.deviceIdentity;
  }

  private timeoutMs(): number {
    return this.options.timeoutMs ?? 5000;
  }

  private reconnectDelayMs(attempt: number): number {
    const initialDelayMs = this.options.reconnect?.initialDelayMs ?? 1000;
    const maxDelayMs = this.options.reconnect?.maxDelayMs ?? 30_000;
    const jitterMs = this.options.reconnect?.jitterMs ?? 250;
    const exponential = Math.min(maxDelayMs, initialDelayMs * 2 ** Math.max(0, attempt - 1));
    return exponential + (jitterMs > 0 ? Math.floor(Math.random() * jitterMs) : 0);
  }

  private setConnectingState(): void {
    this.state = {
      ...this.state,
      connectionStatus: "connecting",
      stale: this.state.lastConnectedAt !== undefined
    };
  }

  private rejectPending(error: Error): void {
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  private clearHeartbeatTimer(): void {
    if (!this.heartbeatTimer) return;
    clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private async waitForChallenge(socket: WebSocket): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Gateway connect.challenge timeout")), this.timeoutMs());
      const onMessage = (raw: WebSocket.RawData) => {
        const frame = JSON.parse(String(raw)) as { event?: string; payload?: { nonce?: string }; type?: string };
        if (frame.type !== "event" || frame.event !== "connect.challenge" || !frame.payload?.nonce) return;
        clearTimeout(timer);
        socket.off("message", onMessage);
        resolve(frame.payload.nonce);
      };
      socket.on("message", onMessage);
      socket.once("error", (error) => {
        clearTimeout(timer);
        socket.off("message", onMessage);
        reject(error);
      });
    });
  }
}

function isRecoverableForServiceRestart(reason: string): boolean {
  return reason.startsWith("gateway unavailable") || reason.includes("socket closed") || reason.includes("gateway starting") || reason.includes("challenge timeout");
}

async function restartLaunchAgentGateway(): Promise<void> {
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
  if (uid === undefined) throw new Error("LaunchAgent restart requires a user id");
  await execFileAsync("launchctl", ["kickstart", "-k", `gui/${uid}/ai.openclaw.gateway`]);
}
