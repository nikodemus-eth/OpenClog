import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createApiApp } from "./app.js";
import type { GatewayPort } from "./gateway.js";
import { createLiveGateway } from "./live-gateway.js";
import { createMemoryGateway } from "./memory-gateway.js";
import { backfillOpenClawSessions } from "./openclaw-session-backfill.js";
import { createSqliteRepository } from "./repository.js";
import { classifyGatewayConnectionError, readOpenClawDeviceIdentity } from "./device-auth.js";

const repo = createSqliteRepository(process.env.OPENCLOG_DB_PATH ?? "openclog.db");
if (process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL !== "0") {
  const backfill = backfillOpenClawSessions(repo, {
    maxFiles: parsePositiveInt(process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_FILES, 40),
    maxMessages: parsePositiveInt(process.env.OPENCLOG_OPENCLAW_SESSION_BACKFILL_MAX_MESSAGES, 200),
    sessionsDir: process.env.OPENCLOG_OPENCLAW_SESSIONS_DIR,
    timeZone: process.env.OPENCLOG_OPERATOR_TIME_ZONE
  });
  if (backfill.messagesImported > 0 || backfill.errors.length > 0) {
    console.error(
      `OpenClog OpenClaw session backfill: imported ${backfill.messagesImported} message(s) from ${backfill.filesScanned} file(s)` +
        (backfill.latestTimestamp ? ` through ${backfill.latestTimestamp}` : "") +
        (backfill.errors.length > 0 ? ` with ${backfill.errors.length} parse error(s)` : "")
    );
  }
}
const app = createApiApp({ repo, gateway: await resolveGateway() });
const port = Number(process.env.PORT ?? 8787);

await app.listen({ host: "127.0.0.1", port });

async function resolveGateway(): Promise<GatewayPort> {
  const url = process.env.OPENCLAW_GATEWAY_URL ?? "ws://127.0.0.1:18789";
  const token = readGatewayToken();
  if (!token) return createMemoryGateway();
  try {
    return await createLiveGateway({
      url,
      tokenProvider: readGatewayToken,
      deviceIdentityProvider: readOpenClawDeviceIdentity,
      heartbeatMs: Number(process.env.OPENCLOG_GATEWAY_HEARTBEAT_MS ?? 30_000),
      serviceRecovery: { enabled: process.env.OPENCLOG_GATEWAY_AUTO_RESTART !== "0" },
      timeoutMs: Number(process.env.OPENCLOG_GATEWAY_TIMEOUT_MS ?? 5000)
    });
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

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
