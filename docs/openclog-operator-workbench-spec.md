# OpenClog Operator Workbench Spec

## Source Comparison

Compared against the Google Doc titled `OpenClog` (`1FUJzFAW1TNgT42JWVeA2PClkyEPAgSt-PQYnCDj9B2Q`, read on 2026-05-10 at revision `AFwiY1__snKxFeCsRggcmcohBUWe9b70CNZFoaYlX1FHH1Ip8cf0kgvXOaEDDdgL_Ac9WF7G-a2JVzCHU-SGMi5VhzdJ-HN3--BJZkoUhvs`).

That source doc is now stale in these places:

- It frames the product as an early OpenClaw-branded journal/logbook with phase-based MVP work; the repo now ships a local operator workbench with a Fastify API, React shell, SQLite evidence store, and Tauri native boundary.
- It lists the original daily-page regions and a small table sketch; the real schema and API now include summary jobs, incident actions, delivery receipts, verification receipts, operations reports, replay workspaces, backend fingerprints, and investigation workspaces.
- It treats search, filters, summaries, keyboard recovery, delivery verification, and operations evidence as later polish; those are current workbench behavior.
- It does not describe the current collapsed left/right rails, Verification Center, dry-run delivery governance, summary-job polling, operation report aliases, or incident command loop.
- It keeps the theme catalog as the primary growth vector; the repo now treats themes as decorative presentation over a denser incident and operations workflow.

## Current Product Shape

OpenClog is a local-first operator workbench for redacted operational evidence. The browser never talks to Gateway credentials directly. The backend owns Gateway state, local persistence, redaction, audit evidence, delivery receipts, verification receipts, and compatibility routes.

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
- Governed SDK manifests, role-aware simulations, evidence quality scores, causality graph, native truth monitor, policy packs, escalation playbooks, retention impact, saved-view hypotheses, and a native cutover prep artifact.

Real verification commands publish local `VerificationReceipt` rows into `journal_verification_receipts`. The API reads those receipts through `/api/verification/receipts`, and the operations report uses them to populate Verification Center timestamps, docs-check commit evidence, Gateway readiness, desktop self-check, and operations ledger entries.

Native cutover remains truthful prep in the current repo state. The artifact at [`docs/openclog-native-cutover.md`](/Users/m4/OpenClog/docs/openclog-native-cutover.md) defines the intended desktop-boundary move without changing current Fastify authority for operator policy.

## Verification And Safety

OpenClog remains local and fail-closed:

- Gateway tokens, device identity, auth headers, raw frames, and delivery secrets stay backend-only.
- Browser surfaces render sanitized view models and redacted copy.
- Verification receipt publishing is CLI/local SQLite behavior, not a browser write endpoint.
- Remote operations remain disabled by default, and secret access remains fail-closed.
- Verification closeout uses typecheck, lint, unit coverage, integration/API tests, Playwright interaction tests, visual snapshots, red-team tests, desktop-native verification, Gateway verification, docs check, and full `npm run verify`.
