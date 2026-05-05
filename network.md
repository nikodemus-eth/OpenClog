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

## 2026-05-03 Stitch Operator Shell Integration
- No new network calls were added for the Stitch shell, top navigation, local operator avatar, theme rendering, or visual snapshots.
- The browser still communicates only with the OpenClog backend HTTP/SSE API and never with OpenClaw Gateway directly.
- The implementation rejects the generated Stitch pattern of remote scripts, fonts, profile images, and external assets; all shell visuals are local CSS/React/lucide output.
- E2E and visual verification remain fixture-driven and do not fabricate live OpenClaw Gateway traffic.
- `npm run verify:gateway` failed closed with `device identity required`; no live Gateway path was marked green.

## 2026-05-03 Stitch Fidelity Correction
- No new network calls were added for the corrected shell, rail shortcuts, composer styling, diagnostics styling, approval panel positioning, or visual snapshots.
- Browser-to-Gateway isolation remains unchanged: the browser uses only OpenClog HTTP/SSE API state and never receives Gateway credentials or direct Gateway access.
- The correction continues to avoid external fonts, images, scripts, profile assets, and remote Stitch URLs.
- Live Gateway verification remains separate from deterministic UI verification; `npm run verify:gateway` failed closed with `device identity required`.

## 2026-05-03 Gateway Device Auth And Shell Shortcuts
- Live Gateway probing now succeeds from OpenClog using the local loopback Gateway, backend token loading, and backend device identity signing.
- The browser still talks only to the OpenClog API and SSE stream; it never connects directly to the OpenClaw Gateway or receives device auth material.
- `openclaw gateway status` reports the Gateway listener on `127.0.0.1:18789` with connectivity probe `ok`; service PATH hygiene warnings remain OpenClaw service configuration notes, not OpenClog network blockers.
- During final closeout, a transient Gateway challenge timeout was recovered with `openclaw gateway restart`; the follow-up status probe returned connectivity `ok`.
- UI shortcut fixes added no network calls; they only select themes, move focus, or update local action status.

## 2026-05-03 Theme Intent Realignment And Contrast Pass
- No network calls were added for practical theme grouping, intent metadata, archetype styling, contrast fixes, Dyslexia Friendly layout work, or visual snapshot refreshes.
- All theme changes remain local React/CSS/token behavior behind the existing OpenClog HTTP/SSE API.
- Browser-to-Gateway isolation remains unchanged: the browser never connects to the OpenClaw Gateway and never receives Gateway token, device identity, auth header, cookie, env value, or raw frame data.
- Live `npm run verify:gateway` passed against the loopback Gateway after device auth; the verifier did not run mutation testing or fabricate session traffic.
- The live probe reported `hello-ok` readiness and probed `health`, `system-presence`, `exec.approval.list`, `sessions.list`, `sessions.subscribe`, and `sessions.messages.subscribe`.

## 2026-05-03 Durable Gateway Connection
- OpenClog now treats Gateway close/error/timeout as a recoverable backend socket lifecycle event instead of a terminal degraded state.
- Reconnect attempts stay on loopback Gateway URLs and re-read token/device identity from the backend source each time.
- Auto-restart uses `launchctl kickstart -k gui/$(id -u)/ai.openclaw.gateway` only after repeated eligible reconnect failures and a cooldown window.
- Browser networking remains unchanged: the web app uses OpenClog HTTP/SSE routes and never connects directly to the OpenClaw Gateway.

## 2026-05-04 Phase 1 Quick Wins Hardening
- No new browser network paths were added for the Phase 1 operator improvements.
- URL-persisted search is route state only; it changes the browser address/query string but does not add a direct browser-to-Gateway channel.
- The selected-profile diagnostics now make loopback/LAN/remote targeting visible to the operator, but the browser still talks only to the OpenClog HTTP/SSE API.
- Incident bundle copy uses locally fetched export data and the browser clipboard API; it does not introduce outbound transport.

## 2026-05-04 Phase 2 Domain And Lifecycle Tranche
- Pagination, retention lifecycle, alert lifecycle, expanded integrations, and replay inspection all stay behind the existing OpenClog HTTP API boundary.
- No direct browser-to-Gateway or browser-to-third-party delivery channel was added; even the new integration targets remain backend-generated payloads only.
- Replay bundle inspection is local HTTP request/response processing over already-exported data, not a live network replay channel.

## 2026-05-04 Full Improvement Tranche Closeout
- No direct browser-to-Gateway network path was added for saved presets, evidence completeness badges, API example copy buttons, replay diff classifications, or shortcut changes.
- API example copy buttons generate local clipboard text from existing route shapes; they do not send third-party delivery requests or expose delivery credentials.
- Gateway readiness and reconnect trend visibility remains sourced from OpenClog API health data, not a new browser socket to OpenClaw Gateway.
- Final live Gateway verification reached `status: ready` against the local Gateway and probed `health`, `system-presence`, `exec.approval.list`, `sessions.list`, `sessions.subscribe`, and `sessions.messages.subscribe`; mutation testing stayed off.

## 2026-05-05 Workbench Execution Lanes
- Retention apply/rollback, alert acknowledgement/snooze, replay inspection, and correlation inspection all use existing OpenClog HTTP API routes; the browser still never connects directly to OpenClaw Gateway.
- The new alert and retention controls do not add outbound third-party delivery, webhook calls, or browser-visible credentials.
- Replay/correlation entry jump controls are local UI navigation only; they do not trigger Gateway replay, remote fetches, or live session mutation.
- Network failure for replay or correlation is reported as fail-closed unavailable local evidence, preserving the boundary between deterministic UI fixtures, local API state, and live Gateway verification.
