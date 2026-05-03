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

## 2026-05-02 Live Flow Follow-Up
- Confirmed live Gateway event traffic includes `session.message`, `sessions.changed`, `chat`, `agent`, `health`, and `tick`; OpenClog journals only the operational event families it can safely normalize.
- Confirmed `ping` sent through OpenClog's API produced `pong` from OpenClaw and appeared in the browser through the local HTTP/SSE path.
- The API remains token-backed and local-only at `http://127.0.0.1:8787`; the browser continues to use only proxied `/api/*` routes from `http://127.0.0.1:5173`.

## 2026-05-02 Five-Theme UI Refinement
- No new network or Gateway permissions were added for theme switching, backgrounds, accessibility checks, or visual tests.
- Background assets are local files bundled with the web app; no external image or font network fetch is required for theme decoration.
- Live Gateway verification remains separate from deterministic UI verification and must not be inferred from fixture-driven Playwright results.
- Live Gateway probing passed when supplied with the existing machine-local OpenClaw token, negotiating `operator.read`, `operator.write`, and `operator.approvals`; mutation mode stayed disabled.

## 2026-05-02 Interaction Refinement
- `Show Tool Calls`, archive selection, and toast navigation use existing backend HTTP/SSE paths and do not alter Gateway subscriptions.
- `GET /api/sessions` may call `sessions.list` only when the negotiated Gateway state can issue control actions; otherwise it degrades to selected-day journal data.
- Pending approval resolution continues through the backend-only Gateway path and exposes no credentials to the browser.
- Live event toasts are generated from backend SSE `journal` events and expire locally after 10 seconds.
- The interaction closeout live probe failed closed with `device identity required`, so current live Gateway verification is not green.

## 2026-05-02 Theme Families Expansion
- No new network calls were added for theme selection, accessibility overlays, background assets, visual tests, or browser-visible event previews.
- All new decorative assets are local and deterministic; no external image, font, script, or stylesheet fetch is required.
- Live OpenClaw Gateway verification remains separate from deterministic theme verification and must be reported as live only when the Gateway probe actually negotiates.
- Final live Gateway probe returned failed-closed status with `device identity required`; deterministic UI and API verification remains separate from that unavailable live path.

## 2026-05-03 Stabilization And Refactor
- No new network calls were added for timeline grouping, product-copy cleanup, browser-visible redaction reasons, theme metadata, Dyslexia Friendly polish, or visual snapshots.
- Grouped/raw timeline switching, redacted previews, and diagnostics density are local UI/core projections over existing public OpenClog API state.
- Visual and E2E verification remained fixture-driven and did not fabricate live OpenClaw Gateway activity.
- `npm run verify:gateway` returned failed-closed status with `device identity required`; no live Gateway path was marked green.
