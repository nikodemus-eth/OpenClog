# Security Log

## Purpose
Track OpenClog security posture, Gateway authority boundaries, redaction, and fail-closed behavior.

## 2026-05-02 Bootstrap Intent
- Gateway tokens, auth headers, cookies, env values, and secret-looking payloads must never reach the browser.
- Persist only redacted Gateway payloads plus stable hashes and redaction reports.
- Composer must block admin, pairing, secret, install, update, and config mutation commands.
- Themes must not hide errors, approvals, stale Gateway state, blocked auth, or degraded connectivity.

## 2026-05-02 MVP Closeout
- Persistence uses `raw_event_redacted_json`, `raw_event_hash`, and `redaction_report_json`; there is no `raw_event_json` storage path.
- Redaction covers token/auth/cookie/password/secret/API key/env/header/tool-payload keys plus bearer, assignment-style, and `sk-` secret-looking strings.
- Composer blocks `/config`, `/secrets`, `/pairing`, `/install`, `/update`, and admin-class escalation outside `operator.read`, `operator.write`, and `operator.approvals`.
- Gateway control actions require negotiated `operator.read`, `operator.write`, and `operator.approvals`; missing scopes are blocked/degraded state, not a cosmetic warning.
- Theme tokens can change colors and labels, but the UI state tests require errors, pending approvals, stale Gateway state, blocked auth, and degraded connectivity to stay visible.
- `npm audit --audit-level=moderate` reported zero vulnerabilities after unused vulnerable packages were removed and Drizzle was pinned to a non-vulnerable version.

## 2026-05-02 Local Gateway Token Follow-Up
- The local token was consumed only through backend environment/config loading and was not printed, committed, persisted in OpenClog, or sent to the browser.
- Live Gateway request logs in memory store redacted parameters only.
- The live adapter refuses remote/non-loopback URLs for backend `gateway-client` auth.

## 2026-05-02 Live Flow Follow-Up
- Live event persistence writes only normalized journal entries plus redacted Gateway payload columns, stable hashes, and redaction reports.
- The browser receives journal entries and public Gateway state, not Gateway tokens, auth headers, cookies, env values, or raw Gateway frames.
- Normalized message bodies are passed through redaction before being persisted or displayed.
- Gateway health/tick frames are not journaled as user activity, which keeps closeout evidence tied to real message flow instead of background noise.

## 2026-05-02 Five-Theme UI Refinement
- Theme switching remains presentation-only and does not change permissions, Gateway state, composer behavior, approvals, diagnostics, or journal data.
- Every theme keeps visible text for errors, pending approvals, stale Gateway state, blocked/degraded connectivity, and status chips.
- The browser tests assert that token-like Gateway secrets are not displayed while rendering all five themes.
- Static background assets are local, decorative, non-interactive, and unable to hide operational warnings.

## 2026-05-02 Interaction Refinement
- `Show Tool Calls` is display-only and does not alter Gateway subscriptions, redacted persistence, hashes, or audit evidence.
- `GET /api/sessions` returns sanitized `AgentActivity` view models; live session metadata is redacted before browser exposure and falls back to local journal entries.
- `GET /api/approvals` returns sanitized approval view models only, and resolution exposes only `allow-once` or `deny`; defer sends no Gateway request.
- Live event toasts carry public day and entry identifiers only and never include Gateway tokens, auth headers, cookies, env values, or raw frames.

## 2026-05-02 Theme Families Expansion
- Theme switching remains presentation-only and does not change Gateway scopes, permissions, composer behavior, approval behavior, persistence, or delivery.
- Every theme family keeps browser-visible text for Gateway state, Agent Activity, Recent Tools, Pending approvals, status chips, degraded state, blocked state, and security warnings.
- Long browser-visible event text now renders as a preview with local redaction/summarization for token-like values, auth headers, cookies, OAuth values, SMTP credentials, env-looking values, raw Gateway-looking payloads, and non-operator-facing local paths.
- Decorative backgrounds are local SVG/CSS-only assets, behind readable surfaces, and contain no external image references, logos, trademark metadata, or copied brand assets.
- Final asset and browser-visible secret scans found no external background URLs, proprietary asset metadata, stale product title text, or browser-facing credential strings outside the intended redaction/schema guard code.

## 2026-05-03 Stabilization And Refactor
- Theme switching remains presentation-only and still does not change Gateway scopes, permissions, composer forwarding, approval resolution, persistence, or delivery.
- Browser-visible event text now reports redaction reasons: `credential`, `token_like`, `auth_header`, `cookie`, `oauth`, `smtp`, `env_assignment`, `raw_gateway_payload`, `unsafe_local_path`, and `long_preview`.
- Timeline grouping is display-only: grouped entries retain IDs, timestamps, actor/source, event kind, status, sanitized body signature, and grouping reason while raw history remains available.
- User messages, approvals, warnings, errors, pending/running events, and actionable entries remain ungrouped.
- The browser-visible secret scan found only redaction/test guard references, not exposed Gateway tokens, auth headers, cookies, OAuth values, SMTP credentials, env assignments, raw Gateway payloads, or unsafe local paths in UI output.
- Live Gateway verification failed closed with `device identity required`; no live Gateway activity was fabricated.

## 2026-05-03 Stitch Operator Shell Integration
- The Stitch integration did not change backend credentials, Gateway RPC method names, scopes, permissions, composer forwarding, approval resolution, persistence, APIs, or delivery behavior.
- Browser controls added for the top shell are focus/toggle affordances only and expose no admin, pairing, config, secret, or broad-scope actions.
- The local operator avatar is deterministic text/CSS; no remote profile image, Google font, Material Symbols dependency, Tailwind CDN script, or external Stitch asset was imported.
- Added red-team/source checks for remote Stitch asset leakage and browser checks for local-only script/link/image usage.
- Gateway tokens, auth headers, cookies, OAuth values, SMTP credentials, env assignments, raw Gateway payloads, and unsafe local paths remain blocked from browser-visible text.
- `npm run verify:gateway` failed closed with `device identity required`; no live Gateway activity was fabricated.

## 2026-05-03 Stitch Fidelity Correction
- The correction remained presentation-only and did not alter Gateway auth, scopes, RPC method names, command blocking, approval decisions, persistence, or public API contracts.
- Shell utilities and rail shortcuts still perform safe focus/toggle actions only; no admin, config, pairing, secret, or broad-scope controls were added.
- Browser-visible diagnostics, Gateway degraded state, pending approvals, Agent Activity, Recent Tools, and status chips remain visible in every selectable theme.
- The asset-safety posture remains unchanged: no Tailwind CDN, Google font, Material Symbols remote dependency, remote profile image, or Stitch external asset URL is shipped.
