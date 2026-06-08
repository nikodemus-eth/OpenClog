# Network Log

## Purpose
Track network behavior, local Gateway assumptions, and remote deployment boundaries.

## 2026-06-08 Final Local Network Proof
- Latest live route-budget proof against `http://127.0.0.1:8787` remained green after the coverage refactor and post-commit restart to `f6d3cef`: `/api/operations/report` 396 ms / 750 ms, `/api/verification/receipts` 3 ms / 200 ms, `/api/sessions/:key` 2 ms / 300 ms, `breachCount: 0`.
- The live listener now reports commit `f6d3cef`, PID `33268`, build timestamp `2026-06-08T11:18:50.216Z`, and runtime fingerprint `6a72172c2df794c23c2bfc2392bb037e3c6e689f39904e1866db23f7d4c3f435`.
- `npm run verify:gateway` passed against the local Gateway with status `ready`, role `operator`, scopes `operator.admin`, `operator.read`, and `operator.write`; mutation testing stayed disabled.
- The browser network boundary is unchanged: the web app still uses OpenClog HTTP/SSE routes and does not connect directly to OpenClaw Gateway or receive Gateway credentials.

## 2026-06-08 Default 8787 Startup Proof
- `com.m4.openclog-api` remains local and loopback-only on `http://127.0.0.1:8787`; no browser-to-Gateway boundary changed.
- The user launchd environment no longer carries `OPENCLOG_OPENCLAW_SESSION_BACKFILL=0`. `launchctl print gui/$(id -u)/com.m4.openclog-api` showed the inherited environment contained `SSH_AUTH_SOCK` only.
- The default-started listener bound `/api/version` in 729 ms and reported commit `05fa238`, PID `98679`, build timestamp `2026-06-08T10:58:19.319Z`, and runtime fingerprint `84b2ece13dc6062251447943a4754a04d14236819453b7d61f4a8a65cf4e4826`.
- The live load harness is green on that listener: `/api/operations/report` 249 ms / 750 ms, `/api/verification/receipts` 3 ms / 200 ms, `/api/sessions/:key` 2 ms / 300 ms, `breachCount: 0`.
- Remaining network proof limits are unchanged: mutation-enabled Gateway verification and live-send delivery proof are not covered by this loopback startup/load pass.

## 2026-06-06 Current-Source 8787 Runtime Boundary
- The live OpenClog API listener on `http://127.0.0.1:8787` no longer reports the old `2d37c7f` runtime. After focused package rebuild and final post-proof LaunchAgent restart, `/api/version` reports commit `05fa238`, PID `90222`, build timestamp `2026-06-06T19:35:03.247Z`, and runtime fingerprint `5599ca09712b9833b9e3eb59a2167648162d4161d8962acdee35891ef0336bfa`.
- The LaunchAgent remains local and loopback-only; this proof run inherited `OPENCLOG_OPENCLAW_SESSION_BACKFILL=0` because the default startup backfill path could keep the process CPU-bound before it opened the port.
- Live route-budget proof is not green: `npm run test:load -- --base-url http://127.0.0.1:8787 --day-key 2026-06-06` reached all three HTTP targets, but `/api/operations/report` breached at 14454 ms / 750 ms.

## 2026-06-03 Gateway And Runtime Boundary
- `npm run verify:gateway` passed against the local loopback Gateway with status ready and read/subscribe probes for `health`, `system-presence`, `exec.approval.list`, `sessions.list`, `sessions.subscribe`, and `sessions.messages.subscribe`; mutation testing stayed disabled.
- The browser network boundary did not widen for attention acknowledge/snooze, healthz details, closeout blockers, or saved views: the web app still uses OpenClog HTTP/SSE routes and never talks directly to OpenClaw Gateway.
- At that June 3 check, the live OpenClog API listener on `http://127.0.0.1:8787` was stale because `/api/version` reported commit `2d37c7f` while the working tree was on `HEAD` `05fa238` plus dirty changes. The June 6 section above supersedes that listener identity.

## 2026-05-18 Quick Wins Trust Tranche
- No browser-to-Gateway boundary changed in this tranche: the browser still talks only to the OpenClog HTTP/SSE API, and all new trust cues come from backend/shared report assembly.
- The new delivery-target `last verified` indicators, verification receipt comparisons, incident badge state, and route-budget regression row metadata are all backend-authored view data over existing local routes.
- Keyboard additions for blocked actions and failed receipts only move local focus; they do not add new network calls or any browser-visible credential path.

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
