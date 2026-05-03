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
