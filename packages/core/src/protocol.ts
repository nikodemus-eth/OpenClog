import type { GatewayCallPlan } from "./types.js";

export const requiredOperatorScopes = ["operator.read", "operator.write", "operator.approvals"] as const;

export type RequiredOperatorScope = (typeof requiredOperatorScopes)[number];

export const GATEWAY_METHODS = [
  "connect",
  "health",
  "system-presence",
  "sessions.create",
  "sessions.send",
  "sessions.abort",
  "sessions.list",
  "sessions.subscribe",
  "sessions.messages.subscribe",
  "exec.approval.list",
  "exec.approval.resolve",
  "chat.history",
  "chat.send",
  "chat.abort",
  "chat.inject"
] as const;

export type GatewayMethod = (typeof GATEWAY_METHODS)[number];

const gatewayMethodMap = {
  connect: "connect",
  health: "health",
  systemPresence: "system-presence",
  sessionsCreate: "sessions.create",
  sessionsSend: "sessions.send",
  sessionsAbort: "sessions.abort",
  sessionsList: "sessions.list",
  sessionsSubscribe: "sessions.subscribe",
  sessionsMessagesSubscribe: "sessions.messages.subscribe",
  execApprovalList: "exec.approval.list",
  execApprovalResolve: "exec.approval.resolve",
  chatHistory: "chat.history",
  chatSend: "chat.send",
  chatAbort: "chat.abort",
  chatInject: "chat.inject"
} as const satisfies Record<string, GatewayMethod>;

export type GatewayMethodKey = keyof typeof gatewayMethodMap;

export interface GatewayRequestFrame {
  type: "req";
  id: string;
  method: GatewayMethod;
  params: Record<string, unknown>;
}

export interface GatewayDeviceAuth {
  id: string;
  nonce: string;
  publicKey: string;
  signature: string;
  signedAt: number;
}

export interface ConnectRequestInput {
  device?: GatewayDeviceAuth;
  id: string;
  nonce: string;
  token?: string;
  password?: string;
  platform: string;
  instanceId: string;
}

export interface HelloOkLike {
  type: "hello-ok";
  protocol: number;
  auth: {
    role: string;
    scopes: string[];
  };
}

export interface GatewayNegotiatedState {
  status: "ready" | "blocked" | "degraded";
  role: string;
  scopes: string[];
  missingScopes: string[];
  canIssueControlActions: boolean;
}

export function getGatewayMethod(key: GatewayMethodKey): GatewayMethod {
  return gatewayMethodMap[key];
}

export function buildConnectRequest(input: ConnectRequestInput): GatewayRequestFrame {
  const auth =
    input.token === undefined && input.password === undefined
      ? {}
      : { auth: { token: input.token, password: input.password } };
  const device = input.device === undefined ? {} : { device: input.device };
  return {
    type: "req",
    id: input.id,
    method: "connect",
    params: {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: "gateway-client",
        displayName: "OpenClog Journal Backend",
        version: "0.1.0",
        platform: input.platform,
        mode: "backend",
        instanceId: input.instanceId
      },
      role: "operator",
      scopes: [...requiredOperatorScopes],
      caps: [],
      ...device,
      ...auth
    }
  };
}

export function redactConnectFrameForReport(frame: GatewayRequestFrame): GatewayRequestFrame {
  const params = { ...frame.params };
  if ("auth" in params) params.auth = "[REDACTED_AUTH]";
  if ("device" in params) params.device = "[REDACTED_DEVICE_AUTH]";
  return { ...frame, params };
}

export function isLoopbackGatewayUrl(url: string): boolean {
  const parsed = new URL(url);
  return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
}

export function evaluateHelloOk(hello: HelloOkLike): GatewayNegotiatedState {
  const missingScopes = requiredOperatorScopes.filter((scope) => !hello.auth.scopes.includes(scope));
  const ready = hello.auth.role === "operator" && missingScopes.length === 0;
  return {
    status: ready ? "ready" : "blocked",
    role: hello.auth.role,
    scopes: [...hello.auth.scopes],
    missingScopes,
    canIssueControlActions: ready
  };
}

export function buildReconnectPlan(activeSessionKey: string): GatewayCallPlan[] {
  return [
    { method: "health", params: {} },
    { method: "system-presence", params: {} },
    { method: "exec.approval.list", params: {} },
    { method: "sessions.list", params: { includeDerivedTitles: true, includeLastMessage: true, limit: 50 } },
    { method: "sessions.subscribe", params: {} },
    { method: "sessions.messages.subscribe", params: { key: activeSessionKey } }
  ];
}

export function assertDottedGatewayMethod(method: string): asserts method is GatewayMethod {
  if (!GATEWAY_METHODS.includes(method as GatewayMethod) || method.includes("_")) {
    throw new Error(`Unsupported Gateway RPC method: ${method}`);
  }
}
