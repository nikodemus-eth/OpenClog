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

## 2026-05-03 Gateway Device Auth And Shell Shortcuts
- Device identity, private keys, Gateway tokens, auth headers, and raw connect frames remain backend-only and are redacted from diagnostic reports.
- The signed device payload uses the existing Gateway token as the signature token and does not use the broader stored device token from `device-auth.json`.
- OpenClog still requests only `operator.read`, `operator.write`, and `operator.approvals`; the local already-paired Gateway may negotiate broader existing device scopes, but no admin, pairing, or secrets UI behavior was added.
- Family shortcuts are presentation-only theme selection; Network, Monitors, Security, settings, and filter controls only focus existing safe surfaces or show local status feedback.
- Browser-visible secret and red-team checks remain part of `npm run verify`, and no token-like values or raw Gateway payloads are intentionally exposed.

## 2026-05-03 Theme Intent Realignment And Contrast Pass
- Theme intent metadata is presentation-only and adds no authority, Gateway scope, command forwarding, admin surface, pairing surface, secret surface, or credential path.
- Every theme continues to render Gateway state, Agent Activity, Recent Tools, Pending approvals, degraded/blocked/error/security warnings, and visible status chips.
- Non-accessibility contrast was tightened for shell text, sidebars, archive cards, inactive text, placeholders, and status chips so expressive themes do not hide operational state.
- Asset-safety scanning found no shipped external image, font, script, Tailwind CDN, Google font, Material Symbols remote dependency, or copied proprietary asset reference.
- Browser-visible secret scanning found only redaction/test guard references, not exposed token-like values, auth headers, cookies, OAuth values, SMTP credentials, env assignments, raw Gateway payloads, or unsafe local paths.
- Live Gateway verification negotiated a local operator device with broader existing paired scopes, but OpenClog's request path remains limited to `operator.read`, `operator.write`, and `operator.approvals` and no admin, pairing, or secrets UI was added.

## 2026-05-03 Durable Gateway Connection
- Gateway tokens, device identity, private keys, signatures, auth headers, raw connect frames, cookies, env values, and raw Gateway payloads remain backend-only.
- Public Gateway health exposes only redacted connection state and service-recovery summaries.
- Auto-restart is guarded: loopback and macOS only, repeated eligible failures only, cooldown-bound, and blocked for token mismatch, missing device identity, pairing-required, missing-scope, and remote Gateway failures.
- Composer and approval behavior remain fail-closed while the Gateway is stale or reconnecting; no fake local success path was added.
- The browser-visible secret checks were extended through the reconnecting UI state and continue to reject token-like or raw-frame leakage.

## 2026-05-04 Phase 1 Quick Wins Hardening
- The new profile diagnostics surface exposes only safe Gateway authority metadata: URL, safety classification, and operator-facing explanatory text. No token, device identity, auth header, cookie, env value, or raw frame data was added to browser state.
- The incident bundle copy action reuses the existing redacted export path; it does not bypass bundle redaction or create a second serialization path with weaker controls.
- Generated-summary staleness and retention-preview totals are display metadata only and do not grant new mutation authority.
- Pinned-summary validation is now explicit and fail-closed in the UI, preventing empty or overlong saved summary text from quietly entering the persisted operator context.
- Browser-visible empty states and reconnect diagnostics were expanded without weakening the existing browser-visible secret scans or red-team fixture lane.

## 2026-05-04 Phase 2 Domain And Lifecycle Tranche
- Retention apply/rollback now persists explicit snapshot state instead of relying on request-local memory; rollback is a defined operator action with stored evidence.
- Alert acknowledgement and snooze are stored as local operator state only and layered onto alert findings without granting broader control scopes.
- Replay-bundle inspection reads already-exported local evidence and returns a bounded summary only; it does not reconnect to Gateway or trust arbitrary remote execution data.
- Expanded integration targets remain payload builders only in this tranche; no outbound delivery secrets or browser-side webhook credentials were introduced.

## 2026-05-04 Ladder 1 Investigation Acceleration Slice
- Search snippets and field hints are derived from the same browser-visible redaction path as timeline text; the richer search contract does not expose raw payloads or bypass secret scrubbing.
- Gateway error categories are now exposed separately from full error text, which keeps degraded-state diagnosis faster without widening secret leakage risk.
- Repo-derived health history, session-summary copy, and bundle-manifest preview remain sanitized evidence views only; they do not expose device identity, Gateway tokens, raw connect frames, or unredacted event payloads.

## 2026-05-04 Ladder 2 Incident Workspace Slice
- Investigation notes are stored as operator-authored local evidence only; they are separate from generated summaries and never require raw Gateway payload access.
- Incident workspace, replay-bundle diff, and closeout-plan routes operate entirely on persisted redacted evidence plus operator metadata. No new route returns raw event frames, auth material, device identity, or browser-visible delivery secrets.
- Bundle comparison remains bounded to manifest fields, entry ids, summary/markdown change flags, and metadata-key differences; it does not expose hidden payload content while still giving operators a useful “what changed” view.

## 2026-05-04 Full Improvement Tranche Closeout
- API example copy controls expose only route names and bounded sample payloads; clipboard failure falls back to local notice text and does not require secrets, auth headers, cookies, device identity, or raw Gateway frames in browser state.
- Evidence completeness is derived from local summary, note, bundle, and incident presence, so the badge improves operator triage without granting new read authority.
- Replay-bundle change classification stays at narrative, metadata, or evidence-shape level and does not disclose hidden payload content.
- Global shortcuts now avoid `Shift+letter` interception, reducing accidental command activation while operators type notes, search queries, or summaries.
