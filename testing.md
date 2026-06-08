# Testing Log

## Purpose
Record deterministic verification, live Gateway verification, coverage policy, and closeout results.

## 2026-06-08 Final Coverage And All-Tests Closeout
- First all-up `npm run verify` correctly failed at the coverage gate after the startup-backfill tranche: 21 Vitest files / 225 tests passed, but coverage was 99.29 percent statements, 98.43 percent branches, 100 percent functions, and 99.49 percent lines.
- Added focused regression coverage for scheduler disabled/no-op/error branches, bounded empty session windows, and bulk-write error handling, then refactored throwable-message handling out of duplicated catch branches.
- `npm run test:coverage` passed with 21 files / 232 tests and 100 percent statements, branches, functions, and lines.
- Final `npm run verify` passed: forbidden-RPC, typecheck, lint, workspace builds, 100 percent coverage, 210 Playwright E2E/UI tests, 54 visual snapshots, 8 red-team tests, and docs check.
- `npm run verify:desktop-native` passed after rebuilding the web bundle and running 3 Tauri tests.
- `npm run test:smoke` passed with 60 Vitest smoke tests, 1 Chromium smoke test, and desktop cargo smoke.
- `npm run verify:gateway` passed with Gateway status `ready`, negotiated role `operator`, scopes `operator.admin`, `operator.read`, and `operator.write`, and mutation testing disabled.
- Post-commit API rebuild/restart aligned the live listener with final commit `f6d3cef`; `/api/version` reports PID `33268` and runtime fingerprint `6a72172c2df794c23c2bfc2392bb037e3c6e689f39904e1866db23f7d4c3f435`.
- Latest live `npm run test:load -- --base-url http://127.0.0.1:8787 --day-key 2026-06-06` passed with `breachCount: 0`: `/api/operations/report` 396 ms / 750 ms, `/api/verification/receipts` 3 ms / 200 ms, and `/api/sessions/:key` 2 ms / 300 ms.

## 2026-06-08 Default Startup And Live Route-Budget Proof
- Added failing-first coverage for the two hot paths: startup backfill must be scheduled after listener bind, and session drilldown must filter session/approval rows in SQL before parsing unrelated entries.
- Focused regression proof passed with `npx vitest run apps/api/test/openclaw-session-backfill.test.ts apps/api/test/repository.test.ts apps/api/test/routes.test.ts`: 3 files / 66 tests. `npm run typecheck` and `npm run build -w @openclog/api` also passed.
- Cleared `OPENCLOG_OPENCLAW_SESSION_BACKFILL` from the launchd environment and restarted `com.m4.openclog-api`; `/api/version` bound in 729 ms and returned commit `05fa238`, PID `98679`, build timestamp `2026-06-08T10:58:19.319Z`, and runtime fingerprint `84b2ece13dc6062251447943a4754a04d14236819453b7d61f4a8a65cf4e4826`.
- The restarted LaunchAgent no longer inherited `OPENCLOG_OPENCLAW_SESSION_BACKFILL=0`; `launchctl print gui/$(id -u)/com.m4.openclog-api` showed only `SSH_AUTH_SOCK` in inherited environment.
- The default scheduled startup backfill is bounded to 10 files / 10 messages unless env limits override it; stderr showed `OpenClog OpenClaw session backfill: imported 10 message(s) from 8 file(s) through 2026-06-08T10:32:28.358Z`.
- Live `curl -m 10 -sS -w ... http://127.0.0.1:8787/api/healthz` returned in `TIME_TOTAL=0.263489` from the same PID/fingerprint.
- Live `npm run test:load -- --base-url http://127.0.0.1:8787 --day-key 2026-06-06` passed with `breachCount: 0`: `/api/operations/report` 249 ms / 750 ms, `/api/verification/receipts` 3 ms / 200 ms, and `/api/sessions/:key` 2 ms / 300 ms.
- Remaining proof limits: no fresh desktop-host self-check row, mutation-enabled Gateway verification, browser-written verification receipt proof, or live-send delivery success is claimed in this pass.

## 2026-06-06 Current-Source Live Runtime Proof
- Focused rebuild passed for the runtime packages: `npm run build -w @openclog/core`, `npm run build -w @openclog/app`, and `npm run build -w @openclog/api`.
- After final post-proof restart, `http://127.0.0.1:8787/api/version` reported commit `05fa238`, PID `90222`, build timestamp `2026-06-06T19:35:03.247Z`, and runtime fingerprint `5599ca09712b9833b9e3eb59a2167648162d4161d8962acdee35891ef0336bfa`.
- Live `npm run test:load -- --base-url http://127.0.0.1:8787 --day-key 2026-06-06` failed truthfully with `breachCount: 1` on the same rebuilt source before the final post-proof restart: `/api/operations/report` was HTTP 200 but 14454 ms / 750 ms, `/api/verification/receipts` was HTTP 200 at 3 ms / 200 ms, and `/api/sessions/:key` was HTTP 200 at 172 ms / 300 ms.
- `npm run verify:desktop-native` passed with receipt `verification-npm-run-verify-desktop-native-20260606T192846262Z`: the web bundle rebuilt and all 3 Tauri tests passed.
- The latest native-runner self-check row in `journal_native_runner_history` remains `desktop-self-check:http___127_0_0_1_8787:2026_05_31T03_07_26_520Z`, so no fresh desktop-host self-check row is claimed for the June 6 listener.

## 2026-06-03 Trust-Surface Reverification And Dirty-Tranche Closeout
- Rebased the trust-surface tranche against local `HEAD` `05fa238` plus the dirty worktree instead of the older `2d37c7f` live-runtime proof.
- Added/tightened failing-first coverage for attention-item acknowledge/snooze persistence and route-budget percentile truthfulness. Route rows no longer emit percentile labels without persisted route-history observations.
- Focused proof passed with `npx vitest run packages/app/test/application.test.ts apps/api/test/routes.test.ts apps/web/test/api-summary-jobs.test.ts apps/web/test/operator-workspace.test.ts`: 4 files / 79 tests.
- `npm run typecheck` passed for the active TypeScript surface.
- `npm run test:load` passed in fixture mode with `breachCount: 0`; it persisted route-budget rows for `/api/operations/report` at 148 ms / 750 ms and `/api/verification/receipts` at 112 ms / 200 ms at `2026-06-03T12:35:31.258Z`.
- `npm run test:visual` passed after refreshing the intentional 54 snapshot baselines for the global healthz and saved-view shell changes.
- `npm run test:smoke` passed with 60 Vitest tests, the Chromium operations-report empty-state check, and desktop cargo smoke.
- `npm run verify:desktop-native` passed with the rebuilt web bundle and 3 Tauri tests.
- `npm run verify:gateway` passed with Gateway status ready, read/subscribe probes green, and mutation testing disabled.
- Final all-up `npm run verify` passed with receipt `verification-npm-run-verify-20260603T125558606Z` at `2026-06-03T12:55:58.606Z` on commit `05fa238`: forbidden-RPC checks, typecheck, lint, workspace builds, 21 Vitest files / 218 tests, 100 percent measured coverage, 210 Playwright E2E tests, 54 visual snapshots, 8 red-team tests, and docs check.
- Stale proof boundary at the time: `http://127.0.0.1:8787/api/version` still reported commit `2d37c7f`, PID `53455`, and build timestamp `2026-05-31T03:06:08.801Z`, so the May 30/31 live 8787 proof was historical and not current-head proof for that dirty tranche. The June 6 proof above supersedes the listener identity but records a current live load breach.

## 2026-06-01 Trust-Surface Visibility Tranche Closeout
- Implemented the Phase 1 trust-surface slice for operations visibility and operator polish: enriched `/api/healthz`, added `/api/healthz/details`, surfaced report snapshot provenance in the shell, carried delivery `lastDryRunVerifiedAt`, rendered recovered-evidence badges in archive/search flows, added morning-brief copy with citations, and recorded major keyboard shortcuts through the local audit path.
- Refactored the new shell/report affordances behind focused workspace helpers so verification-gate targeting, recovered-evidence badge formatting, snapshot provenance summaries, and morning-brief copy stay deterministic and directly unit tested.
- Coverage stayed at 100 percent statements, branches, functions, and lines after adding unit/API/UI coverage for the new helpers and contracts.
- Fresh deterministic closeout passed with `npm run verify`: forbidden-RPC checks, typecheck, lint, workspace builds, 21 Vitest files / 213 tests, 210 Playwright E2E/UI tests, 54 Playwright visual snapshots, 8 red-team tests, and docs check.
- Additional explicit gates passed after the tranche landed: `npm run test:smoke`, `npm run verify:desktop-native`, and `npm run verify:gateway` with `status: ready` and mutation testing disabled.
- Visual baselines were intentionally refreshed for all 54 snapshots because the new provenance/header metadata changed the expected desktop and mobile layouts.

## 2026-06-01 Current-HEAD Verification Refresh
- Re-read the live Google Doc `OpenClog` (`1FUJzFAW1TNgT42JWVeA2PClkyEPAgSt-PQYnCDj9B2Q`) and refreshed repo-local proof logs from the May 30/31 closeout state at local `main` commit `2d37c7f`.
- The first fresh `npm run verify` run failed in `tests/e2e/theme-accessibility.spec.ts` because the timeline focus-retention effect could reclaim focus from the Gateway diagnostics card after an entry had been opened.
- Refactor verification passed with `npx playwright test tests/e2e/theme-accessibility.spec.ts --project=chromium --grep "keyboard and accessibility affordances work"`.
- Final `npm run verify` passed with forbidden-RPC checks, typecheck, lint, workspace builds, 21 Vitest files / 207 tests, 100 percent measured statements/branches/functions/lines, 210 Playwright UI tests, 54 visual snapshots, 8 red-team tests, and docs check.
- Additional explicit closeout gates passed: `npm run docs:check`, `npm run test:smoke`, `npm run verify:gateway` with `status: ready` and mutation testing disabled, and `npm run verify:desktop-native` with 3 native cargo tests.

## 2026-05-30/31 Saved-View, Native, And Live Load Closeout
- Added failing-first coverage for saved-view deletion audits and bounded operations-report payloads, then passed `npx vitest run packages/app/test/application.test.ts -t "records saved-view deletion|bounds operations-report"`.
- Added desktop coverage proving the default scheduled self-check API base is `http://127.0.0.1:8787`, then passed `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml scheduled_self_check_reports_fail_closed_surfaces -- --nocapture`.
- Focused checks passed after the refactor: `npm run typecheck`, `npx vitest run apps/api/test/repository.test.ts apps/api/test/routes.test.ts packages/app/test/application.test.ts`, `npx vitest run apps/api/test/routes.test.ts packages/app/test/application.test.ts`, and `npm run build`.
- Live proof against real `8787` passed for this historical `2d37c7f` runtime with `OPENCLOG_LOAD_BASE_URL=http://127.0.0.1:8787 npm run test:load -- --day-key 2026-05-25 --session-key agent:hugin:main`: `/api/operations/report` 647 ms / 750 ms, `/api/verification/receipts` 2 ms / 200 ms, `/api/sessions/:key` 51 ms / 300 ms, breachCount 0.
- Real desktop-host evidence was refreshed by launching the Tauri host with `OPENCLOG_API_URL=http://127.0.0.1:8787`, `OPENCLOG_SQLITE_PATH=/Users/m4/OpenClog/openclog.db`, and `OPENCLOG_DESKTOP_SELF_CHECK_INTERVAL_MS=0`; the latest native-runner row is `desktop-self-check:http___127_0_0_1_8787:2026_05_31T03_07_26_520Z`, and `http://127.0.0.1:8787/api/version` reported commit `2d37c7f`.

## 2026-05-27 Current-HEAD Native And Live Load Proof
- Added regression coverage so report freshness only treats `verify` / `npm run verify` as a full verify bundle; focused receipts such as `npm run verify:gateway` no longer hide an older full-verify receipt from `latestSuccessfulVerifyPredatesHead`.
- Added API coverage proving the load harness can hit a real local Fastify base URL, persist `source: "live"` route-budget rows for `/api/operations/report` and `/api/verification/receipts`, and keep live trend baselines separate from fixture rehearsal rows.
- Expanded desktop-native tests so scheduled self-check persistence proves the stored native-runner JSON shape, and SQLite persistence failure returns a blocked self-check with a failed `native_runner_history` item.
- Focused checks passed: `npx vitest run apps/api/test/repository.test.ts apps/api/test/routes.test.ts packages/app/test/application.test.ts`, `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml scheduled_self_check -- --nocapture`, `npm run verify:desktop-native`, and `npm run typecheck`.
- Live load proof against current-HEAD Fastify on `http://127.0.0.1:8797` persisted live rows into `/Users/m4/OpenClog/openclog.db`. `/api/verification/receipts` stayed green at 2 ms; `/api/operations/report` failed closed twice at 1895 ms and 1872 ms against a 250 ms harness budget, so the live route-budget proof is real but not green.

## 2026-05-26 Native Runner Evidence Cutover Prep
- Added failing-first coverage for native-runner persistence, operations-report ledger promotion, Native Truth Monitor readback, desktop self-check SQLite persistence, and receipt recording through a transient SQLite lock.
- Focused verification passed during implementation with `npx vitest run packages/app/test/application.test.ts apps/api/test/repository.test.ts apps/api/test/advanced-features.test.ts apps/web/test/operator-workspace.test.ts`, `npm run typecheck`, and `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`.
- Final closeout still requires fresh recorded receipts for `npm run verify`, `npm run docs:check`, `npm run test:smoke`, `npm run verify:gateway`, and `npm run verify:desktop-native` against the final local HEAD.

## 2026-05-25 One-Pass Operations Campaign
- Added targeted unit/API coverage for persisted report snapshots, saved-view audit events, evidence-drift observations, enriched `/api/healthz` operations metadata, and the expanded operations-report assembly path.
- Added browser coverage for report freshness copy, persisted report diff/provenance surfaces, saved-view audit visibility, morning-command workflow text, recovered-evidence shortcut focus, and blocked Verification Center `Copy next safe action` affordances.
- Added a fixture-backed load-harness command with `npm run test:load`; it can rehearse route-budget checks offline by default or hit a live local API when `--base-url` or `OPENCLOG_LOAD_BASE_URL` is provided.
- Focused verification completed during this tranche with `npm run typecheck`, `npx vitest run packages/app/test/application.test.ts apps/api/test/repository.test.ts apps/api/test/routes.test.ts`, and `npx playwright test tests/e2e/advanced-features.spec.ts --project=chromium`.

## 2026-05-24 Backlog Smoke And Readiness Closeout
- Added failing-first API coverage for `/api/healthz`, then implemented the sanitized readiness route after the test proved the route returned 404.
- Added Playwright coverage for operations-report generation timestamps and the Verification Center empty-state reload action before wiring the browser UI.
- Added and ran the new root smoke gate: `npm run test:smoke` passed with 48 Vitest tests, 1 focused Chromium smoke test, and desktop `cargo check`.
- Targeted closeout checks passed: `npx vitest run apps/api/test/routes.test.ts -t healthz`, `npx playwright test tests/e2e/advanced-features.spec.ts --project=chromium --grep "operations report empty state|journal quick wins"`, and `npm run typecheck`.
- The first all-up `npm run verify` exposed intentional mobile visual snapshot drift from the new report timestamp copy; the actual OpenClog Journal mobile render was inspected, and all 27 mobile visual baselines were refreshed with `npx playwright test tests/e2e/visual.spec.ts --project=mobile --update-snapshots`.
- Final closeout gates passed with `npm run verify`, `npm run verify:desktop-native`, `npm run verify:gateway`, `npm run test:smoke`, and `git diff --check`.

## 2026-05-20 Mega Tranche Rework
- Added targeted unit/API coverage for the new report-contract surfaces and helper behavior: attention deltas, saved-view persistence metadata, verification receipt lineage, route-budget burn summaries, release-readiness explanations, delivery-target retry/trend metadata, and summary-job dedupe reporting.
- Added operator-helper coverage for the new built-in `Backfilled from OpenClaw` view and filter so provenance-focused triage remains a tested default rather than an ad hoc query.
- Targeted verification passed during implementation with `npm run test -- apps/web/test/operator-workspace.test.ts`, `npm run test -- packages/app/test/application.test.ts apps/api/test/advanced-features.test.ts`, and `npm run typecheck`.
- Full deterministic closeout still requires the complete repo gate after docs/log refresh: `npm run verify`, `npm run verify:gateway`, `npm run verify:desktop-native`, and `git diff --check`.

## 2026-05-20 OpenClaw Session Backfill Closeout
- Added repository coverage proving quoted `"Backfilled from OpenClaw"` searches match provenance fields and import timestamps, not only body/title text.
- Added route-state coverage proving the `backfilled_openclaw` filter survives URL parsing and serialization.
- Added operations-report and browser fixture coverage proving recovered OpenClaw evidence is summarized with entry count, day count, and latest import timestamp in both the report panel and page header.
- Tightened the keyboard accessibility Playwright assertion to wait for the first timeline entry before sending `ArrowDown` through the timeline locator itself after the full gate exposed a parallel-mount/focus race in the old sequence.
- Focused verification passed with `npx vitest run apps/api/test/repository.test.ts apps/web/test/journal-routing.test.ts apps/web/test/operator-workspace.test.ts packages/app/test/application.test.ts`, `npx playwright test tests/e2e/advanced-features.spec.ts -g "journal quick wins"`, `npm run typecheck`, and `git diff --check`.
- Live verification passed against the restarted API on `127.0.0.1:8787`: `/api/search?q="Backfilled from OpenClaw"` returned provenance-hinted results, `/api/days/2026-05-20` returned 69 backfilled entries, `/api/sessions/:key` returned drilldown provenance with import timestamp `2026-05-20T22:30:01.601Z`, and `/api/operations/report?dayKey=2026-05-20` returned recovered-evidence totals of 236 entries across 7 days with latest import `2026-05-23T13:49:44.593Z`.

## 2026-05-18 Quick Wins Trust Tranche
- Added unit/API coverage for the new Quick Wins trust fields and helpers: built-in `Needs operator action now` view, active-incident badge formatting, delivery-target last-verified summaries, verification failed/passing comparison copy, timeline source summaries, and enriched operations-report contracts.
- `npm run test:workbench` passed after the tranche changes.
- `npm run typecheck` and `npm run lint` passed after the tranche changes.
- `npm run test:coverage` passed with repo-wide 100% statements, 100% branches, 100% functions, and 100% lines.
- Refined `npm run verify:desktop-native` so it builds the web bundle before running the Tauri cargo tests; the verifier no longer depends on a pre-existing `apps/web/dist/index.html`.

## 2026-05-02 Bootstrap Intent
- `npm run verify` is deterministic and offline.
- `npm run verify:gateway` is environment-dependent and must report pass or fail-closed.
- 100% coverage is mandatory for `packages/core`, redaction, normalization, repositories, exports, theme tokens, backend handlers, and UI state.
- Allowed coverage exclusions: generated files, environment/bootstrap entrypoints, unreachable defensive branches covered at a higher layer, and third-party adapter shims.

## Coverage Exclusions
- Generated files and outputs: `apps/web/dist/**`, `apps/web/dist-types/**`, `coverage/**`, `playwright-report/**`, `output/playwright/**`, and `**/*.d.ts`.
- Environment/bootstrap entrypoints: `apps/api/src/server.ts` only starts Fastify from environment config; `apps/web/src/main.tsx` only mounts React.
- External Gateway adapter shim: `apps/api/src/live-gateway.ts` is excluded from unit coverage because it is exercised by `npm run verify:gateway` against the real WebSocket Gateway.
- No unreachable defensive branch exclusions are currently used.
- No other third-party adapter shim exclusions are currently used.

## 2026-05-02 MVP Closeout
- `npm run verify` passed after the refactor. It ran deterministic offline checks: forbidden RPC guard, typecheck, lint, build, 100% unit coverage, Playwright e2e with fixtures, visual snapshots, red-team fixtures, and log checks.
- Unit coverage result: 100% statements, 100% branches, 100% functions, and 100% lines for the configured core, repository, backend handler, schema, and UI-state targets.
- Playwright e2e passed on desktop Chromium and mobile Pixel 7 profiles.
- Playwright visual snapshots passed for the original four MVP themes on desktop and mobile.
- `npm run verify:gateway` failed closed with `device identity required`; no live Gateway session, approval, message, or tool activity was fabricated.

## 2026-05-02 Local Gateway Token Follow-Up
- `npm run verify` passed after the live Gateway adapter and protocol correction.
- `npm run verify:gateway` passed live with the local OpenClaw token.
- Live probe result: negotiated role `operator`, scopes `operator.read`, `operator.write`, and `operator.approvals`, with no missing scopes.
- Mutation testing remained disabled, so no create/send/abort test session was fabricated or performed.

## 2026-05-02 Live Flow Follow-Up
- Added failing-first tests for session-message event ingestion, stream publishing, composer subscribe-before-send behavior, and Gateway message deduplication.
- `npm run verify` passed after the event-flow changes, including 100% statements, branches, functions, and lines.
- Live browser smoke passed against `http://127.0.0.1:5173/`; it showed Gateway ready and visible `pong` content from the real OpenClaw response.
- Live screenshot evidence: `output/playwright/live-openclog-pong.png`.
- `npm run verify:gateway` passed live after the event-flow fix; mutation testing remained disabled, so the live probe did not fabricate create/send/abort activity.

## 2026-05-02 Five-Theme UI Refinement
- Added unit coverage for all five canonical theme IDs, aliases, required labels, status tokens, safety surfaces, accessibility flags, and Accessibility contrast sanity.
- Added Playwright coverage for all five themes across ready/degraded Gateway states, Agent Activity, Recent Tools, Pending approvals, visible status text, no token-like values, and theme-switching no-op behavior.
- Added keyboard/accessibility coverage for skip link, scoped `/`, `?` help disclosure, Escape behavior, theme selector reachability, timeline roving focus, diagnostics focus, visible focus outlines, Accessibility target sizing, and axe checks.
- Added desktop and mobile visual snapshots for all five canonical themes.
- `npm run verify:gateway` passed live when run with the machine-local OpenClaw token; mutation testing remained disabled, so no create/send/abort session was fabricated.

## 2026-05-02 Interaction Refinement
- Added API coverage for `showToolCalls` settings persistence, sanitized `GET /api/sessions`, journal-derived Agent Activity fallback, sanitized approvals, and `exec.approval.resolve` decisions.
- Added Playwright coverage for Blackbeard no-overlap at the screenshot-like viewport, `Show Tool Calls` persistence, theme-switching no-op behavior, Agent Activity statuses, approvals popover actions, archive day selection, 10-second live toasts, and toast-to-entry navigation.
- Refreshed visual snapshots for all five themes on desktop and mobile after the interaction/layout changes.
- Restored unit coverage to 100% statements, 100% branches, 100% functions, and 100% lines after adding the API edge-case tests.
- `npm run verify` passed after the interaction changes.
- `npm run verify:gateway` failed closed with `device identity required`; no live Gateway session, approval, message, or tool activity was claimed from that run.

## 2026-05-02 Theme Families Expansion
- Added unit coverage for all 27 theme IDs, labels, aliases, family values, density values, typography values, status tokens, accessibility profiles, motion profiles, and the local asset registry.
- Added browser-visible event preview tests for secret-like value redaction, raw Gateway-looking payload suppression, and local path summarization.
- Expanded Playwright theme coverage so every selectable theme renders Gateway state, Agent Activity, Recent Tools, Pending approvals, visible status chips, and degraded/blocked warnings.
- Expanded visual coverage to desktop and mobile snapshots for every selectable theme.
- Accessibility variants receive direct coverage for keyboard reachability, focus visibility, contrast/token sanity, and practical hit target sizing.
- Final `npm run verify` passed before commit: forbidden RPC guard, typecheck, lint, build, unit coverage, Playwright e2e, Playwright visual, red-team fixtures, and docs check.
- Unit coverage remained 100% statements, 100% branches, 100% functions, and 100% lines for the configured coverage targets.
- Final Playwright e2e coverage passed 156 tests, visual coverage passed 54 snapshots, and red-team coverage passed 2 tests.
- Final `npm run verify:gateway` failed closed with `device identity required`; the live integration was not marked green.

## 2026-05-03 Stabilization And Refactor
- Added unit coverage for theme lifecycle, use-case, timeline layout mode, diagnostics density, product-copy normalization, browser-visible redaction reasons, long previews, grouped/raw timeline construction, group labels, stable ordering, and group membership.
- Added E2E coverage for product-copy cleanup, grouped timeline expansion, raw timeline redaction, toast navigation into grouped entries, Pending approvals actionability, Dyslexia Friendly layout pressure, keyboard behavior, mobile, and 200 percent zoom.
- Updated red-team tests for expanded browser-visible secret handling, including disclosure-expanded text.
- Refreshed desktop and mobile visual snapshots for every selectable theme after representative inspection confirmed diagnostics and status chips remained visible.
- `npm run verify` passed after implementation and snapshot refresh: forbidden RPC guard, typecheck, lint, build, 100% unit coverage, Playwright e2e, Playwright visual, red-team fixtures, and docs check.
- Unit coverage is 100% statements, 100% branches, 100% functions, and 100% lines for the configured coverage targets.
- Focused post-refactor Playwright checks passed for grouped timeline expansion, target-entry focus, raw/grouped redaction, and keyboard affordances.
- `npm run verify:gateway` failed closed with `device identity required`; live integration was not marked green.

## 2026-05-03 Stitch Operator Shell Integration
- Added Playwright coverage for the native Stitch-inspired shell: visible top app bar, safe Journal/Command/Network/Logs focus controls, settings/tool/help utilities, local operator avatar, and approved rail proportions.
- Added browser/source asset-safety checks so generated Stitch dependencies such as Tailwind CDN scripts, Google fonts, Material Symbols, remote profile images, and external asset URLs are not imported.
- Refreshed desktop and mobile visual snapshots for all 27 selectable themes after inspecting representative Stitch references and confirming diagnostics and status chips remain visible.
- `npm run verify` passed after implementation and refactor: forbidden RPC guard, typecheck, lint, build, 100% unit coverage, Playwright E2E, Playwright visual, red-team fixtures, and docs check.
- Unit coverage remained 100% statements, 100% branches, 100% functions, and 100% lines for the configured coverage targets.
- Playwright E2E passed 170 tests and visual coverage passed 54 snapshots after the Stitch shell refresh.
- `npm run verify:gateway` failed closed with `device identity required`; live integration was not marked green.

## 2026-05-03 Stitch Fidelity Correction
- Added a Playwright fidelity regression for the Stitch shell vocabulary: flat 56px header, uppercase nav, large composer shell, 800px content measure, Blackbeard light/dark rail split, and Captain dark chrome.
- Refreshed all 54 desktop/mobile visual snapshots after direct `view_image` comparison against representative Stitch references.
- Fixed and retested the mobile Pending approvals popover so approve/disapprove/defer controls remain reachable.
- `npm run verify` passed after the correction with 100% configured unit coverage, 172 Playwright E2E/UI tests, 54 visual snapshots, 4 red-team tests, and docs check.
- Final `npm run verify` passed on the logged tree with 100% configured unit coverage, 172 Playwright E2E/UI tests, 54 visual snapshots, 4 red-team tests, and docs check.
- `npm run verify:gateway` failed closed with `device identity required`; live integration was not marked green.

## 2026-05-03 Gateway Device Auth And Shell Shortcuts
- Added unit coverage for device identity validation, public-key derivation, exact v3 payload construction, Ed25519 signature verification, redaction, and Gateway failure classification.
- Added live-Gateway mock coverage proving connect includes a signed `device` object when identity exists, fails closed without identity, never requests forbidden scopes, preserves dotted RPC method names, and redacts auth calls.
- Added Playwright UI coverage for family shortcut selection, Network/Monitors/Security diagnostics focus, and settings/filter utility action announcements.
- Refreshed visual snapshots for the intentional family shortcut chrome change after representative screenshot inspection.
- Focused checks passed for the new shell interactions; final full verification is tracked in this tranche closeout.
- A final live probe initially failed closed with a Gateway challenge timeout; after the approved `openclaw gateway restart` recovery step, the live verifier passed.
- Live `npm run verify:gateway` passed after the device-auth fix; mutation testing remained disabled, so no create/send/abort test session was fabricated.

## 2026-05-03 Theme Intent Realignment And Contrast Pass
- Extended unit coverage for all 27 theme IDs so each exposes practical group, generic inspiration, design intent, interaction emphasis, lifecycle, use-case, timeline layout, diagnostics density, accessibility profile, motion profile, labels, status tokens, and aliases.
- Added contrast assertions for page/card text, shell text, side rail text, muted labels, focus-adjacent surfaces, and status chips across light, dark, sidebar-heavy, and non-accessibility themes.
- Added same-group differentiation checks so themes in a practical group cannot collapse to identical typography, card, timeline, diagnostics, palette, and emphasis signatures.
- Updated Playwright interaction coverage for practical group shortcut selection and Stitch vocabulary token expectations.
- Refreshed all 54 visual snapshots for the 27 selectable themes on desktop and mobile after representative visual inspection.
- `npm run verify` passed on the final logged tree: forbidden RPC guard, typecheck, lint, build, 100% configured unit coverage, 176 E2E/UI tests, 54 visual snapshots, 4 red-team tests, and docs check.
- `npm run verify:gateway` passed live after the device-auth work; mutation testing remained disabled, so no create/send/abort test session was fabricated.
- Stale-copy scan found no stale historical product-title references outside preserved `Instructions.md`.
- Asset safety scan found only documentation guard wording and the red-team forbidden-pattern assertion; no shipped external Stitch/Tailwind/font/image/script asset was introduced.
- Browser-visible secret scan found only redaction code and test fixtures; no UI source path intentionally exposes tokens, auth headers, cookies, OAuth values, SMTP credentials, env assignments, raw Gateway payloads, or unsafe local paths.

## 2026-05-03 Durable Gateway Connection
- Added failing-first live Gateway tests for stale socket reconnect, token/device re-read on reconnect, subscription replay, request fail-closed behavior while reconnecting, guarded service restart, and non-restart for non-recoverable auth failures.
- Added API health tests for safe reconnect metadata and service-recovery summaries without credential leakage.
- Added Playwright coverage for visible reconnecting state and service-recovery status on desktop and mobile.
- Coverage returned to 100% statements, branches, functions, and lines after adding public-health branch coverage.
- The first full `npm run verify` after implementation passed with 85 unit tests, 178 E2E/UI tests, 54 visual snapshots, and 4 red-team tests.

## 2026-05-04 Phase 1 Quick Wins Hardening
- Added focused unit coverage for the new operator-workspace helper module: pinned-summary validation, generated-summary staleness, Gateway URL safety classification, reconnect trend text, retention preview formatting, and empty-state copy.
- Extended API coverage for `lastSuccessfulSyncAt` so reconnect/recovery health metadata stays backend-authored and visible to the browser.
- Expanded repository coverage around drilldown reconnect counts, search, integration payload fallback, integrity checks, settings persistence, and advanced-operator data paths.
- Added browser coverage for Phase 1 operator flows: URL-persisted search, clear-filters, reconnect trend text, last-successful-sync display, retention preview totals, bundle JSON copy action, profile safety display, pinned-summary validation, and empty states for search/incidents/alerts/adapters.
- Refreshed all 54 Playwright visual snapshots after the intentional diagnostics/profile/timeline copy changes.
- Final verification passed on the Phase 1 tree with `npm run verify`.
- Coverage remains 100 percent statements, branches, functions, and lines for the configured measured surface.
- Current explicit exclusions remain limited to bootstrap-heavy paths: `main.ts`, `server.ts`, `app.ts`, `live-gateway.ts`, `repository.ts`, fixture servers, generated output, and declaration files. These exclusions must be revisited in later tranches rather than silently expanded.

## 2026-05-04 Phase 2 Domain And Lifecycle Tranche
- Added direct application-layer unit coverage in [`/Users/m4/OpenClog/packages/app/test/application.test.ts`](/Users/m4/OpenClog/packages/app/test/application.test.ts) for paginated search/drilldown, retention snapshot apply/rollback, and alert acknowledgement/snooze behavior.
- Expanded API coverage for the new domain-backed routes: paginated `/api/search`, paginated `/api/sessions/:key`, `/api/retention/apply`, `/api/retention/rollback/:id`, alert ack/snooze endpoints, expanded integration targets, and replay bundle inspection.
- Reran repository coverage after adding retention snapshot and alert state tables; the only full-gate regression was canonical table ordering, which was fixed and verified.
- Fresh full verification passed after this tranche: `npm run verify` completed with typecheck, lint, build, 100 percent measured coverage, 184 E2E/UI tests, 54 visual snapshots, 4 red-team tests, and docs check.

## 2026-05-04 Ladder 1 Investigation Acceleration Slice
- Added targeted unit/API coverage for search match metadata, repo-derived health history, session-summary export text, generated-summary freshness detail, bundle-manifest formatting, and Gateway error-category classification.
- Added Playwright coverage for saved search presets, search match snippets, session-summary copy, bundle preview, inline empty-state actions, degraded-category visibility, and global keyboard search focus on both desktop Chromium and mobile.
- Verification for this slice:
  - `npx vitest run packages/app/test/application.test.ts apps/api/test/advanced-features.test.ts apps/web/test/operator-workspace.test.ts`
  - `npx playwright test tests/e2e/advanced-features.spec.ts`

## 2026-05-04 Ladder 2 Incident Workspace Slice
- Extended application-layer unit coverage to include investigation-note creation, incident workspace composition, replay-bundle diffing, and closeout-plan generation.
- Expanded API coverage for the new routes: `/api/investigation-notes`, `/api/incidents/:id/workspace`, `/api/replay-bundles/diff`, and `/api/closeout/plan`.
- Extended Playwright operator-flow coverage for incident workspace selection, note capture, bundle diff visibility, and closeout-plan rendering; mobile visual baselines were refreshed after the new workbench panels increased page height.
- Full verification passed after this tranche with `npm run verify`.

## 2026-05-04 Full Improvement Tranche Closeout
- Added focused unit/API/UI coverage for default search presets, evidence completeness, local investigation-note confirmation, API example copy controls, non-typing-blocking keyboard chords, and replay-bundle change classification.
- Updated all 54 Playwright visual snapshots after the intentional archive-row and workbench affordance changes.
- Final `npm run verify` passed with forbidden-RPC checks, typecheck, lint, workspace builds, 18 coverage test files, 134 unit/API tests, 100 percent measured statements/branches/functions/lines, 192 E2E/UI tests, 54 visual snapshots, 4 red-team tests, and docs check.
- `npm run verify:gateway` passed live with `status: ready`; mutation testing remained disabled, so no live test session traffic was fabricated.
- `npm run smoke -w @openclog/desktop` and `git diff --check` both passed during closeout.

## 2026-05-05 Incident Command Loop Closeout
- Added unit coverage for the refactored `packages/app` seams: versioned settings normalization, incident-loop assembly, bounded recommendation logic, richer receipt metadata, and explicit incident action execution.
- Expanded browser/API coverage to the new operator flow: saved operator views, incident-loop headings and actions, backend-mediated note recording, richer receipt rendering, and the updated search/session observability microcopy.
- Refreshed all 54 Playwright visual snapshots after the incident-workspace layout pivot changed panel height and command-surface copy across both desktop and mobile themes.
- Final verification completed:
  - `npm run verify`
  - `npm run verify:gateway`
  - `npm run smoke -w @openclog/desktop`
  - `git diff --check`
- Coverage remains fully closed on measured code after the refactor: 100% statements, branches, functions, and lines in `npm run test:coverage`.

## 2026-05-05 Full Campaign Closeout
- Added focused coverage for the new modular application seams and operator workspace helpers, including named operator views, drilldown persistence helpers, idempotent receipt reuse, dry-run plugin metadata, summary-job contracts, replay-workspace creation, signed bundle verification, and desktop contract exposure.
- Refreshed all 54 visual snapshots after the expanded operator surfaces introduced summary-job state, retention evidence-loss warnings, health/SLO panels, replay workspace status, rule-pack visibility, and runbook summaries across desktop and mobile themes.
- Final acceptance commands passed on the closeout tree:
  - `npm run test:changed`
  - `npm run test:coverage`
  - `npm run lint`
  - `npm run build`
  - `npm run test:e2e`
  - `npm run test:visual`
  - `npm run test:redteam`
  - `npm run verify:desktop-native`
  - `npm run verify:gateway`
  - `npm run docs:check`
  - `npm run verify`
  - `npm run smoke -w @openclog/desktop`
  - `git diff --check`
- Coverage remains 100 percent statements, branches, functions, and lines in `npm run test:coverage`, and the live Gateway probe ended `ready` with `operator`, `operator.read`, `operator.write`, and negotiated `operator.admin` satisfying control-action readiness.

## 2026-05-05 Workbench Execution Lanes
- Added operator-workspace unit coverage for retention snapshot impact formatting, preview-gated removable-state detection, active/acknowledged/snoozed alert copy, expired/invalid snooze handling, fixed 30-minute snooze calculation, replay-step display, correlation node/edge display, and browser-safe copy redaction.
- Expanded Playwright fixture state and browser coverage for preview -> apply -> rollback retention execution, per-finding alert acknowledge/snooze controls, visible replay/correlation evidence rows, entry jump controls, empty-state unavailable copy, and fail-closed replay/correlation endpoint failures on desktop and mobile.
- Extended red-team coverage so retention, replay, and correlation workbench copy does not expose token-like values, raw Gateway frame text, cookies, or unsafe local paths.
- Refreshed the 27 mobile visual snapshots after the intentional workbench height/content increase; desktop visual baselines remained stable.
- Focused verification before the full gate passed:
  - `npm run test:changed`
  - `npx playwright test tests/e2e/advanced-features.spec.ts`
  - `npm run test:redteam`
  - `npm run test:coverage`
- Coverage remains 100 percent statements, branches, functions, and lines for the configured measured surface; no coverage exclusions were broadened.

## 2026-05-06 Thirty-Item Roadmap
- Added failing-first unit/API/UI/red-team coverage for backend fingerprints, stale runtime rejection, summary freshness fields, saved triage views, receipt retry idempotency, dry-run adapter verification, closeout blocking, verification receipts, multi-day investigation workspaces, remote-ops fail-closed policy, receipt detail redaction, and plugin/secret boundary copy.
- Expanded Playwright coverage for the visible operator workflows: backend mismatch banner, header PID/commit/build/boot metadata, scope negotiation have/missing panel, built-in stale/receipt/scope views, loop progress chips, receipt retry and copy buttons, bundle digest copy, generated-summary `lastEntryIncludedAt`/`latestEntryObservedAt`, decorative theme label, causality graph, and verification receipts.
- Focused verification passed during implementation:
  - `npx vitest run packages/app/test/application.test.ts apps/api/test/advanced-features.test.ts apps/web/test/operator-workspace.test.ts tests/redteam/redteam.test.ts`
  - `npx playwright test tests/e2e/advanced-features.spec.ts --project=chromium --grep "backend mismatch|journal quick wins"`
- `cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml` could not run because `rustfmt` is not installed for the local stable Apple Silicon toolchain; Rust formatting was kept manual and cargo verification is tracked in closeout commands.

## 2026-05-07 Operator Surface Follow-Through
- Added focused helper/API coverage for backend-mismatch built-in view selection, per-view diagnostics persistence keys, live pinned-summary character budgets, summary-job empty-state copy, composer connectivity labels, and endpoint-budget audit recording.
- Expanded Playwright coverage for the visible quick-win operator flow: incident-packet digest copy, built-in backend-mismatch view labeling, header health-poll telemetry, live character-budget text, and inline receipt retry counts.
- Focused verification passed on the implementation tree:
  - `npm run test -- apps/web/test/operator-workspace.test.ts apps/api/test/advanced-features.test.ts tests/redteam/redteam.test.ts`
  - `npm run typecheck`
  - `npm run docs:check`
  - `npx playwright test tests/e2e/advanced-features.spec.ts --project=chromium`
- Current visual snapshot count remains 54 visual snapshots total, including 27 mobile visual snapshots.

## 2026-05-08 Routing, Summary Polling, and Delivery Verification
- Added failing-first coverage for route normalization, summary-job polling to terminal state, summary-job fail-closed timeout behavior, dry-run integration verification requests, summary-job state copy, last successful summary completion, and dry-run verification receipt formatting.
- Expanded Playwright coverage for the rendered operator workbench: blocked-command scope explanation, summary refresh polling through completion, header last-summary-completion metadata, and Slack dry-run verification receipt details beside delivery actions.
- Focused verification passed during implementation:
  - `npm run test -- apps/web/test/journal-routing.test.ts apps/web/test/api-summary-jobs.test.ts apps/web/test/operator-workspace.test.ts apps/api/test/advanced-features.test.ts`
  - `npm run typecheck`
  - `npx playwright test tests/e2e/advanced-features.spec.ts tests/e2e/openclog.spec.ts --project=chromium`

## 2026-05-08 Closeout Coverage And UI Refactor
- Closed the remaining `operator-workspace.ts` measured-coverage gaps with focused unit cases for optional built-in view session state, saved-view misses and provenance, diagnostics default storage, no-progress summary jobs, completion timestamp fallback, and optional dry-run receipt fields.
- `npm run test:coverage` now reports 100 percent statements, branches, functions, and lines for the configured measured surface: 20 Vitest files, 153 tests, 671/671 statements, 632/632 branches, 183/183 functions, and 534/534 lines.
- Reproduced and fixed the full-gate UI regressions from `npm run verify`: health polling overwrote summary completion notices, replay/correlation fail-closed checks raced incident selection under parallel load, composer detail wrapped in the icon grid column, and mobile utility metadata intercepted the brand/home button.
- Refreshed all 54 Playwright visual snapshots after the intentional composer-grid and mobile-header geometry fixes.
- Focused rerun after fixes passed:
  - `npx playwright test tests/e2e/interaction-refinements.spec.ts:133 tests/e2e/advanced-features.spec.ts:4 tests/e2e/advanced-features.spec.ts:271 tests/e2e/interaction-refinements.spec.ts:491 --project=chromium --project=mobile`
- Final closeout gate remains `npm run verify`, followed by `npm run verify:gateway`, `npm run verify:desktop-native`, `npm run smoke -w @openclog/desktop`, and `git diff --check` before local-main commit and GitHub push.

## 2026-05-08 Operations Backlog Master Plan
- Added failing-first shared app/API/helper coverage for operations reports, summary-job durations, evidence checklists, Verification Center gates, delivery ledger filtering and confirmation, SDK manifests, simulations, policy packs, native truth monitor, retry confirmation, stale-summary warning, correlation badges, dry-run jump links, and per-view timeline preferences.
- Expanded Playwright coverage for the operator-visible backlog: persistent backend recovery, `Only unresolved incidents`, Verification Center, operations backlog panel, same-key retry confirmation, copyable correlation ids, inline missing-scope labels, stale-summary warnings, and failed dry-run target jumps.
- Focused verification passed during implementation:
  - `npm run test -- packages/app/test/application.test.ts apps/web/test/operator-workspace.test.ts apps/api/test/advanced-features.test.ts apps/web/test/api-summary-jobs.test.ts`
  - `npm run typecheck`
  - `npx playwright test tests/e2e/advanced-features.spec.ts --project=chromium`
- `npm run test:coverage` passed with 20 Vitest files, 161 tests, and 100 percent measured statements, branches, functions, and lines: 728/728 statements, 696/696 branches, 201/201 functions, and 576/576 lines.

## 2026-05-17 Release 2 Trust Surfaces
- Added focused coverage for OpenClaw backfill provenance, invalid timezone/default-home fallbacks, env-driven importer limits, skipped-message defensive branches, saved-view stale-summary formatting, verification trust-summary fallbacks, summary-job queue metrics, first-blocked-gate selection, and delivery dry-run/live parity summaries.
- Introduced `npm run test:workbench` as the fast iteration lane for the most frequently changed shared app/API/web workbench suites.
- Refreshed all 54 desktop/mobile Playwright visual snapshots after the new header actions, provenance badges, queue metrics, stale-summary counters, and collapsed-rail verification summary changed the intended operator layout.
- Final verification on this tranche passed with:
  - `npm run test:coverage` at 100 percent statements, branches, functions, and lines
  - `npm run verify`
  - `npm run verify:gateway`
  - `npm run verify:desktop-native`
  - `git diff --check`
- The first full `npm run verify` exposed intentional visual snapshot drift from the new operations panels; the actual desktop and mobile screenshots were inspected, all 54 visual baselines were refreshed, and the rerun passed with 206 E2E tests, 54 visual snapshots, 7 red-team tests, and docs check.
- Final closeout commands passed:
  - `npm run verify`
  - `npm run verify:gateway` with `status: ready`, no missing scopes, and mutation testing disabled
  - `npm run verify:desktop-native`
  - `npm run smoke -w @openclog/desktop`

## 2026-05-09 Process Swarm Compatibility Closeout
- `npm ci` completed and reconciled `package-lock.json` with the current workspace manifests; npm reported one high-severity audit finding that was not changed in this tranche.
- Final `npm run verify` passed after the lockfile, build-order, alias, and visual-tolerance fixes.
- The full gate passed typecheck, lint, ordered build, 20 Vitest files / 161 tests with 100% statements, branches, functions, and lines, 206 Playwright E2E tests, 54 visual snapshot tests, 7 red-team tests, and docs checks.
- `/api/investigation-notes` remains the Process Swarm announcement target; verification did not expose a route/runtime mismatch requiring API code changes.

## 2026-05-09 Operations Report Follow-Through
- Added failing-first helper/app/API coverage for stale-summary interval copy, device-aware diagnostics storage keys, retry-with-new-idempotency-key messaging, richer Verification Center timestamps, delivery-target health, incident timelines, guided incident-command stages, escalation playbooks, and `/api/operations/report` alias compatibility.
- Expanded Playwright coverage for the combined operator flow so the browser now asserts the new Verification Center header fields, the new-key retry button, and the expanded operations backlog surfaces while keeping the existing quick-win and fail-closed workbench checks intact.
- Verification completed on this implementation slice:
  - `npm run test -- apps/web/test/operator-workspace.test.ts packages/app/test/application.test.ts apps/api/test/advanced-features.test.ts`
  - `npm run typecheck`
  - `npx playwright test tests/e2e/advanced-features.spec.ts --project=chromium`

## 2026-05-10 Verification Receipt Publishing
- Added failing-first repository/API coverage for explicit `saveVerificationReceipt` persistence and Verification Center docs-check evidence from stored receipts.
- Added runner coverage for passing, failing, signaled, failed-start, non-git, and empty-git command paths, proving command status is persisted and failure evidence remains visible.
- The receipt runner now wraps `npm run verify`, `npm run verify:gateway`, `npm run verify:desktop-native`, `npm run test:visual`, and `npm run docs:check`; the raw command variants remain available for internal script composition.
- Focused verification passed on the final implementation tree:
  - `npm run test -- packages/app/test/application.test.ts apps/api/test/repository.test.ts apps/api/test/advanced-features.test.ts apps/web/test/operator-workspace.test.ts apps/web/test/api-summary-jobs.test.ts tests/redteam/redteam.test.ts` with 6 files / 62 tests.
  - `npm run typecheck`
  - `npm run lint`
  - `npx playwright test tests/e2e/interaction-refinements.spec.ts` with 56 tests.
  - `npm run test:visual` with 54 snapshots after adding a fixture-readiness wait for verification receipts.
- Full closeout verification passed:
  - `npm run test:coverage` with 20 files / 166 tests and 100 percent statements, branches, functions, and lines.
  - `npm run test:e2e` with 208 Playwright tests.
  - `npm run test:redteam` with 7 tests.
  - `npm run verify:desktop-native` with 2 native cargo tests.
  - `npm run verify:gateway` with `status: ready`, no missing scopes, and mutation testing disabled.
  - `npm run docs:check`
  - `npm run verify`
- Receipt publication proof passed against the local SQLite database: `/api/verification/receipts` returned HTTP 200 with at least 10 real receipts, and `/api/operations/report` populated Verification Center timestamps, docs-check commit evidence, Gateway/native gates, and operations-ledger verification entries from those receipts.

## 2026-05-10 Gap-Closure Campaign
- Added failing-first helper/app/API coverage for verification receipt age/freshness formatting, summary-job day totals, enriched operations-report fields, native cutover prep metadata, and richer `/api/verification/receipts` output.
- The focused red/green loop for this tranche used:
  - `npm test -- apps/web/test/operator-workspace.test.ts`
  - `npm test -- packages/app/test/application.test.ts`
  - `npm test -- apps/api/test/advanced-features.test.ts`
- Full closeout verification for this tranche is required through the repo gate: `npm run verify`, `npm run verify:gateway`, `npm run verify:desktop-native`, `npm run smoke -w @openclog/desktop`, and `git diff --check` before commit and push.

## 2026-05-15 Full Operations Roadmap
- Added failing-first unit/API/UI/red-team coverage for stale-age Verification Center gates, attention-now rollups, blocker derivation, closeout readiness scoring, route-budget regression classification, export redaction, incident-loop persistence, delivery contract previews, verification receipt diffs, release-readiness gating, and durable-local migration tables.
- Expanded Playwright coverage for the visible roadmap flow: `Needs attention now`, Verification Center freshness badges, blocked-action drawers, closeout readiness, readiness aggregates, exportable saved views, route-budget regressions, incident templates, delivery contract previews, and release-readiness state.
- Focused verification passed during implementation:
  - `npx vitest run packages/app/test/application.test.ts apps/api/test/advanced-features.test.ts apps/web/test/operator-workspace.test.ts tests/redteam/redteam.test.ts`
  - `npm run typecheck`
  - `npx vitest run packages/app/test/application.test.ts -t "full 30-item operations backlog report"`
  - `npx vitest run apps/api/test/advanced-features.test.ts -t "serves roadmap backend"`
  - `npx vitest run apps/web/test/operator-workspace.test.ts -t "formats attention strips"`
  - `npx vitest run tests/redteam/redteam.test.ts -t "new roadmap export"`
- The full gate initially exposed branch coverage gaps in roadmap copy helpers, fixture-timeout races in expanded advanced endpoints, and intentional visual snapshot drift from the new operations panels. Focused fixes covered the copy branches, bounded the fixtures, and refreshed all 54 visual baselines after inspection.
- Closeout results:
  - `npm audit --json` reported zero vulnerabilities and was recorded as a local verification receipt.
  - `npm run verify` passed with 20 Vitest files / 169 tests, 100 percent statements/branches/functions/lines, 208 E2E tests, 54 visual snapshots, 8 red-team tests, and docs check.
  - `npm run verify:desktop-native` passed with 2 native cargo tests.
  - `npm run docs:check` passed.
  - `git diff --check` passed.
  - `npm run verify:gateway` failed closed with `protocol mismatch`; no live Gateway success was claimed.
