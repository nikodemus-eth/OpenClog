# Security Log

## Purpose
Track OpenClog security posture, Gateway authority boundaries, redaction, and fail-closed behavior.

## 2026-05-26 Native Runner Evidence Cutover Prep
- Native-runner history is written by the desktop host into local SQLite and surfaced as bounded evidence only; no browser route was added for writing verification receipts, native history, Gateway secrets, or readiness claims.
- The desktop self-check records public API/Gateway readiness, LaunchAgent state, SQLite path presence, and secure-store availability, but it does not expose Gateway tokens, device identity, raw frames, auth headers, or delivery secrets to the browser.
- Full native authority is still explicitly out of scope: Fastify remains the policy/report authority until a separate native policy-parity and mutation-enabled Gateway proof exists.

## 2026-05-25 One-Pass Operations Campaign
- Persisted report snapshots, saved-view audit events, and evidence-drift observations stay repository-backed and local-only; no browser-write endpoint was added for report provenance, verification receipts, or readiness narratives.
- `/api/healthz` now exposes a compact operations summary derived from sanitized local evidence only: report freshness state, smoke timestamp, queue depth, recovered-evidence provisional state, and route-budget regression count.
- The new blocked-gate `Copy next safe action` control copies bounded operator guidance only; it does not expose delivery secrets, Gateway auth material, device identity, or raw verification logs.
- The new load harness reads only bounded route URLs and timing data; fixture mode is the default so offline rehearsal does not require live Gateway or secret-bearing runtime state.

## 2026-05-20 OpenClaw Backfill Search Boundary
- The live OpenClaw session backfill stayed inside the existing backend-owned SQLite path; no browser write endpoint or browser Gateway access was added.
- The search fix indexes sanitized browser-visible body text plus provenance metadata (`sourceLabel`, `importedAt`, session id, and the explicit backfill phrase). It does not index raw Gateway frames, tokens, auth headers, device identity, or delivery secrets.
- The recovered-evidence operations summary is derived from redacted journal entry metadata only: count, day key, source label, and import timestamp. It does not expose raw session JSONL paths, payloads, prompts, tokens, or Gateway auth material.
- The route fix only preserves the existing `backfilled_openclaw` filter key in URL state; it does not grant additional operator permissions or expose new mutation capability.

## 2026-05-18 Quick Wins Trust Tranche
- Blocked-action copy affordances now reuse the existing redaction-aware formatter across incident, delivery, and verification surfaces so handoff text stays bounded and sanitized.
- Delivery-target freshness summaries and verification receipt comparisons expose receipt ids, age, and freshness metadata only; they do not expose delivery secrets, Gateway auth material, or raw credential-bearing payloads.
- The new active-incident badge and timeline source chips are operator-trust presentation over existing redacted evidence and do not widen authority or disclosure scope.

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

## 2026-05-05 Incident Command Loop Hardening
- The new incident loop remains fail-closed: missing or thin evidence is surfaced as an explicit degraded explanation category rather than being converted into confident remediation guidance.
- Incident actions execute only through backend routes and recorded local evidence. The browser still does not receive Gateway tokens, device identity, auth headers, raw connect frames, or unredacted payloads while triggering loop actions.
- Local review actions such as raw-log review, replay, correlation, packet copy, summary refresh, note capture, and closeout recording now generate explicit incident action records, preserving auditability without widening authority.
- GitHub issue creation and outbound delivery reuse the same bounded handoff path as other incident actions. Failures record typed receipt metadata including `correlationId`, `retryCount`, and `deadLetterReason` instead of silently assuming notification success.
- Versioned settings now include saved operator views, but they remain local operator preferences only and do not grant new Gateway scopes, mutation authority, or browser-visible secret access.
- Live Gateway verification now treats a negotiated `operator.admin` scope as satisfying the narrower `operator.approvals` requirement for control-action readiness, while the client still requests only `operator.read`, `operator.write`, and `operator.approvals`.

## 2026-05-05 Full Campaign Hardening
- Saved operator views now persist only local investigation preferences such as filters, selected session, and drilldown UI state; they do not carry tokens, secret values, raw Gateway payloads, or new browser-side authority.
- Summary refresh, outbound delivery, GitHub issue creation, and plugin execution all run through explicit backend contracts with idempotency-aware receipts and optional dry-run behavior, preventing duplicate escalations while preserving auditable action history.
- Signed replay/export bundles now carry manifest-hash verification metadata so tampering is surfaced as a verification result instead of being silently trusted during external handoff or replay review.
- Replay workspaces, health aggregates, SLO snapshots, incident rule packs, and generated runbooks are bounded views over persisted redacted evidence and local operator metadata only; none of the new routes expose device identity, browser-visible secrets, or raw Gateway frames.
- Desktop secret handling is now backend-only and macOS Keychain-backed through Tauri commands; non-macOS native secret operations fail closed rather than silently falling back to weaker browser or plain-text storage.

## 2026-05-05 Workbench Execution Lane Hardening
- Retention apply is preview-gated in the browser and still executes only through the backend retention route; failed apply or rollback requests leave the current UI state unchanged and report fail-closed local copy.
- Alert acknowledgement and snooze buttons mutate only stored local alert state through existing backend contracts, then refetch findings; no Gateway scope, token, device identity, or raw event access is added to the browser.
- Replay and correlation inspection renders sanitized local evidence labels and ids through the same browser-visible redaction helpers used for timeline safety, preventing raw Gateway frame text, token-like values, cookies, and unsafe local paths from leaking through the new lists.
- Failed replay/correlation reads are shown as unavailable local evidence instead of being converted into successful counts or synthetic narratives.

## 2026-05-06 Roadmap Hardening
- Backend fingerprints are public operational metadata only: PID, boot timestamp, commit, build timestamp, Node version, and runtime hash are safe to render, while Gateway tokens, device identity, auth headers, cookies, raw frames, and delivery secret values remain backend-only.
- Stale fingerprint checks reject live session reads before control evidence is served, which prevents an old browser/backend pairing from silently driving the incident surface.
- Delivery retry and adapter verification reuse backend idempotency keys, typed correlation ids, request fingerprints, and dry-run semantics; Slack, email, and generic webhook paths still fail closed unless configured server-side.
- Receipt details, plugin sandbox metadata, remote-ops policy copy, and self-check output use the browser-visible redaction helper for secret refs and local paths, and red-team coverage now guards those surfaces.
- Secure remote operations remain disabled by default; allowed origins and environment labels are metadata only, and secret access is explicitly `fail-closed`.
- Theme/background controls now carry a visible decorative-only label, making it explicit that styling cannot change evidence, scopes, delivery, retention, summaries, or incident records.

## 2026-05-07 Roadmap Follow-Through Hardening
- Per-view diagnostics persistence stays browser-local investigation state only; changing the storage key from global to view-scoped does not add Gateway authority, secret access, or hidden operator state transfer.
- Composer connectivity labeling is derived from bounded profile Gateway metadata plus readiness state and remains presentation-only; it does not create a new browser-side routing or secret path.
- Copy affordances for bundle and incident-packet digests reuse existing bounded digest strings, and the new browser copy/status text remains covered by the same secret-boundary expectations as prior handoff surfaces.
- Endpoint-budget throttling now records an explicit backend audit event when the API fails closed with `endpoint_budget_exceeded`, improving post-incident evidence without exposing new browser-visible payload content.
- Docs snapshot-count checks compare local artifact counts to `testing.md` claims only; they do not read or expose any secret-bearing runtime state.

## 2026-05-08 Fail-Closed Operator Handoff
- Summary polling is local-only and terminal-state bounded: queued/running jobs remain visible, completed jobs update generated summaries, and failed or timed-out jobs keep stale summaries visible instead of inventing success.
- Dry-run integration verification uses backend delivery contracts with `dryRun: true`; Slack, generic webhook, and email verification receipts render status, delivery reference, request fingerprint, idempotency key, and dead-letter reason without exposing secret values.
- Composer scope explanations are derived from public Gateway readiness metadata only, so missing scopes and stale connectivity become visible without moving Gateway credentials or device identity into the browser.
- Redaction-aware copy confirmations now explicitly say when bundle, digest, receipt, incident, and sanitized session copy actions used redaction-safe handoff text.

## 2026-05-08 Closeout Hardening
- Health polling no longer overwrites newer operator-action confirmations, which keeps fail-closed summary and delivery outcomes visible without changing the backend-authored Gateway readiness banner.
- The dry-run verification formatter now has explicit coverage for missing delivery references and absent dead-letter reasons, so optional receipt fields cannot collapse into misleading blank handoff text.
- The fail-closed replay/correlation browser check now waits for a real incident selection before asserting endpoint failure copy, proving the local evidence route fails closed instead of only testing a no-incident placeholder state.
- Mobile header constraints keep utility metadata and icon buttons from intercepting the brand/home control, preserving keyboard and pointer recovery paths during degraded investigations.

## 2026-05-08 Operations Backlog Hardening
- Verification Center and operations backlog routes remain local evidence views only; they aggregate redacted journal data, receipts, summaries, health, verification, and policy metadata without exposing Gateway credentials, device identity, raw frames, or delivery secrets.
- Failed delivery retry now requires explicit same-idempotency-key confirmation, performs a new backend attempt, and records a new receipt instead of silently reusing success copy; dead-letter and dry-run paths remain fail-closed.
- Role-aware simulations are declared with `liveSideEffects: false`, and governed SDK manifests expose permissions, expiry, and dry-run metadata rather than secret material.
- Backend recovery reload refreshes health, active day, and operations report state but does not bypass stale runtime guards or Gateway scope negotiation.

## 2026-05-09 Process Swarm Compatibility Closeout
- Process Swarm heartbeat notes remain ordinary investigation notes and do not gain Gateway scopes, credential access, approval authority, or command-forwarding behavior.
- No OpenClog API authentication, Gateway token handling, raw frame exposure, redaction policy, or browser credential boundary changed.
- `npm ci` reported one high-severity npm audit finding during lockfile reconciliation; it remains a tracked follow-up rather than an unreported green security claim.

## 2026-05-09 Operations Report And Retry Hardening
- The new `retry with new idempotency key` path stays explicit and bounded: same-key retries still require operator confirmation, while new-key retries mint a fresh bounded idempotency key and keep the failed receipt visible instead of collapsing evidence.
- Verification Center timestamp/header copy and docs-check commit evidence are derived from local verification receipts only; they expose command timing and commit metadata, not raw logs, secrets, or filesystem paths.
- Delivery-target health, incident timelines, escalation playbooks, and missing-scope copy all reuse sanitized report/view data, so the new morning-briefing surfaces do not widen browser access to Gateway credentials or unsanitized receipt content.

## 2026-05-10 Verification Receipt Publishing Hardening
- Verification receipt recording is CLI-to-local-SQLite only; no browser route was added that could spoof verification evidence.
- The runner records only command label, timing, pass/fail/unknown status, short summary, and commit metadata, while stdout/stderr logs stay outside the persisted receipt JSON.
- Passing commands fail closed if their receipt cannot be written, and failing commands still record failed receipts when the local database is available.
- Collapsed rail closeout remains presentation-only: icon-strip controls focus or reveal existing surfaces and do not add Gateway scopes, delivery authority, admin controls, or secret access.
- The Verification Center proof used read-only API routes over local persisted receipts; failed visual receipts from the debugging pass remained visible in the ledger instead of being hidden by later passing receipts.

## 2026-05-10 Gap-Closure Campaign Hardening
- Verification receipt age/freshness fields are derived from persisted local timestamps only; the new Verification Center row copy does not expose raw logs, filesystem paths, or browser-computed success claims.
- Delivery-target health trends, readiness history splits, retention-impact summaries, and saved-view hypotheses are all assembled from bounded local report data, so the richer backlog surfaces do not widen browser access to Gateway or secret-bearing state.
- The new keyboard shortcut strip and rail shortcuts are presentation helpers only; they focus or reveal existing bounded surfaces and do not add hidden control paths or bypass blocked-action checks.
- The native cutover artifact is documentation-only prep in this tranche and explicitly preserves the current Fastify authority boundary for report assembly, incident actions, retention, and delivery policy.

## 2026-05-15 Roadmap Security Baseline
- The tracked high-severity npm audit finding was remediated through the package lock only; `npm audit --json` is expected to report zero vulnerabilities before closeout, and no runtime dependency shortcut or ignored advisory was added.
- Verification trust chips and stale-age badges are read-only summaries of persisted local verification receipts. They do not create a browser endpoint for writing receipts or claiming command success.
- `why blocked` drawers expose operator-facing blocker reasons from capability gates, Gateway readiness, integrity state, missing configuration, and failed dry-run receipts without exposing Gateway tokens, device identity, auth headers, raw frames, delivery secrets, or unsafe local paths.
- Copy actions for receipts, missing scopes, bundle digests, dry-run details, and saved-view exports reuse the browser redaction helper and now guard token query strings in addition to existing secret, raw-frame, cookie, and local-path patterns.
- Exportable saved views and delivery contract previews remain bounded local artifacts with explicit redaction metadata. They are designed for escalation handoff, not for exporting raw Gateway evidence or secret-bearing configuration.
- Release-readiness gating blocks green claims when required evidence is stale, failed, unknown, or missing; it does not infer success from UI freshness copy alone.

## 2026-05-17 Release 2 Trust Surfaces
- Backfilled OpenClaw evidence is now explicitly labeled at the source and drilldown layers, which reduces the risk of operators mistaking recovered session content for live Gateway-backed evidence.
- The new `Copy why blocked summary` affordances reuse the existing blocker formatter and browser redaction path, so handoff copy stays bounded to operator-safe explanations instead of leaking config, scope negotiation internals, or secret-bearing payload details.
- Dry-run/live delivery contract parity stays metadata-only: operators can compare missing fields, exact field-count match, and schema warnings without exposing delivery secrets or inventing a live-send success path.
- Workstation-local incident-template defaults, stale-summary counters, queue-depth indicators, and collapsed-rail verification copy are presentation/persistence helpers only; none of them grant new Gateway scopes, browser write authority, or direct access to verification receipts.

## 2026-05-24 Backlog Smoke And Readiness Hardening
- `/api/healthz` returns only sanitized backend fingerprint data and public Gateway state; it does not expose Gateway credentials, device signatures, raw frames, or delivery configuration.
- Operations-report reload actions refetch the existing bounded report route and leave unavailable reports visibly unavailable rather than deriving browser-side success.
- Report generation timestamps are read-only payload freshness markers, not verification receipts or green-status claims.
