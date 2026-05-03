import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto";
import { requiredOperatorScopes } from "@openclog/core";

const ed25519SpkiPrefix = Buffer.from("302a300506032b6570032100", "hex");

export interface OpenClawDeviceIdentity {
  deviceId: string;
  publicKeyPem: string;
  privateKeyPem: string;
}

export interface GatewayDeviceAuthPayloadInput {
  clientId: string;
  clientMode: string;
  deviceFamily?: string;
  deviceId: string;
  nonce: string;
  platform: string;
  role: string;
  scopes: readonly string[];
  signedAtMs: number;
  token?: string;
}

export interface SignedGatewayDeviceInput {
  deviceFamily?: string;
  identity: OpenClawDeviceIdentity;
  nonce: string;
  platform: string;
  signedAtMs?: number;
  token?: string;
}

export interface GatewayDeviceAuth {
  id: string;
  nonce: string;
  publicKey: string;
  signature: string;
  signedAt: number;
}

export function resolveDefaultOpenClawDeviceIdentityPath(): string {
  return join(homedir(), ".openclaw", "identity", "device.json");
}

export function readOpenClawDeviceIdentity(path = process.env.OPENCLAW_DEVICE_IDENTITY_FILE ?? resolveDefaultOpenClawDeviceIdentityPath()): OpenClawDeviceIdentity | undefined {
  try {
    if (!existsSync(path)) return undefined;
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<OpenClawDeviceIdentity> & { version?: unknown };
    if (parsed.version !== 1 || typeof parsed.deviceId !== "string" || typeof parsed.publicKeyPem !== "string" || typeof parsed.privateKeyPem !== "string") return undefined;
    if (deriveDeviceIdFromPublicKeyPem(parsed.publicKeyPem) !== parsed.deviceId) return undefined;
    return {
      deviceId: parsed.deviceId,
      publicKeyPem: parsed.publicKeyPem,
      privateKeyPem: parsed.privateKeyPem
    };
  } catch {
    return undefined;
  }
}

export function buildGatewayDeviceAuthPayload(input: GatewayDeviceAuthPayloadInput): string {
  return [
    "v3",
    input.deviceId,
    input.clientId,
    input.clientMode,
    input.role,
    input.scopes.join(","),
    String(input.signedAtMs),
    input.token ?? "",
    input.nonce,
    normalizeDeviceMetadataForAuth(input.platform),
    normalizeDeviceMetadataForAuth(input.deviceFamily)
  ].join("|");
}

export function buildSignedGatewayDevice(input: SignedGatewayDeviceInput): GatewayDeviceAuth {
  if (!input.nonce.trim()) throw new Error("Gateway challenge nonce is required");
  if (!input.token?.trim()) throw new Error("Gateway token is required");
  const signedAt = input.signedAtMs ?? Date.now();
  const payload = buildGatewayDeviceAuthPayload({
    clientId: "gateway-client",
    clientMode: "backend",
    deviceFamily: input.deviceFamily,
    deviceId: input.identity.deviceId,
    nonce: input.nonce,
    platform: input.platform,
    role: "operator",
    scopes: requiredOperatorScopes,
    signedAtMs: signedAt,
    token: input.token
  });
  return {
    id: input.identity.deviceId,
    publicKey: publicKeyRawBase64UrlFromPem(input.identity.publicKeyPem),
    signature: signGatewayDeviceAuthPayload(input.identity.privateKeyPem, payload),
    signedAt,
    nonce: input.nonce
  };
}

export function publicKeyRawBase64UrlFromPem(publicKeyPem: string): string {
  try {
    return base64UrlEncode(derivePublicKeyRaw(publicKeyPem));
  } catch {
    throw new Error("Invalid OpenClaw public key");
  }
}

export function deriveDeviceIdFromPublicKeyPem(publicKeyPem: string): string {
  try {
    return createHash("sha256").update(derivePublicKeyRaw(publicKeyPem)).digest("hex");
  } catch {
    throw new Error("Invalid OpenClaw public key");
  }
}

export function signGatewayDeviceAuthPayload(privateKeyPem: string, payload: string): string {
  try {
    return base64UrlEncode(sign(null, Buffer.from(payload, "utf8"), createPrivateKey(privateKeyPem)));
  } catch {
    throw new Error("Invalid OpenClaw private key");
  }
}

export function redactGatewayConnectSecrets(params: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...params };
  if ("auth" in redacted) redacted.auth = "[REDACTED_AUTH]";
  if ("device" in redacted) redacted.device = "[REDACTED_DEVICE_AUTH]";
  return redacted;
}

export function classifyGatewayConnectionError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  if (normalized.includes("econnrefused") || normalized.includes("timeout")) return `gateway unavailable: ${message}`;
  if (normalized.includes("token missing")) return "gateway token missing";
  if (normalized.includes("token mismatch") || normalized.includes("token rejected") || normalized.includes("unauthorized")) return "gateway token rejected or mismatched";
  if (normalized.includes("device identity")) return "device identity missing or rejected";
  if (normalized.includes("pairing required")) return "device pairing required";
  if (normalized.includes("missing negotiated scope") || normalized.includes("missing required") || normalized.includes("missing scope")) return "missing required Gateway scopes";
  return message;
}

function normalizeDeviceMetadataForAuth(value: string | undefined): string {
  return value?.trim() ?? "";
}

function derivePublicKeyRaw(publicKeyPem: string): Buffer {
  const spki = createPublicKey(publicKeyPem).export({ format: "der", type: "spki" });
  if (spki.length === ed25519SpkiPrefix.length + 32 && spki.subarray(0, ed25519SpkiPrefix.length).equals(ed25519SpkiPrefix)) {
    return spki.subarray(ed25519SpkiPrefix.length);
  }
  return spki;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}
