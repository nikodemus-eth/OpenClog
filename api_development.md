# API Development Log

## Purpose
Track public API contracts and Gateway RPC usage.

## 2026-05-02 Bootstrap Intent
- Public API: `/api/health`, `/api/days`, `/api/days/:dayKey`, `/api/stream`, `/api/composer`, `/api/approvals`, `/api/approvals/:id/resolve`, `/api/sessions/:key/abort`, `/api/days/:dayKey/export`, and `/api/settings`.
- Gateway RPC methods must use dotted names such as `sessions.create`, `sessions.send`, `sessions.abort`, and `exec.approval.resolve`.

## 2026-05-02 MVP Closeout
- Implemented public API routes: `GET /api/health`, `GET /api/days`, `GET /api/days/:dayKey`, `GET /api/stream`, `POST /api/composer`, `GET /api/approvals`, `POST /api/approvals/:id/resolve`, `POST /api/sessions/:key/abort`, `GET /api/days/:dayKey/export`, and `GET/PUT /api/settings`.
- Composer `/note` writes locally; ask/command flows use `sessions.create` and `sessions.send`; abort uses `sessions.abort`; approval resolution uses `exec.approval.resolve`.
- Added `check:forbidden-rpc` so `sessions_create`, `sessions_send`, `sessions_abort`, and `exec_approval_resolve` fail deterministic verification if introduced.
- `verify:gateway` probes `connect.challenge`, sends `connect`, evaluates `hello-ok.auth.role` and `hello-ok.auth.scopes`, subscribes with `sessions.subscribe` and `sessions.messages.subscribe`, and fails closed when negotiation is unavailable.

## 2026-05-02 Local Gateway Token Follow-Up
- The live adapter reads the local token from environment, token file, or the machine-local OpenClaw config path. It never sends the token to the browser.
- Reconnect probing now uses `health`, `system-presence`, `exec.approval.list`, `sessions.list`, `sessions.subscribe`, and `sessions.messages.subscribe`.
- `npm run verify:gateway` passed live after token injection, negotiating only `operator.read`, `operator.write`, and `operator.approvals`.

## 2026-05-02 Live Flow Follow-Up
- `POST /api/composer` now creates a session, subscribes to that session's message stream, sends exactly one message, and returns the created session key plus a waiting notice.
- `GET /api/stream` now keeps browser SSE clients open and publishes `journal` events when OpenClaw session messages, tool events, approval events, or sequence gaps are journaled.
- Gateway event ingestion filters out noisy health/tick traffic and journals only user-visible operational events.
- Live correction: `sessions.create` is called without a reused label because the installed Gateway enforces label uniqueness.
- `verify:gateway` mutation mode was aligned with the same flow: `sessions.create`, `sessions.messages.subscribe`, `sessions.send`, and `sessions.abort` only when explicitly enabled.

## 2026-05-02 Five-Theme UI Refinement
- API and Gateway contracts were intentionally unchanged for this UI addendum.
- Public UI fixtures and route expectations now use OpenClog/OpenClog Journal product copy while preserving OpenClaw Gateway wording for integration/status messages.
- Theme IDs exposed to the browser now use canonical frontend IDs from `packages/core`; aliases remain resolver-only compatibility inputs.

## 2026-05-02 Interaction Refinement
- `GET/PUT /api/settings` now includes `showToolCalls` for display-only tool-call filtering and preserves existing public Gateway state behavior.
- Added `GET /api/sessions?dayKey=YYYY-MM-DD`, returning sanitized `AgentActivity[]` from live `sessions.list` when Gateway control is ready, with selected-day journal fallback.
- `GET /api/approvals` now normalizes public approval view models: `id`, `title`, `command`, `status`, `requestedAt`, and `sessionKey`.
- Approval submit sends `exec.approval.resolve` only for approve/disapprove selections, mapping approve to `allow-once` and disapprove to `deny`; defer sends no API call.

## 2026-05-02 Theme Families Expansion
- No public API routes, Gateway RPC method names, permissions, composer behavior, approval behavior, persistence behavior, or delivery behavior were changed for the theme family expansion.
- Theme metadata exposed to the browser remains UI presentation data only.
- Public UI fixtures and tests were expanded to cover all selectable themes without adding any browser path to Gateway credentials or raw frames.
