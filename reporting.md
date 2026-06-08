# OpenClog Reporting Seed

## 2026-06-08 Final All-Gates Reporting Proof
- Current runtime-code authority is commit `f6d3cef`, which contains the trust-surface/startup-backfill diff. Later local `main` commits may be proof-log-only updates and should not be confused with the API bundle identity.
- The initial final-gate attempt failed only at coverage after the startup backfill work; the follow-up refactor and tests restored the repo-wide 100 percent statements/branches/functions/lines gate.
- Final deterministic proof passed with `npm run verify`: forbidden-RPC, typecheck, lint, workspace builds, 21 Vitest files / 232 tests at 100 percent coverage, 210 Playwright E2E/UI tests, 54 visual snapshots, 8 red-team tests, and docs check.
- Supplemental proof passed with `npm run verify:desktop-native`, `npm run test:smoke`, and `npm run verify:gateway`.
- After the post-code-commit rebuild/restart, `http://127.0.0.1:8787/api/version` reports commit `f6d3cef`, PID `33268`, build timestamp `2026-06-08T11:18:50.216Z`, and runtime fingerprint `6a72172c2df794c23c2bfc2392bb037e3c6e689f39904e1866db23f7d4c3f435`.
- Latest current live route-budget proof is green on that listener: `/api/operations/report` 396 ms / 750 ms, `/api/verification/receipts` 3 ms / 200 ms, `/api/sessions/:key` 2 ms / 300 ms, `breachCount: 0`.
- Gateway proof is read/subscribe only with mutation testing disabled; live-send delivery success and mutation-enabled Gateway behavior remain outside this closeout.

## 2026-06-08 Default Startup And Current Live Load Proof
- Current live runtime authority is local `HEAD` `05fa238` plus the dirty trust-surface/backfill diff after a focused API rebuild and a default LaunchAgent restart.
- `http://127.0.0.1:8787/api/version` reports commit `05fa238`, PID `98679`, build timestamp `2026-06-08T10:58:19.319Z`, and runtime fingerprint `84b2ece13dc6062251447943a4754a04d14236819453b7d61f4a8a65cf4e4826`.
- The LaunchAgent no longer needs or inherits `OPENCLOG_OPENCLAW_SESSION_BACKFILL=0`. Default startup now binds first, then runs a bounded OpenClaw session recovery pass capped at 10 files / 10 messages unless explicit env limits override it.
- The default startup proof bound `/api/version` in 729 ms; `/api/healthz` returned from the same listener in 0.263489 s after the scheduled backfill window.
- Live route-budget proof is green on the current default-started listener: `npm run test:load -- --base-url http://127.0.0.1:8787 --day-key 2026-06-06` returned `breachCount: 0`; `/api/operations/report` was 249 ms / 750 ms, `/api/verification/receipts` was 3 ms / 200 ms, and `/api/sessions/:key` was 2 ms / 300 ms.
- The earlier 14454 ms operations-report breach and the intermediate 2958 ms 50-message startup trial are retained as historical failure evidence. The current default bound is 10 messages at startup; broader OpenClaw catch-up sweeps should be run intentionally with explicit max-file/max-message env settings.
- Still out of scope: fresh desktop-host self-check evidence, mutation-enabled Gateway proof, browser-written verification receipts, recovered-evidence drift resolution, and live-send delivery success.

## 2026-06-06 Current-Source 8787 Runtime Reverification
- Current live runtime authority is local `main` at `HEAD` `05fa238` plus the dirty trust-surface diff after a focused rebuild of `@openclog/core`, `@openclog/app`, and `@openclog/api`, followed by a restart of `com.m4.openclog-api`.
- `http://127.0.0.1:8787/api/version` now reports commit `05fa238`, PID `90222`, build timestamp `2026-06-06T19:35:03.247Z`, and runtime fingerprint `5599ca09712b9833b9e3eb59a2167648162d4161d8962acdee35891ef0336bfa` after the final post-proof restart. It no longer reports the old `2d37c7f` listener.
- The LaunchAgent proof is current but scoped: the job is running from `/Users/m4/OpenClog/scripts/run-openclog-api.sh` with inherited `OPENCLOG_OPENCLAW_SESSION_BACKFILL=0` for this proof run because the default startup backfill path spent more than two minutes in SQLite work before binding `8787`.
- Live `npm run test:load -- --base-url http://127.0.0.1:8787 --day-key 2026-06-06` is truthful but red on the same rebuilt source before the final post-proof restart: `/api/operations/report` returned HTTP 200 in 14454 ms / 750 ms, `/api/verification/receipts` returned HTTP 200 in 3 ms / 200 ms, `/api/sessions/:key` returned HTTP 200 in 172 ms / 300 ms, and `breachCount` was 1.
- Focused desktop-native command proof is fresh: `npm run verify:desktop-native` passed with receipt `verification-npm-run-verify-desktop-native-20260606T192846262Z` after rebuilding the web bundle and passing 3 Tauri tests. The latest desktop-host native-runner row is still historical May 31 evidence, not a new self-check row from this June 6 runtime.
- Still out of scope: a green current-source live route-budget proof, a fresh desktop-host self-check row from the current dirty build, mutation-enabled Gateway proof, browser-written verification receipts, and live-send delivery success.

## 2026-06-03 Current-HEAD Trust-Surface Reverification
- Current source authority is local `HEAD` `05fa238` plus the dirty trust-surface diff. The verified surfaces are attention-item acknowledge/snooze state, `/api/healthz/details`, healthz shell detail visibility, closeout-blocker copy, the blocked-gates + dry-runs + stale summaries saved view, and route-budget percentile truthfulness.
- Current command receipts are `verification-npm-run-verify-20260603T125558606Z`, `verification-npm-run-docs-check-20260603T125558564Z`, `verification-npm-run-test-visual-20260603T125557280Z`, `verification-npm-run-test-smoke-20260603T124524107Z`, `verification-npm-run-verify-desktop-native-20260603T124532554Z`, and `verification-npm-run-verify-gateway-20260603T124540994Z`, all recorded against commit `05fa238`.
- Fixture load, not live 8787, was the June 3 route-budget proof: `/api/operations/report` ran at 148 ms / 750 ms, `/api/verification/receipts` at 112 ms / 200 ms, `/api/sessions/:key` at 164 ms / 300 ms, and `breachCount` stayed 0.
- `npm run test:visual` is green after refreshing the 54 intentional baseline changes caused by the global healthz/saved-view shell updates.
- At that June 3 check, the live `http://127.0.0.1:8787` runtime still reported commit `2d37c7f`; that stale-listener statement is superseded by the June 6 current-source runtime proof above.

## 2026-05-30/31 Historical 8787 Proof And Rebaselined Live Load
- At the time of that proof, the LaunchAgent `com.m4.openclog-api` ran `/Users/m4/OpenClog/scripts/run-openclog-api.sh` from `/Users/m4/OpenClog`; `http://127.0.0.1:8787/api/version` reported commit `2d37c7f`, PID `53455`, build timestamp `2026-05-31T03:06:08.801Z`, and runtime fingerprint `96c1db842ef7bf6990883b995733c9cc491ca181dbee6d81ebefaea98388977f`.
- The desktop self-check path wrote real root-DB native evidence for that runtime: `desktop-self-check:http___127_0_0_1_8787:2026_05_31T03_07_26_520Z`, status `passed`, observed API base `http://127.0.0.1:8787`, API health responded, public Gateway readiness was ready, LaunchAgent loaded, SQLite path present, and secure store available.
- Saved-view audit reporting is no longer limited to `used`: the root DB now has `created`, `updated`, `deleted`, and `used` evidence rows. Historical uses before the API path existed remain unbackfilled.
- Live `npm run test:load` against `http://127.0.0.1:8787` was green for this historical `2d37c7f` runtime under the rebaselined full-report contract: `/api/operations/report` 647 ms / 750 ms, `/api/verification/receipts` 2 ms / 200 ms, `/api/sessions/:key` 51 ms / 300 ms, breachCount 0. The June 6 current-source listener supersedes this as current runtime proof and currently has a live `/api/operations/report` budget breach.

## 2026-05-27 Superseded Native And Live Load Proof
- Native-runner reporting is now backed by real desktop-host evidence in `journal_native_runner_history`: the current root DB contains receipt `desktop-self-check:http___127_0_0_1_8787:2026_05_26T12_04_47_490Z`, observed API base `http://127.0.0.1:8787`, LaunchAgent loaded, SQLite path present, secure store available, and one persisted history row.
- The May 27 Fastify proof used `http://127.0.0.1:8797` because the existing `8787` listener was a stale `53b761f` runtime. That proof reported commit `4c15cf6`, and is now superseded by the May 30/31 `2d37c7f` proof above.
- Route-budget reporting now distinguishes live from fixture evidence: fixture rehearsals and live API checks both persist source-tagged rows, and the harness computes trend baselines within the same source. The old `8797` proof remains historical failed-closed evidence at 1895 ms then 1872 ms; the historical May 31 `8787` proof was green, while the June 6 current-source `8787` proof is red for `/api/operations/report`.
- Native cutover remains prep-only. Fastify remains report and policy authority, and live-send delivery success, browser-side verification writes, mutation-enabled Gateway proof, and full native authority handoff must not be reported green.

## 2026-05-26 Native Runner Evidence Cutover Prep
- Daily reporting can now cite native-runner evidence separately from command verification receipts: latest desktop self-check receipt id, observed API base, LaunchAgent state, and persisted history count come from `journal_native_runner_history`.
- The Operations Ledger now distinguishes `native_runner` entries from `verification` entries, so desktop-boundary health evidence does not masquerade as a CLI verification receipt.
- Native cutover reporting should still say prep: Fastify remains policy/report authority, and browser receipt writes, browser-visible secrets, Gateway mutation proof, raw playback/import-queue control, broad remote ops, and admin/config editing remain non-complete.

## 2026-05-25 One-Pass Operations Campaign
- Daily reporting can now distinguish three freshness layers explicitly: generated-summary freshness, operations-report freshness relative to the newest verification receipt, and the latest successful `test:smoke` timestamp.
- The operations report now carries persisted diff/provenance evidence, saved-view audit output, evidence-drift summaries, and a guided morning-command workflow so morning handoff copy can stay bounded to stored local evidence.
- Delivery reporting now has a stronger diagnostics shape: retry history, backoff posture, parity drift, latest verified timing, and route-budget coverage for `/api/operations/report` and `/api/verification/receipts`.
- Operators now get explicit provisional labeling when recovered-evidence totals are still influenced by cache rebuild or post-summary imports, which keeps backfill-heavy mornings truthful.

## 2026-05-24 Backlog Smoke And Readiness Follow-Through
- `/api/healthz` is now the cheap readiness probe for smoke checks; `/api/health` remains the richer diagnostic route with full public Gateway state.
- Daily reports can cite `npm run test:smoke` as the short local gate for API route smoke, workbench helpers, an operations-report fallback browser check, and desktop cargo smoke.
- Verification Center and Operations backlog panels now show report generation timestamps, so operators can distinguish stale report payloads from stale underlying receipts or summaries.

## 2026-05-20 Mega Tranche Rework Follow-Through
- The operations report now carries a stronger morning-triage contract: `attention now` deltas, verification receipt lineage, route-budget burn summaries, closeout packet preview, saved-view lint findings, delivery-target drilldowns, morning brief copy, retention-impact simulation, and a bounded causality narrative.
- Summary-job pressure is now more truthful for operators and the local queue: duplicate refresh requests for the same day reuse the existing queued/running job instead of silently spawning a parallel one.
- Verification Center reporting now distinguishes blocker source, last-verified timestamp, `aging soon` state, copyable blocker summaries, and report-authored release-readiness explanations before any green claim.
- Saved-view reporting now treats persistence and hygiene as first-class trust surfaces: restart persistence, selected verification gate, lint findings, and handoff summary text are all explicit operator-facing metadata.
- Delivery reporting now includes retry-history/backoff posture, parity drift signals, trend points, and target-health scoring so a new failure and a chronic failing target read differently in the workbench.

## 2026-05-20 OpenClaw Backfill Reporting Closeout
- The live local backfill imported recovered OpenClaw session evidence from the real session log directory, not fixture data. The first manual run added 113 net-new backfilled entries; the final sweep added 1 more and caught the current window through `2026-05-20T22:23:30.907Z`.
- Reporting can now treat `"Backfilled from OpenClaw"` as a working search and saved-view phrase because repository search indexes provenance labels and import timestamps.
- The operations report now includes a recovered-evidence summary when OpenClaw backfill is material, and the page header repeats the operator-facing count. The live local report currently summarizes 236 backfilled entries across 7 days with latest import `2026-05-23T13:49:44.593Z`; `/api/days/2026-05-20` still shows the grounding case of 69 backfilled entries with latest import `2026-05-20T22:30:01.601Z`.

## 2026-05-18 Quick Wins Trust Tranche
- Quick Wins now have stronger morning-trust surfaces in the shipped product: active-incident loop badge, delivery-target `last verified` evidence, explicit failed-vs-passing verification comparison, route-budget deltas on archive rows, and linked-note counts on incident cards.
- Daily reports should now call out the built-in `Needs operator action now` view and the new keyboard focus paths for blocked actions and failed receipts as current operator-speed features rather than future ideas.
- Verification reporting should distinguish the header trust chip from the new Verification Center comparison row: latest failed receipt and latest passing receipt are now separate, explicit evidence items.

## 2026-05-08 Daily Report Themes

Current backlog lanes:

- Quick Wins: operator retry reduction, summary freshness trust, timeline triage filters, per-view diagnostics persistence, redaction-confirming copy feedback, backend mismatch diagnosis, summary inclusion review, alert provenance, failed-action recovery, and reporting continuity.
- Medium-Term Improvements: summary-job queue visibility, outbound retry/backoff metadata, multi-day incident timelines, Gateway readiness history, shareable operator presets, structured hypotheses, shared policy formatting, redaction-boundary route contracts, load testing, and endpoint budget reporting.
- High-Leverage Bets: guided incident command, verification center, native-host truth, governed escalation playbooks, causality graph, deterministic replay verification, role-aware simulations, evidence quality scoring, governed integration SDKs, and a machine-local operations ledger.

Current implementation lanes:

- Operator shell routing and backend metadata: keep route state canonical, expose plain-language backend mismatch reasons, keep keyboard focus truthful, and avoid hiding stale-runtime state behind generic status labels.
- Generated summaries: create local summary jobs, poll `/api/summary-jobs/:id` until `completed` or `failed`, render queued/running/completed/failed state truthfully, and fail closed on timeouts.
- Delivery governance: verify Slack, generic webhook, and email targets through `/api/integrations/:target/verify` before live handoff, surface dry-run receipt details next to delivery actions, and preserve redaction-aware copy confirmations.

Closeout notes:

- Refactor lane: keep workbench policy branches in `apps/web/src/state/operator-workspace.ts`, preserve React as orchestration/focus glue, and keep shell layout constraints explicit for desktop and mobile.
- Verification lane: close helper branch gaps before full UI runs, then use the repo all-up gate plus Gateway/native/desktop smoke checks before a local-main push.
- Reporting lane: future daily runs should call out summary-job trust, dry-run delivery safety, stale-backend diagnosis, and keyboard-safe shell recovery as the current evidence themes.

## 2026-05-09 Daily Report Follow-Through

- Quick Wins that now have real product seams: exact stale-summary intervals, device-aware diagnostics persistence, retry-with-new-idempotency-key controls, Verification Center timestamp/header evidence, missing-scope copy affordances, and docs-check commit continuity.
- Medium-Term lanes that now have concrete report contracts: `/api/operations/report`, delivery-target health, summary-job history, incident timelines, retry-policy metadata, route-budget visibility, and shared delivery-health rendering inputs.
- High-Leverage lanes now represented in the bounded report/application seam: guided incident command, governed escalation playbooks, native-truth evidence, causality graph support, evidence-quality scoring, governed SDK manifests, and machine-local operations ledger evidence.

## 2026-05-10 Spec And Verification Follow-Through

- The staged spec refresh now treats OpenClog as the current operator workbench rather than an MVP journal prototype.
- Reporting should cite persisted verification receipts as evidence for Verification Center status instead of relying on placeholder defaults.
- Future daily reports should mention collapsed rail health, summary-job polling, dry-run delivery verification, operations backlog evidence, and local verification receipt freshness as current product seams.
- The Google Doc comparison was connector-backed against the Drive document titled `OpenClog`, while the repo-local review artifact now names the stale source areas and the current operator workbench behavior.
- Receipt publication can now be reported from `/api/verification/receipts` and `/api/operations/report`: the latest local run produced real docs-check, visual, verify, Gateway, and desktop-native receipts.

## 2026-05-10 Gap-Closure Campaign Follow-Through

- Verification Center rows can now report receipt age/freshness alongside the existing timestamps, which makes “fresh vs aging vs stale evidence” part of the morning briefing instead of an implicit operator inference.
- `/api/operations/report` now carries richer summary-job day totals, 24-hour delivery-target health trends, backend/Gateway readiness splits, retention-impact output, saved-view hypotheses, and a native cutover prep artifact reference.
- Future daily reports should call out readiness score, receipt-age evidence, active investigation hypotheses, and the native cutover prep status as current product seams rather than backlog-only concepts.

## 2026-05-15 Full Operations Roadmap Follow-Through

- Daily reports should lead with the `Needs attention now` strip when present: stale summaries, approval backlog, repeated receipt failures, reconnect events, route-budget breaches, and failed dry-run deliveries are now first-order morning triage signals.
- Verification status should distinguish the shell-header trust chip, collapsed rail stale-age badges, Verification Center gate freshness, receipt diffs, and release-readiness gate instead of compressing them into a single green/yellow/red claim.
- Incident progress reporting should cite template choice, Detect/Explain/Recommend/Act/Record completion, closeout readiness score, newer-evidence summary warnings, and unresolved evidence counts beside saved operator views.
- Delivery and integration sections should include contract-preview parity, dry-run/live idempotency posture, failed dry-run details, missing-scope copy, and whether saved-view/export payloads were redacted for handoff.
- Native/local infrastructure remains a roadmap lane, not a completed authority move: readiness snapshots, settings history, signed bundle manifests, and native runner history tables exist as durable-local prep while Fastify remains current authority.

## 2026-05-17 Release 2 Follow-Through

- Daily reports should now call out backfill provenance explicitly when recovered OpenClaw sessions influence the operator view: backfilled badge presence and import timestamp are first-order trust cues.
- Verification summary copy should distinguish three surfaces: the shell-header jump to the first blocked gate, the collapsed-rail latest verify age/freshness summary, and the Verification Center gate-level stale/blocked state.
- Saved-view reporting should separate stale-summary counts from newer-evidence warnings so operators can tell “summary needs refresh” apart from “underlying evidence changed.”
- Delivery reporting should include the dry-run/live parity line with exact field-count match, missing-in-dry-run fields, missing-in-live fields, and schema warnings before discussing live send posture.
- Queue-pressure reporting should mention summary-job queue depth and oldest waiting age directly in the center-lane workbench summary when backlog pressure is part of the story.
