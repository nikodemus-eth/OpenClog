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
