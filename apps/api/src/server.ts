import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createApiApp } from "./app.js";
import type { GatewayPort } from "./gateway.js";
import { createLiveGateway } from "./live-gateway.js";
import { createMemoryGateway } from "./memory-gateway.js";
import { createSqliteRepository } from "./repository.js";
import { classifyGatewayConnectionError, readOpenClawDeviceIdentity } from "./device-auth.js";

const repo = createSqliteRepository(process.env.OPENCLOG_DB_PATH ?? "openclog.db");
const app = createApiApp({ repo, gateway: await resolveGateway() });
const port = Number(process.env.PORT ?? 8787);

await app.listen({ host: "127.0.0.1", port });

async function resolveGateway(): Promise<GatewayPort> {
  const url = process.env.OPENCLAW_GATEWAY_URL ?? "ws://127.0.0.1:18789";
  const token = readGatewayToken();
  if (!token) return createMemoryGateway();
  try {
    return await createLiveGateway({ url, token, deviceIdentity: readOpenClawDeviceIdentity(), timeoutMs: Number(process.env.OPENCLOG_GATEWAY_TIMEOUT_MS ?? 5000) });
  } catch (error) {
    console.error(`OpenClog Gateway degraded: ${classifyGatewayConnectionError(error)}`);
    return createMemoryGateway();
  }
}

function readGatewayToken(): string | undefined {
  if (process.env.OPENCLAW_GATEWAY_TOKEN) return process.env.OPENCLAW_GATEWAY_TOKEN;
  if (process.env.OPENCLAW_GATEWAY_TOKEN_FILE) return readFileSync(process.env.OPENCLAW_GATEWAY_TOKEN_FILE, "utf8").trim();
  try {
    const configPath = process.env.OPENCLAW_CONFIG_PATH ?? join(homedir(), ".openclaw", "openclaw.json");
    const config = JSON.parse(readFileSync(configPath, "utf8")) as { gateway?: { auth?: { token?: string } } };
    return config.gateway?.auth?.token?.trim() || undefined;
  } catch {
    return undefined;
  }
}
