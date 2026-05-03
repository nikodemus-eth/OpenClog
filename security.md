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
