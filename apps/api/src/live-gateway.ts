import WebSocket from "ws";
import {
  assertDottedGatewayMethod,
  buildConnectRequest,
  buildReconnectPlan,
  evaluateHelloOk,
  isLoopbackGatewayUrl,
  redactGatewayPayload,
  type GatewayNegotiatedState,
  type HelloOkLike
} from "@openclog/core";
import type { GatewayEventLike } from "@openclog/core";
import type { GatewayCall, GatewayPort } from "./gateway.js";

export interface LiveGatewayOptions {
  activeSessionKey?: string;
  timeoutMs?: number;
  token?: string;
  url: string;
}

export async function createLiveGateway(options: LiveGatewayOptions): Promise<GatewayPort> {
  const gateway = new LiveGateway(options);
  await gateway.connect();
  return gateway;
}

class LiveGateway implements GatewayPort {
  readonly calls: GatewayCall[] = [];
  private counter = 0;
  private pending = new Map<string, { reject: (error: Error) => void; resolve: (value: unknown) => void; timer: NodeJS.Timeout }>();
  private eventListeners = new Set<(event: GatewayEventLike) => void>();
  private lastEventSeq: number | null = null;
  private state: GatewayNegotiatedState & { stale?: boolean } = {
    status: "degraded",
    role: "operator",
    scopes: [],
    missingScopes: [],
    canIssueControlActions: false,
    stale: true
  };
  private ws: WebSocket | null = null;

  constructor(private readonly options: LiveGatewayOptions) {}

  async connect(): Promise<void> {
    if (!isLoopbackGatewayUrl(this.options.url)) {
      throw new Error("remote/non-loopback Gateway URL blocked for backend gateway-client auth");
    }
    const socket = new WebSocket(this.options.url);
    this.ws = socket;
    socket.on("message", (raw) => this.handleFrame(raw));
    socket.on("close", () => this.markStale());
    socket.on("error", () => this.markStale());
    const challenge = await this.waitForChallenge(socket);
    const frame = buildConnectRequest({
      id: "connect",
      nonce: challenge,
      token: this.options.token,
      platform: process.platform,
      instanceId: "openclog-api"
    });
    const hello = (await this.request(frame.method, frame.params, frame.id, true)) as HelloOkLike;
    this.state = { ...evaluateHelloOk(hello), stale: false };
    if (!this.state.canIssueControlActions) return;
    for (const call of buildReconnectPlan(this.options.activeSessionKey ?? "agent:highfather:main")) {
      await this.request(call.method, call.params);
    }
  }

  getState(): GatewayNegotiatedState & { stale?: boolean } {
    return { ...this.state, scopes: [...this.state.scopes], missingScopes: [...this.state.missingScopes] };
  }

  onEvent(listener: (event: GatewayEventLike) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  async request(method: string, params: Record<string, unknown>, id = `req-${++this.counter}`, allowWhileConnecting = false): Promise<unknown> {
    assertDottedGatewayMethod(method);
    if (!allowWhileConnecting && !this.state.canIssueControlActions) throw new Error("Gateway control actions blocked until required scopes are negotiated");
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("Gateway socket is not open");
    this.calls.push({ method, params: redactGatewayPayload(params).redacted as Record<string, unknown> });
    const promise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Gateway request timeout: ${method}`));
      }, this.options.timeoutMs ?? 5000);
      this.pending.set(id, { resolve, reject, timer });
    });
    this.ws.send(JSON.stringify({ type: "req", id, method, params }));
    return promise;
  }

  private handleFrame(raw: WebSocket.RawData): void {
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

  private notifyListeners(event: GatewayEventLike): void {
    for (const listener of this.eventListeners) listener(event);
  }

  private markStale(): void {
    this.state = { ...this.state, status: this.state.status === "ready" ? "degraded" : this.state.status, stale: true, canIssueControlActions: false };
  }

  private async waitForChallenge(socket: WebSocket): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Gateway connect.challenge timeout")), this.options.timeoutMs ?? 5000);
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
