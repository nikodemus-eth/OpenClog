# Network Log

## Purpose
Track network behavior, local Gateway assumptions, and remote deployment boundaries.

## 2026-05-02 Bootstrap Intent
- Default Gateway URL is `ws://127.0.0.1:18789`.
- `gateway-client` backend mode is allowed only for direct loopback use with shared token/password auth.
- Remote/non-loopback deployments are blocked until a separate safe auth path is designed.

## 2026-05-02 MVP Closeout
- The browser uses only the backend HTTP/SSE API and never receives Gateway credentials.
- `verify:gateway` blocks remote/non-loopback URLs for `gateway-client` backend mode.
- The live probe reached the Gateway path far enough to fail closed with `device identity required`; no `hello-ok` role/scopes were negotiated in this environment.
- Because Gateway events are not replayed, reconnect behavior is designed to refresh Gateway state and reconcile with local SQLite journal hashes.

## 2026-05-02 Local Gateway Token Follow-Up
- The local OpenClaw Gateway is running on `ws://127.0.0.1:18789`.
- With the machine-local token, `verify:gateway` passed live and subscribed to session index plus active session messages/tools.
- OpenClog API is running on `http://127.0.0.1:8787` and the Vite frontend is running on `http://127.0.0.1:5173`.
- Remote/non-loopback Gateway backend mode remains blocked.
