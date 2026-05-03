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
