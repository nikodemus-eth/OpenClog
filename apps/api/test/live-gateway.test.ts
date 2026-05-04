import { createHash, generateKeyPairSync } from "node:crypto";
import { createServer, type AddressInfo } from "node:net";
import { afterEach, describe, expect, test } from "vitest";
import { WebSocketServer, type WebSocket } from "ws";
import { requiredOperatorScopes } from "@openclog/core";
import { publicKeyRawBase64UrlFromPem, type OpenClawDeviceIdentity } from "../src/device-auth.js";
import { createLiveGateway } from "../src/live-gateway.js";

const servers: WebSocketServer[] = [];
const sockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.close();
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        })
    )
  );
});

describe("live Gateway handshake", () => {
  test("connects with signed device auth and only required operator scopes", async () => {
    const identity = createIdentityFixture();
    const received: Array<{ method: string; params: Record<string, unknown> }> = [];
    const server = await createMockGateway({
      onRequest(method, params) {
        received.push({ method, params });
        if (method !== "connect") return { ok: true };
        expect(params).toMatchObject({
          auth: { token: "gateway-token" },
          client: { id: "gateway-client", mode: "backend" },
          device: {
            id: identity.deviceId,
            publicKey: publicKeyRawBase64UrlFromPem(identity.publicKeyPem),
            nonce: "challenge-nonce"
          },
          role: "operator",
          scopes: requiredOperatorScopes
        });
        expect(JSON.stringify(params)).not.toContain("operator.admin");
        expect(JSON.stringify(params)).not.toContain("operator.pairing");
        expect(JSON.stringify(params)).not.toContain("operator.talk.secrets");
        return {
          type: "hello-ok",
          protocol: 3,
          auth: { role: "operator", scopes: [...requiredOperatorScopes] }
        };
      }
    });

    const gateway = await createLiveGateway({
      activeSessionKey: "agent:hugin:main",
      deviceIdentity: identity,
      timeoutMs: 1000,
      token: "gateway-token",
      url: server.url
    });

    expect(gateway.getState()).toMatchObject({ status: "ready", canIssueControlActions: true });
    expect(received.map((request) => request.method)).toEqual([
      "connect",
      "health",
      "system-presence",
      "exec.approval.list",
      "sessions.list",
      "sessions.subscribe",
      "sessions.messages.subscribe"
    ]);
    expect(gateway.calls.every((call) => !JSON.stringify(call.params).includes("gateway-token"))).toBe(true);
  });

  test("fails closed without service restart when Gateway requires device identity and none is provided", async () => {
    const server = await createMockGateway({
      onRequest(method, params) {
        if (method === "connect" && !("device" in params)) throw new Error("device identity required");
        return { ok: true };
      }
    });

    const gateway = await createLiveGateway({ heartbeatMs: 0, reconnect: { initialDelayMs: 1000, maxDelayMs: 1000, jitterMs: 0 }, timeoutMs: 100, token: "gateway-token", url: server.url });

    expect(gateway.getState()).toMatchObject({
      canIssueControlActions: false,
      lastErrorReason: "device identity missing or rejected",
      status: "degraded",
      stale: true
    });
    await expect(gateway.request("health", {})).rejects.toThrow("Gateway reconnecting");
    gateway.close();
  });

  test("reconnects after a stale socket, re-reads auth material, and resubscribes", async () => {
    const identity = createIdentityFixture();
    let token = "gateway-token-1";
    const connectTokens: string[] = [];
    const methods: string[] = [];
    let firstConnectedSocket: WebSocket | undefined;
    const gatewayEvents: string[] = [];
    const server = await createMockGateway({
      onConnection(socket, index) {
        if (index === 1) firstConnectedSocket = socket;
      },
      onRequest(method, params) {
        methods.push(method);
        if (method === "connect") {
          connectTokens.push(String(asRecord(params.auth).token));
          return {
            type: "hello-ok",
            protocol: 3,
            auth: { role: "operator", scopes: [...requiredOperatorScopes] }
          };
        }
        return { ok: true };
      }
    });

    const gateway = await createLiveGateway({
      activeSessionKey: "agent:hugin:main",
      deviceIdentityProvider: () => identity,
      heartbeatMs: 0,
      reconnect: { initialDelayMs: 5, maxDelayMs: 5, jitterMs: 0 },
      timeoutMs: 500,
      tokenProvider: () => token,
      url: server.url
    });
    gateway.onEvent((event) => gatewayEvents.push(event.event));

    expect(gateway.getState()).toMatchObject({ status: "ready", canIssueControlActions: true, stale: false });
    token = "gateway-token-2";
    firstConnectedSocket?.close();

    await waitFor(
      () =>
        connectTokens.length === 2 &&
        methods.filter((method) => method === "sessions.subscribe").length === 2 &&
        methods.filter((method) => method === "sessions.messages.subscribe").length === 2 &&
        gatewayEvents.includes("gateway.reconnected")
    );

    expect(connectTokens).toEqual(["gateway-token-1", "gateway-token-2"]);
    expect(methods.filter((method) => method === "sessions.subscribe")).toHaveLength(2);
    expect(methods.filter((method) => method === "sessions.messages.subscribe")).toHaveLength(2);
    expect(gateway.getState()).toMatchObject({ status: "ready", canIssueControlActions: true, stale: false, reconnectAttempt: 0 });
    expect(gatewayEvents).toContain("gateway.reconnected");
    gateway.close();
  });

  test("rejects control requests while reconnecting from a stale socket", async () => {
    const identity = createIdentityFixture();
    let connectedSocket: WebSocket | undefined;
    const server = await createMockGateway({
      onConnection(socket) {
        connectedSocket = socket;
      },
      onRequest(method) {
        if (method === "connect") {
          return {
            type: "hello-ok",
            protocol: 3,
            auth: { role: "operator", scopes: [...requiredOperatorScopes] }
          };
        }
        return { ok: true };
      }
    });
    const gateway = await createLiveGateway({
      deviceIdentity: identity,
      heartbeatMs: 0,
      reconnect: { initialDelayMs: 1000, maxDelayMs: 1000, jitterMs: 0 },
      timeoutMs: 500,
      token: "gateway-token",
      url: server.url
    });

    connectedSocket?.close();
    await waitFor(() => gateway.getState().stale === true);

    await expect(gateway.request("health", {})).rejects.toThrow("Gateway reconnecting");
    expect(gateway.getState()).toMatchObject({ status: "degraded", canIssueControlActions: false, connectionStatus: "connecting" });
    gateway.close();
  });

  test("guarded service recovery restarts the loopback LaunchAgent after repeated eligible reconnect failures", async () => {
    const port = await reserveClosedPort();
    let restartCount = 0;
    const gateway = await createLiveGateway({
      heartbeatMs: 0,
      reconnect: { initialDelayMs: 5, maxDelayMs: 5, jitterMs: 0 },
      serviceRecovery: {
        cooldownMs: 60_000,
        enabled: true,
        failureThreshold: 2,
        minFailureWindowMs: 0,
        platform: "darwin",
        restartGatewayService: async () => {
          restartCount += 1;
        }
      },
      timeoutMs: 50,
      token: "gateway-token",
      url: `ws://127.0.0.1:${port}`
    });

    await waitFor(() => restartCount === 1);

    expect(gateway.getState().serviceRecovery).toMatchObject({
      enabled: true,
      restartCount: 1,
      lastResult: "success"
    });
    gateway.close();
  });

  test("service recovery does not restart for non-recoverable auth failures", async () => {
    let restartCount = 0;
    const server = await createMockGateway({
      onRequest(method, params) {
        if (method === "connect" && !("device" in params)) throw new Error("device identity required");
        return { ok: true };
      }
    });
    const gateway = await createLiveGateway({
      heartbeatMs: 0,
      reconnect: { initialDelayMs: 5, maxDelayMs: 5, jitterMs: 0 },
      serviceRecovery: {
        enabled: true,
        failureThreshold: 1,
        minFailureWindowMs: 0,
        platform: "darwin",
        restartGatewayService: async () => {
          restartCount += 1;
        }
      },
      timeoutMs: 50,
      token: "gateway-token",
      url: server.url
    });

    await waitFor(() => gateway.getState().reconnectAttempt >= 2);

    expect(restartCount).toBe(0);
    expect(gateway.getState().serviceRecovery).toMatchObject({ enabled: true, restartCount: 0 });
    gateway.close();
  });
});

async function createMockGateway(options: {
  onConnection?: (socket: WebSocket, index: number) => void;
  onRequest(method: string, params: Record<string, unknown>): unknown;
}): Promise<{ url: string }> {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  let connectionCount = 0;
  server.on("connection", (socket) => {
    connectionCount += 1;
    sockets.push(socket);
    options.onConnection?.(socket, connectionCount);
    socket.send(JSON.stringify({ type: "event", event: "connect.challenge", payload: { nonce: "challenge-nonce" } }));
    socket.on("message", (raw) => {
      const frame = JSON.parse(String(raw)) as { id: string; method: string; params: Record<string, unknown>; type: string };
      try {
        const payload = options.onRequest(frame.method, frame.params);
        socket.send(JSON.stringify({ type: "res", id: frame.id, ok: true, payload }));
      } catch (error) {
        socket.send(JSON.stringify({ type: "res", id: frame.id, ok: false, error: { message: error instanceof Error ? error.message : String(error) } }));
      }
    });
  });
  return { url: `ws://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

async function reserveClosedPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) throw new Error("Timed out waiting for condition");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function createIdentityFixture(): OpenClawDeviceIdentity {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ format: "pem", type: "spki" }).toString();
  const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  const deviceId = createHash("sha256").update(base64UrlDecode(publicKeyRawBase64UrlFromPem(publicKeyPem))).digest("hex");
  return { deviceId, publicKeyPem, privateKeyPem };
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized + "=".repeat((4 - (normalized.length % 4)) % 4), "base64");
}
