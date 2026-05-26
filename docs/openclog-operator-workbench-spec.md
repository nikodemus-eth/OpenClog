# OpenClog Operator Workbench Spec

## Source Comparison

Compared against the Google Doc titled `OpenClog` (`1FUJzFAW1TNgT42JWVeA2PClkyEPAgSt-PQYnCDj9B2Q`, re-read on 2026-05-20 at revision `AFwiY18A9XkufsG9rNVFGcddP3qtqhPRVEd8BOCOEh9Dt-LoZtPnlVJf2j6PiegI62j78yjsj9Bf-bOYW95OeYdaixm5ABOVCm60g5Gko6c`). The live doc is updated 2026-05-19 and is the current authority for the operator workbench shape, Fastify authority boundary, and OpenClaw session backfill provenance.

The old source framing was stale in these places, and the current Google Doc now replaces that framing:

- It frames the product as an early OpenClaw-branded journal/logbook with phase-based MVP work; the repo now ships a local operator workbench with a Fastify API, React shell, SQLite evidence store, and Tauri native boundary.
- It lists the original daily-page regions and a small table sketch; the real schema and API now include summary jobs, incident actions, delivery receipts, verification receipts, operations reports, replay workspaces, backend fingerprints, and investigation workspaces.
- It treats search, filters, summaries, keyboard recovery, delivery verification, and operations evidence as later polish; those are current workbench behavior.
- It does not describe the current collapsed left/right rails, Verification Center, dry-run delivery governance, summary-job polling, operation report aliases, or incident command loop.
- It keeps the theme catalog as the primary growth vector; the repo now treats themes as decorative presentation over a denser incident and operations workflow.

## Current Product Shape

OpenClog is a local-first operator workbench for redacted operational evidence. The browser never talks to Gateway credentials directly. The backend owns Gateway state, local persistence, redaction, audit evidence, delivery receipts, verification receipts, and compatibility routes.

Readiness has two backend surfaces: `/api/health` for richer public diagnostics and `/api/healthz` for cheap smoke/readiness probes. Both surfaces expose sanitized backend and Gateway state only.

The shell is a dense operator surface:

- Left rail: operator console, journal search, recent logs, date jump, theme picker, and system shortcuts.
- Center lane: day header, summary freshness, composer, timeline, incident workspace, and operator workbench panels.
- Right rail: diagnostics, Gateway readiness, today-at-a-glance, pinned context, filters, approvals, tools, and operations evidence.
- Collapsed rails: both rails collapse to 66px icon strips with distinct icons and expand/focus the requested hidden surface.

## Incident Loop

Every incident is organized as:

1. Detect: identify affected days, entries, sessions, and evidence.
2. Explain: classify the likely cause from bounded local evidence.
3. Recommend: generate local recommendations from summary freshness, receipts, rules, and readiness state.
4. Act: run bounded backend actions such as summary refresh, note capture, dry-run delivery verification, delivery retry, packet copy, and closeout planning.
5. Record: persist incident action records, delivery receipts, investigation notes, handoff packets, and verification evidence.

Missing evidence fails closed. The UI shows blocked, warning, or unavailable states instead of inventing success.

## Summary Jobs

Generated summaries are asynchronous local jobs:

- `POST /api/days/:dayKey/summary-jobs` creates a job.
- `GET /api/summary-jobs/:id` is polled until `completed` or `failed`.
- The workbench keeps queued/running/completed/failed state visible.
- Completed jobs update generated summary freshness and last successful completion time.
- Failed or timed-out jobs leave stale summary state visible.

## Delivery Verification

Slack, generic webhook, email, and GitHub issue handoffs use backend-owned delivery contracts. Operators can run dry-run verification before live delivery.

Dry-run receipts show target, status, delivery reference, idempotency key, request fingerprint, correlation id, and failure reason where present. Missing configuration and dead-letter states remain visible and retryable. Same-key retries require explicit confirmation; new-key retries mint bounded new idempotency evidence.

## Operations Backlog And Verification Center

`/api/operations/report` is the canonical local operations report. `/api/operations/center` remains a compatibility alias.

The report includes:

- Summary-job history and timings.
- Incident evidence checklist and investigation bundle preview.
- Readiness history and route budgets.
- Delivery ledger and delivery-target health, including 24-hour trend summaries.
- Incident timeline and guided incident-command stages.
- Verification Center gates, readiness score, and latest command receipts with age/freshness metadata.
- A `Needs attention now` rollup for stale summaries, approval backlog, repeated receipt failures, reconnect events, route-budget breaches, and failed dry-run deliveries.
- Readiness aggregates over short and seven-day windows, route-budget regression records, closeout readiness scores, and verification receipt diffs that compare failing command receipts with the next passing run.
- Exportable saved-view payloads with redaction metadata and inline evidence counts so local handoff artifacts stay bounded.
- Incident templates for missing scopes, reconnect storms, delivery dead letters, stale summaries, and route-budget regressions.
- Delivery contract previews for Slack, email, webhook, and GitHub issue targets, including dry-run/live payload parity and idempotency checks.
- A release-readiness gate that blocks green claims when required verification evidence is stale or failed.
- Governed SDK manifests, role-aware simulations, evidence quality scores, causality graph, native truth monitor, policy packs, escalation playbooks, retention impact, saved-view hypotheses, and a native cutover prep artifact.

Real verification commands publish local `VerificationReceipt` rows into `journal_verification_receipts`. The API reads those receipts through `/api/verification/receipts`, and the operations report uses them to populate Verification Center timestamps, docs-check commit evidence, Gateway readiness, desktop self-check, and operations ledger entries.

Verification Center gates now include explicit `fresh`, `aging`, `stale`, or `unknown` stale-age badges, operator-facing blocker reasons, and next-safe-action copy. The collapsed rail and shell header can summarize the latest successful local verify bundle without granting browser-side authority to write verification receipts.

The browser shell also persists the selected center-lane tab and incident panel state per day key in local storage, exposes keyboard jumps for search, incidents, Verification Center, rails, and the next failed Verification Center gate, and keeps blocked delivery/plugin/incident actions explainable through one-click `why blocked` drawers sourced from the operations report and capability gates. Verification Center and Operations backlog panels show report generation timestamps, and empty report states offer local reload/integrity actions without inventing report evidence.

Release 2 also adds explicit trust and triage affordances to those existing lanes:

- Recovered OpenClaw session entries and session drilldowns show `Backfilled from OpenClaw` provenance plus import timestamp when the evidence came from local session recovery rather than the live Gateway flow.
- Provenance search also indexes `sourceLabel`, `importedAt`, and backfill provenance text so the built-in `"Backfilled from OpenClaw"` view can find recovered evidence through the same `/api/search` path as other operator queries.
- `/api/operations/report` includes `recoveredEvidenceSummary` when local OpenClaw backfill evidence is present, and the browser shows that server-authored entry count, recovered day count, and latest import timestamp in the page header and Operations backlog panel.
- The shell header can jump directly to the first blocked Verification Center gate using report-authored `firstBlockedGateId`.
- The collapsed diagnostics rail can summarize the latest successful local verify bundle age/freshness even while the full rail is closed.
- Day/archive rows can flag route-budget regressions, and saved operator views can show stale-summary counts separately from newer-evidence warnings.
- Delivery contract previews include dry-run/live payload parity, and blocked incident or verification actions can expose copyable plain-text blocker summaries for handoff.

The current mega-tranche follow-through expands those same trust surfaces instead of shifting authority:

- `Needs attention now` now has a delta summary against the prior 24 hours so morning review can distinguish “still bad” from “getting worse.”
- Verification Center gates now carry report-authored `last verified`, blocker source, `aging soon`, lineage-group, and copyable blocker-summary metadata in addition to the existing freshness badges.
- Saved operator views now expose persistence and hygiene metadata: selected verification gate, restart persistence, lint findings, and handoff-safe summary text.
- Delivery-target health now includes retry-history/backoff posture, parity-drift state, trend points, and a drilldown surface that stays bounded to local evidence.
- The operations report now includes route-budget burn ranking, verification receipt lineage, closeout packet preview, morning brief copy, retention-impact simulation, and a bounded causality narrative.

The current one-pass operations campaign deepens those same seams again without moving authority:

- Report freshness is now explicit and compares the current `/api/operations/report` snapshot against the newest persisted verification receipt, including `test:smoke`.
- Persisted report snapshots now support report diffing and provenance: the report can cite its current snapshot id, previous snapshot id, source verification receipt ids, source summary-job ids, and source delivery receipt ids.
- Saved-view hygiene is now first-class report evidence through persisted audit events, while recovered-evidence drift is tracked explicitly rather than being inferred from stale copy.
- The shell header now exposes report freshness, summary queue depth, latest smoke success, and recovered-evidence provisional state without adding browser mutation authority.
- Keyboard recovery now includes recovered-evidence and morning-command jumps, and blocked Verification Center gates expose a direct `Copy next safe action` affordance.
- A fixture-backed local load harness at [`scripts/load-report-routes.ts`](/Users/m4/OpenClog/scripts/load-report-routes.ts) can rehearse or live-check route budgets for `/api/operations/report`, `/api/verification/receipts`, and session drilldowns.

SQLite has prep tables for readiness snapshots, incident templates, settings history, signed bundle manifests, and native runner history. These tables support the roadmap's durable-local direction, but Fastify remains the current authority for Gateway readiness, receipts, operations reporting, incident actions, retention, delivery policy, and verification read paths until a native cutover proof replaces it.

Native cutover remains truthful prep in the current repo state. The artifact at [`docs/openclog-native-cutover.md`](/Users/m4/OpenClog/docs/openclog-native-cutover.md) defines the intended desktop-boundary move without changing current Fastify authority for operator policy.

## Verification And Safety

OpenClog remains local and fail-closed:

- Gateway tokens, device identity, auth headers, raw frames, and delivery secrets stay backend-only.
- Browser surfaces render sanitized view models and redacted copy.
- Verification receipt publishing is CLI/local SQLite behavior, not a browser write endpoint.
- Remote operations remain disabled by default, and secret access remains fail-closed.
- Verification closeout uses typecheck, lint, unit coverage, integration/API tests, Playwright interaction tests, visual snapshots, red-team tests, desktop-native verification, Gateway verification, docs check, and full `npm run verify`.
