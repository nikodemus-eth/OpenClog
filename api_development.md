# API Development Log

## Purpose
Track public API contracts and Gateway RPC usage.

## 2026-05-02 Bootstrap Intent
- Public API: `/api/health`, `/api/days`, `/api/days/:dayKey`, `/api/stream`, `/api/composer`, `/api/approvals`, `/api/approvals/:id/resolve`, `/api/sessions/:key/abort`, `/api/days/:dayKey/export`, and `/api/settings`.
- Gateway RPC methods must use dotted names such as `sessions.create`, `sessions.send`, `sessions.abort`, and `exec.approval.resolve`.

## 2026-05-02 MVP Closeout
- Implemented public API routes: `GET /api/health`, `GET /api/days`, `GET /api/days/:dayKey`, `GET /api/stream`, `POST /api/composer`, `GET /api/approvals`, `POST /api/approvals/:id/resolve`, `POST /api/sessions/:key/abort`, `GET /api/days/:dayKey/export`, and `GET/PUT /api/settings`.
- Composer `/note` writes locally; ask/command flows use `sessions.create` and `sessions.send`; abort uses `sessions.abort`; approval resolution uses `exec.approval.resolve`.
- Added `check:forbidden-rpc` so `sessions_create`, `sessions_send`, `sessions_abort`, and `exec_approval_resolve` fail deterministic verification if introduced.
- `verify:gateway` probes `connect.challenge`, sends `connect`, evaluates `hello-ok.auth.role` and `hello-ok.auth.scopes`, subscribes with `sessions.subscribe` and `sessions.messages.subscribe`, and fails closed when negotiation is unavailable.

## 2026-05-02 Local Gateway Token Follow-Up
- The live adapter reads the local token from environment, token file, or the machine-local OpenClaw config path. It never sends the token to the browser.
- Reconnect probing now uses `health`, `system-presence`, `exec.approval.list`, `sessions.list`, `sessions.subscribe`, and `sessions.messages.subscribe`.
- `npm run verify:gateway` passed live after token injection, negotiating only `operator.read`, `operator.write`, and `operator.approvals`.

## 2026-05-02 Live Flow Follow-Up
- `POST /api/composer` now creates a session, subscribes to that session's message stream, sends exactly one message, and returns the created session key plus a waiting notice.
- `GET /api/stream` now keeps browser SSE clients open and publishes `journal` events when OpenClaw session messages, tool events, approval events, or sequence gaps are journaled.
- Gateway event ingestion filters out noisy health/tick traffic and journals only user-visible operational events.
- Live correction: `sessions.create` is called without a reused label because the installed Gateway enforces label uniqueness.
- `verify:gateway` mutation mode was aligned with the same flow: `sessions.create`, `sessions.messages.subscribe`, `sessions.send`, and `sessions.abort` only when explicitly enabled.

## 2026-05-02 Five-Theme UI Refinement
- API and Gateway contracts were intentionally unchanged for this UI addendum.
- Public UI fixtures and route expectations now use OpenClog/OpenClog Journal product copy while preserving OpenClaw Gateway wording for integration/status messages.
- Theme IDs exposed to the browser now use canonical frontend IDs from `packages/core`; aliases remain resolver-only compatibility inputs.

## 2026-05-02 Interaction Refinement
- `GET/PUT /api/settings` now includes `showToolCalls` for display-only tool-call filtering and preserves existing public Gateway state behavior.
- Added `GET /api/sessions?dayKey=YYYY-MM-DD`, returning sanitized `AgentActivity[]` from live `sessions.list` when Gateway control is ready, with selected-day journal fallback.
- `GET /api/approvals` now normalizes public approval view models: `id`, `title`, `command`, `status`, `requestedAt`, and `sessionKey`.
- Approval submit sends `exec.approval.resolve` only for approve/disapprove selections, mapping approve to `allow-once` and disapprove to `deny`; defer sends no API call.

## 2026-05-02 Theme Families Expansion
- No public API routes, Gateway RPC method names, permissions, composer behavior, approval behavior, persistence behavior, or delivery behavior were changed for the theme family expansion.
- Theme metadata exposed to the browser remains UI presentation data only.
- Public UI fixtures and tests were expanded to cover all selectable themes without adding any browser path to Gateway credentials or raw frames.

## 2026-05-03 Stabilization And Refactor
- No public API routes, Gateway RPC method names, permissions, composer forwarding, approval resolution semantics, persistence semantics, or delivery behavior were changed.
- Product-copy cleanup is applied at display/export boundaries and does not mutate preserved source journal data.
- Timeline grouping is a frontend/core display projection over existing `JournalEntry` data; it does not alter repository persistence or Gateway subscriptions.
- Pending approvals actionability remains within the existing approval view model and resolution flow; zero-count visibility remains intact.
- Live Gateway verification failed closed with `device identity required`; deterministic API/UI fixtures remain separate from live Gateway claims.

## 2026-05-03 Stitch Operator Shell Integration
- No public API routes, Gateway RPC method names, scopes, permissions, composer forwarding semantics, approval resolution semantics, persistence semantics, or delivery behavior were changed.
- Top navigation maps only to existing frontend focus/toggle behavior: main journal, composer, diagnostics, timeline, theme selector, tool-call switch, and shortcuts help.
- The Pending approvals popover keeps the existing approve=`allow-once`, disapprove=`deny`, and defer=no API call behavior.
- Fixture and visual-test routes remain deterministic and separate from live Gateway verification.
- `npm run verify:gateway` failed closed with `device identity required`; no live API/Gateway success was claimed.

## 2026-05-03 Stitch Fidelity Correction
- No API route, Gateway RPC method, scope, permission, composer forwarding, approval resolution, persistence, or delivery behavior changed.
- The corrected shell navigation still maps only to safe frontend focus/toggle actions.
- Pending approval review remains on the existing public approval view model and existing `exec.approval.resolve` backend path for approve/disapprove choices.
- Deterministic tests use fixtures only and do not imply live Gateway success.

## 2026-05-03 Gateway Device Auth And Shell Shortcuts
- Added API-internal helpers for reading `OPENCLAW_DEVICE_IDENTITY_FILE` or `~/.openclaw/identity/device.json`, validating identity material, deriving raw public keys, signing Gateway challenge payloads, and redacting auth/device diagnostics.
- `createLiveGateway` now waits for `connect.challenge`, attaches a signed device object to the dotted `connect` request, validates `hello-ok`, then runs the existing subscribe/reconcile plan.
- `scripts/verify-gateway.ts` now distinguishes unavailable Gateway, token mismatch, missing device identity, pairing-required, and missing-scope failures.
- Frontend shortcut changes did not add routes or change composer, approval, settings, export, day, stream, or session API semantics.

## 2026-05-03 Theme Intent Realignment And Contrast Pass
- No API routes, Gateway RPC method names, scopes, permissions, composer forwarding, approval semantics, persistence semantics, or delivery behavior changed.
- Practical theme grouping and interaction emphasis are frontend/core presentation metadata only.
- Theme switching remains a browser presentation action and does not mutate composer text, selected day, Gateway readiness, approvals, tools, agents, timeline entries, persisted settings beyond the selected theme, or local journal data.
- Deterministic verification still keeps fixture-driven UI checks separate from live Gateway verification.

## 2026-05-03 Durable Gateway Connection
- No public route names, Gateway RPC method names, requested scopes, composer forwarding semantics, approval decisions, persistence schema, or delivery behavior changed.
- `/api/health.gateway` now includes safe reconnect metadata: connection status, last connection/disconnection timestamps, last error reason, next reconnect time, reconnect attempt, and service-recovery summary.
- Gateway control requests still use dotted method names and fail closed while the backend is reconnecting or missing required negotiated scopes.
- The backend re-runs `health`, `system-presence`, `exec.approval.list`, `sessions.list`, `sessions.subscribe`, and `sessions.messages.subscribe` after successful reconnect.

## 2026-05-04 Phase 1 Quick Wins Hardening
- `/api/health.gateway` now also exposes `lastSuccessfulSyncAt`, sourced from the backend Gateway runtime state rather than inferred in the browser.
- Existing advanced-operator routes remained the Phase 1 authority path: pinned context, generated summaries, retention preview, incidents, alerts, adapter events, integrations, and bundle export were exercised and tightened through tests instead of redefined.
- The web surface continues to consume explicit view-model metadata for freshness, staleness, retention totals, and profile safety classification; no browser path was added to Gateway credentials or raw Gateway events.
- No new public route names, Gateway RPC method names, or scope requests were introduced in this tranche.

## 2026-05-04 Phase 2 Domain And Lifecycle Tranche
- `GET /api/search` now supports `limit` and `cursor`, returning `results` plus `nextCursor` from the shared application layer.
- `GET /api/sessions/:key` now supports paginated drilldown through `limit` and `cursor`.
- Added retention lifecycle routes: `POST /api/retention/apply` and `POST /api/retention/rollback/:id`.
- Added alert lifecycle routes: `POST /api/alerts/:id/ack` and `POST /api/alerts/:id/snooze`, while `GET /api/alerts` now layers stored operator state onto evaluated findings.
- Expanded integration targets to include `slack` and `generic-webhook`, and added `POST /api/replay-bundles/inspect` for replayable exported evidence inspection.

## 2026-05-04 Full Improvement Tranche Closeout
- Day list/detail responses may now include optional `evidenceCompleteness` and `incidentIds` fields; clients should treat them as additive operator metadata.
- Replay-bundle diff responses now include `changeClass` with `unchanged`, `narrative_only`, `metadata_only`, or `evidence_shape` so reviewers can triage bundle changes without re-parsing every manifest field.
- The new copy controls are UI affordances over existing route examples; they do not add Gateway RPC methods, requested scopes, delivery transports, or browser-side credential paths.
- Search presets remain settings/view-model data and cap at eight merged defaults plus operator entries, avoiding API drift for saved investigation shortcuts.

## 2026-05-05 Workbench Execution Lanes
- No new backend routes were introduced for this tranche; the web client now wraps and uses the existing `POST /api/retention/apply`, `POST /api/retention/rollback/:id`, `POST /api/alerts/:id/ack`, and `POST /api/alerts/:id/snooze` contracts.
- Retention apply sends the same bounded local retention policy used by preview, records the returned snapshot id and preview impact, and refetches the day index after apply or rollback.
- Alert lifecycle actions remain local operator state layered onto `GET /api/alerts`; the UI refetches from the API after acknowledgement or snooze rather than treating the button click as authoritative.
- Replay and correlation remain read-only local evidence endpoints through `GET /api/replay/:incidentId` and `GET /api/correlation/:incidentId`; endpoint failures produce browser-visible fail-closed copy, not fabricated counts.

## 2026-05-09 Process Swarm Compatibility Closeout
- Process Swarm continues to announce OpenClog heartbeats through `POST /api/investigation-notes`.
- No public API route, Gateway RPC method, scope request, composer behavior, approval behavior, persistence contract, or delivery behavior changed.
- The compatibility work was limited to dependency lockfile reconciliation and workspace verification fixes needed to keep the existing API runnable from the local path.
