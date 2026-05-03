import WebSocket from "ws";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { buildConnectRequest, buildReconnectPlan, evaluateHelloOk, isLoopbackGatewayUrl, requiredOperatorScopes } from "../packages/core/src/index.js";
import { buildSignedGatewayDevice, classifyGatewayConnectionError, readOpenClawDeviceIdentity, type OpenClawDeviceIdentity } from "../apps/api/src/device-auth.js";

const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL ?? "ws://127.0.0.1:18789";
const token = readGatewayToken();
const deviceIdentity = readOpenClawDeviceIdentity();
const timeoutMs = Number(process.env.OPENCLOG_GATEWAY_TIMEOUT_MS ?? 5000);

async function probeGateway(options: { deviceIdentity?: OpenClawDeviceIdentity; gatewayUrl: string; token?: string; timeoutMs: number }) {
  const client = new LiveProbeClient(options.gatewayUrl, options.token, options.deviceIdentity, options.timeoutMs);
  const hello = await client.connect();
  const negotiated = evaluateHelloOk(hello);
  if (negotiated.status !== "ready") {
    await client.close();
    return { status: "blocked", negotiated, requiredScopes: requiredOperatorScopes };
  }
  const calls = buildReconnectPlan("main");
  const results: string[] = [];
  for (const call of calls) {
    try {
      await client.request(call.method, call.params);
    } catch (error) {
      throw new Error(`${call.method}: ${error instanceof Error ? error.message : String(error)}`);
    }
    results.push(call.method);
  }
  if (process.env.OPENCLOG_GATEWAY_MUTATION_TEST === "1") {
    const created = (await client.request("sessions.create", {})) as { key?: string };
    const key = created.key ?? "main";
    await client.request("sessions.messages.subscribe", { key });
    await client.request("sessions.send", { key, message: "OpenClog live verification" });
    await client.request("sessions.abort", { key });
    results.push("sessions.create", "sessions.messages.subscribe", "sessions.send", "sessions.abort");
  }
  await client.close();
  return { status: "ready", negotiated, probedMethods: results, mutationTestEnabled: process.env.OPENCLOG_GATEWAY_MUTATION_TEST === "1" };
}

class LiveProbeClient {
  private counter = 0;
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

  constructor(
    private readonly url: string,
    private readonly token: string | undefined,
    private readonly deviceIdentity: OpenClawDeviceIdentity | undefined,
    private readonly timeoutMs: number
  ) {}

  async connect(): Promise<{ type: "hello-ok"; protocol: number; auth: { role: string; scopes: string[] } }> {
    this.ws = new WebSocket(this.url);
    const challenge = await new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Gateway connect.challenge timeout")), this.timeoutMs);
      this.ws?.on("message", (raw) => {
        const frame = JSON.parse(String(raw)) as { type?: string; event?: string; payload?: { nonce?: string } };
        if (frame.type === "event" && frame.event === "connect.challenge" && frame.payload?.nonce) {
          clearTimeout(timer);
          resolve(frame.payload.nonce);
        }
      });
      this.ws?.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    const frame = buildConnectRequest({
      id: "connect",
      nonce: challenge,
      token: this.token,
      device:
        this.deviceIdentity && this.token
          ? buildSignedGatewayDevice({
              identity: this.deviceIdentity,
              nonce: challenge,
              platform: process.platform,
              token: this.token
            })
          : undefined,
      platform: process.platform,
      instanceId: "openclog-verify"
    });
    return (await this.request(frame.method, frame.params, frame.id)) as { type: "hello-ok"; protocol: number; auth: { role: string; scopes: string[] } };
  }

  async request(method: string, params: Record<string, unknown>, id = `req-${++this.counter}`): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error("Gateway socket is not open");
    const promise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Gateway request timeout: ${method}`));
      }, this.timeoutMs);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        }
      });
    });
    this.ws.on("message", (raw) => {
      const frame = JSON.parse(String(raw)) as { type?: string; id?: string; ok?: boolean; payload?: unknown; error?: { message?: string } };
      if (frame.type !== "res" || frame.id !== id) return;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      if (frame.ok) pending.resolve(frame.payload);
      else pending.reject(new Error(frame.error?.message ?? `Gateway request failed: ${method}`));
    });
    this.ws.send(JSON.stringify({ type: "req", id, method, params }));
    return promise;
  }

  async close(): Promise<void> {
    this.ws?.close();
    this.ws = null;
  }
}

function readTokenFile(path: string | undefined): string | undefined {
  if (!path) return undefined;
  return readFileSync(path, "utf8").trim();
}

function readGatewayToken(): string | undefined {
  if (process.env.OPENCLAW_GATEWAY_TOKEN) return process.env.OPENCLAW_GATEWAY_TOKEN;
  const tokenFromFile = readTokenFile(process.env.OPENCLAW_GATEWAY_TOKEN_FILE);
  if (tokenFromFile) return tokenFromFile;
  try {
    const configPath = process.env.OPENCLAW_CONFIG_PATH ?? join(homedir(), ".openclaw", "openclaw.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as { gateway?: { auth?: { token?: string } } };
    return config.gateway?.auth?.token?.trim() || undefined;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  try {
    if (!isLoopbackGatewayUrl(gatewayUrl)) {
      throw new Error(`fail-closed: ${gatewayUrl} is not loopback; gateway-client backend mode is blocked for remote/non-loopback deployments`);
    }
    const report = await probeGateway({ gatewayUrl, token, deviceIdentity, timeoutMs });
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "ready") process.exit(2);
  } catch (error) {
    console.error(JSON.stringify({ status: "failed_closed", reason: classifyGatewayConnectionError(error) }, null, 2));
    process.exit(2);
  }
}

await main();
