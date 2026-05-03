import { createHash, generateKeyPairSync } from "node:crypto";
import type { AddressInfo } from "node:net";
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

  test("fails closed when Gateway requires device identity and none is provided", async () => {
    const server = await createMockGateway({
      onRequest(method, params) {
        if (method === "connect" && !("device" in params)) throw new Error("device identity required");
        return { ok: true };
      }
    });

    await expect(createLiveGateway({ timeoutMs: 1000, token: "gateway-token", url: server.url })).rejects.toThrow("device identity required");
  });
});

async function createMockGateway(options: { onRequest(method: string, params: Record<string, unknown>): unknown }): Promise<{ url: string }> {
  const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  server.on("connection", (socket) => {
    sockets.push(socket);
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
