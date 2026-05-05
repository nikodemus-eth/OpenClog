import { describe, expect, test } from "vitest";
import {
  GATEWAY_METHODS,
  assertDottedGatewayMethod,
  buildConnectRequest,
  buildReconnectPlan,
  evaluateHelloOk,
  getGatewayMethod,
  isLoopbackGatewayUrl,
  redactConnectFrameForReport,
  requiredOperatorScopes
} from "../src/index.js";

describe("Gateway protocol contract", () => {
  test("uses documented dotted RPC names and rejects underscore variants", () => {
    expect(getGatewayMethod("sessionsCreate")).toBe("sessions.create");
    expect(getGatewayMethod("sessionsSend")).toBe("sessions.send");
    expect(getGatewayMethod("sessionsAbort")).toBe("sessions.abort");
    expect(getGatewayMethod("execApprovalResolve")).toBe("exec.approval.resolve");
    expect(GATEWAY_METHODS).not.toContain("sessions_create");
    expect(GATEWAY_METHODS).not.toContain("sessions_send");
    expect(GATEWAY_METHODS).not.toContain("exec_approval_resolve");
    expect(GATEWAY_METHODS.every((method) => !method.includes("_"))).toBe(true);
  });

  test("builds connect as the first Gateway request with least privilege scopes", () => {
    const frame = buildConnectRequest({
      id: "connect-1",
      nonce: "nonce",
      token: "server-only-token",
      platform: "darwin",
      instanceId: "test-instance"
    });

    expect(frame).toMatchObject({
      type: "req",
      id: "connect-1",
      method: "connect",
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        role: "operator",
        scopes: requiredOperatorScopes,
        client: {
          id: "gateway-client",
          mode: "backend",
          instanceId: "test-instance"
        }
      }
    });
    expect(JSON.stringify(frame)).toContain("server-only-token");
    expect(JSON.stringify(redactConnectFrameForReport(frame))).not.toContain("server-only-token");
    expect(frame.params).not.toHaveProperty("connectChallengeNonce");
  });

  test("builds connect without auth and redacts only when auth exists", () => {
    const frame = buildConnectRequest({
      id: "connect-2",
      nonce: "nonce",
      platform: "darwin",
      instanceId: "test-instance"
    });
    const passwordFrame = buildConnectRequest({
      id: "connect-3",
      nonce: "nonce",
      password: "server-only-password",
      platform: "darwin",
      instanceId: "test-instance"
    });

    expect(frame.params).not.toHaveProperty("auth");
    expect(redactConnectFrameForReport(frame)).toEqual(frame);
    expect(JSON.stringify(redactConnectFrameForReport(passwordFrame))).not.toContain("server-only-password");
  });

  test("builds connect with signed device auth and redacts device fields", () => {
    const frame = buildConnectRequest({
      id: "connect-device",
      nonce: "nonce",
      token: "server-only-token",
      platform: "darwin",
      instanceId: "test-instance",
      device: {
        id: "device-id",
        publicKey: "public-key",
        signature: "signature",
        signedAt: 1777816800000,
        nonce: "nonce"
      }
    });

    expect(frame.params).toMatchObject({
      auth: { token: "server-only-token" },
      device: {
        id: "device-id",
        publicKey: "public-key",
        signature: "signature",
        signedAt: 1777816800000,
        nonce: "nonce"
      },
      scopes: requiredOperatorScopes
    });
    const redacted = JSON.stringify(redactConnectFrameForReport(frame));
    expect(redacted).not.toContain("server-only-token");
    expect(redacted).not.toContain("signature");
    expect(redacted).not.toContain("public-key");
    expect(redacted).toContain("[REDACTED_DEVICE_AUTH]");
  });

  test("blocks backend Gateway mode outside loopback URLs", () => {
    expect(isLoopbackGatewayUrl("ws://127.0.0.1:18789")).toBe(true);
    expect(isLoopbackGatewayUrl("ws://localhost:18789")).toBe(true);
    expect(isLoopbackGatewayUrl("wss://openclaw.example.com/gateway")).toBe(false);
  });

  test("marks missing negotiated scopes blocked instead of warning-only", () => {
    const state = evaluateHelloOk({
      type: "hello-ok",
      protocol: 3,
      auth: {
        role: "operator",
        scopes: ["operator.read", "operator.write"]
      }
    });

    expect(state.status).toBe("blocked");
    expect(state.missingScopes).toEqual(["operator.approvals"]);
    expect(state.canIssueControlActions).toBe(false);
  });

  test("marks non-operator negotiated roles blocked even with scopes", () => {
    const state = evaluateHelloOk({
      type: "hello-ok",
      protocol: 3,
      auth: {
        role: "viewer",
        scopes: [...requiredOperatorScopes]
      }
    });

    expect(state.status).toBe("blocked");
    expect(state.canIssueControlActions).toBe(false);
  });

  test("accepts required negotiated role and scopes", () => {
    const state = evaluateHelloOk({
      type: "hello-ok",
      protocol: 3,
      auth: {
        role: "operator",
        scopes: ["operator.admin", ...requiredOperatorScopes]
      }
    });

    expect(state).toMatchObject({
      status: "ready",
      role: "operator",
      scopes: expect.arrayContaining(requiredOperatorScopes),
      canIssueControlActions: true
    });
  });

  test("treats negotiated operator.admin as satisfying operator.approvals", () => {
    const state = evaluateHelloOk({
      type: "hello-ok",
      protocol: 3,
      auth: {
        role: "operator",
        scopes: ["operator.admin", "operator.read", "operator.write"]
      }
    });

    expect(state).toMatchObject({
      status: "ready",
      role: "operator",
      scopes: ["operator.admin", "operator.read", "operator.write"],
      missingScopes: [],
      canIssueControlActions: true
    });
  });

  test("reconnect plan refreshes and resubscribes because events are not replayed", () => {
    expect(buildReconnectPlan("agent:hugin:main")).toEqual([
      { method: "health", params: {} },
      { method: "system-presence", params: {} },
      { method: "exec.approval.list", params: {} },
      { method: "sessions.list", params: { includeDerivedTitles: true, includeLastMessage: true, limit: 50 } },
      { method: "sessions.subscribe", params: {} },
      { method: "sessions.messages.subscribe", params: { key: "agent:hugin:main" } }
    ]);
  });

  test("throws on unknown or underscore Gateway methods", () => {
    expect(() => assertDottedGatewayMethod("sessions_send")).toThrow("Unsupported Gateway RPC method");
    expect(() => assertDottedGatewayMethod("sessions.send")).not.toThrow();
  });
});
