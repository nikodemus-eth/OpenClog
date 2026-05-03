import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { afterEach, describe, expect, test } from "vitest";
import {
  buildGatewayDeviceAuthPayload,
  buildSignedGatewayDevice,
  classifyGatewayConnectionError,
  deriveDeviceIdFromPublicKeyPem,
  publicKeyRawBase64UrlFromPem,
  readOpenClawDeviceIdentity,
  redactGatewayConnectSecrets,
  resolveDefaultOpenClawDeviceIdentityPath,
  signGatewayDeviceAuthPayload
} from "../src/device-auth.js";

const tempDirs: string[] = [];
const originalDeviceIdentityFile = process.env.OPENCLAW_DEVICE_IDENTITY_FILE;

afterEach(() => {
  if (originalDeviceIdentityFile === undefined) delete process.env.OPENCLAW_DEVICE_IDENTITY_FILE;
  else process.env.OPENCLAW_DEVICE_IDENTITY_FILE = originalDeviceIdentityFile;
  while (tempDirs.length > 0) rmSync(tempDirs.pop()!, { force: true, recursive: true });
});

describe("OpenClaw Gateway device auth", () => {
  test("loads and validates an existing OpenClaw device identity file", () => {
    const identity = createIdentityFixture();
    const path = writeIdentityFixture(identity);

    expect(readOpenClawDeviceIdentity(path)).toEqual(identity);
    process.env.OPENCLAW_DEVICE_IDENTITY_FILE = path;
    expect(readOpenClawDeviceIdentity()).toEqual(identity);
    delete process.env.OPENCLAW_DEVICE_IDENTITY_FILE;
    const defaultIdentity = readOpenClawDeviceIdentity();
    expect(defaultIdentity === undefined || typeof defaultIdentity.deviceId === "string").toBe(true);
    expect(resolveDefaultOpenClawDeviceIdentityPath()).toMatch(/\.openclaw\/identity\/device\.json$/);
  });

  test("rejects missing, malformed, or mismatched device identity files", () => {
    const identity = createIdentityFixture();
    const missingDir = mkdtempSync(join(tmpdir(), "openclog-identity-"));
    tempDirs.push(missingDir);
    const malformedPath = join(missingDir, "malformed.json");
    const invalidJsonPath = join(missingDir, "invalid-json.json");
    const mismatchPath = join(missingDir, "mismatch.json");
    writeFileSync(malformedPath, JSON.stringify({ version: 1, deviceId: "nope" }));
    writeFileSync(invalidJsonPath, "{");
    writeFileSync(mismatchPath, JSON.stringify({ ...identity, version: 1, deviceId: "0".repeat(64) }));

    expect(readOpenClawDeviceIdentity(join(missingDir, "missing.json"))).toBeUndefined();
    expect(readOpenClawDeviceIdentity(malformedPath)).toBeUndefined();
    expect(readOpenClawDeviceIdentity(invalidJsonPath)).toBeUndefined();
    expect(readOpenClawDeviceIdentity(mismatchPath)).toBeUndefined();
  });

  test("derives OpenClaw raw public key and device id from PEM", () => {
    const identity = createIdentityFixture();

    expect(publicKeyRawBase64UrlFromPem(identity.publicKeyPem)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(publicKeyRawBase64UrlFromPem(identity.publicKeyPem)).not.toContain("=");
    expect(deriveDeviceIdFromPublicKeyPem(identity.publicKeyPem)).toBe(identity.deviceId);
    expect(() => publicKeyRawBase64UrlFromPem("not a key")).toThrow("Invalid OpenClaw public key");
    expect(() => deriveDeviceIdFromPublicKeyPem("not a key")).toThrow("Invalid OpenClaw public key");

    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const rsaPublicKeyPem = rsa.publicKey.export({ format: "pem", type: "spki" }).toString();
    expect(publicKeyRawBase64UrlFromPem(rsaPublicKeyPem)).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(deriveDeviceIdFromPublicKeyPem(rsaPublicKeyPem)).toHaveLength(64);
  });

  test("builds and signs the exact OpenClaw v3 backend device-auth payload", () => {
    const identity = createIdentityFixture();
    const payload = buildGatewayDeviceAuthPayload({
      clientId: "gateway-client",
      clientMode: "backend",
      deviceFamily: undefined,
      deviceId: identity.deviceId,
      nonce: "nonce-123",
      platform: "darwin",
      role: "operator",
      scopes: ["operator.read", "operator.write", "operator.approvals"],
      signedAtMs: 1777816800000,
      token: "gateway-token"
    });
    const signature = signGatewayDeviceAuthPayload(identity.privateKeyPem, payload);
    const signed = buildSignedGatewayDevice({
      identity,
      nonce: "nonce-123",
      platform: "darwin",
      signedAtMs: 1777816800000,
      token: "gateway-token"
    });

    expect(payload).toBe(`v3|${identity.deviceId}|gateway-client|backend|operator|operator.read,operator.write,operator.approvals|1777816800000|gateway-token|nonce-123|darwin|`);
    expect(
      buildGatewayDeviceAuthPayload({
        clientId: "gateway-client",
        clientMode: "backend",
        deviceFamily: " laptop ",
        deviceId: identity.deviceId,
        nonce: "nonce-123",
        platform: " darwin ",
        role: "operator",
        scopes: ["operator.read"],
        signedAtMs: 1777816800000,
        token: undefined
      })
    ).toBe(`v3|${identity.deviceId}|gateway-client|backend|operator|operator.read|1777816800000||nonce-123|darwin|laptop`);
    expect(signature).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(signature).not.toContain("=");
    expect(signed).toEqual({
      id: identity.deviceId,
      publicKey: publicKeyRawBase64UrlFromPem(identity.publicKeyPem),
      signature,
      signedAt: 1777816800000,
      nonce: "nonce-123"
    });
    expect(verify(null, Buffer.from(payload, "utf8"), createPublicKey(identity.publicKeyPem), base64UrlDecode(signature))).toBe(true);
  });

  test("rejects missing secrets and redacts connect auth/device fields", () => {
    const identity = createIdentityFixture();
    expect(() =>
      buildSignedGatewayDevice({
        identity,
        nonce: "",
        platform: "darwin",
        signedAtMs: 1777816800000,
        token: "gateway-token"
      })
    ).toThrow("Gateway challenge nonce is required");
    expect(() =>
      buildSignedGatewayDevice({
        identity,
        nonce: "nonce-123",
        platform: "darwin",
        signedAtMs: 1777816800000,
        token: undefined
      })
    ).toThrow("Gateway token is required");
    expect(() =>
      buildSignedGatewayDevice({
        identity: { ...identity, privateKeyPem: "bad key" },
        nonce: "nonce-123",
        platform: "darwin",
        signedAtMs: 1777816800000,
        token: "gateway-token"
      })
    ).toThrow("Invalid OpenClaw private key");

    expect(
      redactGatewayConnectSecrets({
        auth: { token: "gateway-token", deviceToken: "device-token", password: "secret" },
        device: { id: identity.deviceId, publicKey: "public", signature: "sig", signedAt: 1, nonce: "nonce-123" }
      })
    ).toEqual({
      auth: "[REDACTED_AUTH]",
      device: "[REDACTED_DEVICE_AUTH]"
    });
    expect(redactGatewayConnectSecrets({ auth: { token: "gateway-token" }, safe: true })).toEqual({ auth: "[REDACTED_AUTH]", safe: true });
    expect(redactGatewayConnectSecrets({ device: { signature: "sig" }, safe: true })).toEqual({ device: "[REDACTED_DEVICE_AUTH]", safe: true });
    expect(redactGatewayConnectSecrets({ safe: true })).toEqual({ safe: true });
  });

  test("classifies live Gateway failure reasons without exposing secret values", () => {
    expect(classifyGatewayConnectionError(new Error("connect ECONNREFUSED 127.0.0.1:18789"))).toBe("gateway unavailable: connect ECONNREFUSED 127.0.0.1:18789");
    expect(classifyGatewayConnectionError(new Error("Gateway connect.challenge timeout"))).toBe("gateway unavailable: Gateway connect.challenge timeout");
    expect(classifyGatewayConnectionError(new Error("gateway token missing"))).toBe("gateway token missing");
    expect(classifyGatewayConnectionError(new Error("unauthorized: gateway token mismatch abc123"))).toBe("gateway token rejected or mismatched");
    expect(classifyGatewayConnectionError(new Error("device identity required"))).toBe("device identity missing or rejected");
    expect(classifyGatewayConnectionError(new Error("device pairing required (requestId: secret-request)"))).toBe("device pairing required");
    expect(classifyGatewayConnectionError(new Error("missing negotiated scope: operator.write"))).toBe("missing required Gateway scopes");
    expect(classifyGatewayConnectionError("plain failure")).toBe("plain failure");
  });
});

function createIdentityFixture() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ format: "pem", type: "spki" }).toString();
  const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  return {
    deviceId: createHash("sha256").update(base64UrlDecode(publicKeyRawBase64UrlFromPem(publicKeyPem))).digest("hex"),
    publicKeyPem,
    privateKeyPem
  };
}

function writeIdentityFixture(identity: ReturnType<typeof createIdentityFixture>): string {
  const dir = mkdtempSync(join(tmpdir(), "openclog-identity-"));
  tempDirs.push(dir);
  const path = join(dir, "device.json");
  writeFileSync(path, `${JSON.stringify({ version: 1, ...identity }, null, 2)}\n`);
  return path;
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized + "=".repeat((4 - (normalized.length % 4)) % 4), "base64");
}
