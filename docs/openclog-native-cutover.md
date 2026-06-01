# OpenClog Native Cutover Prep

## Status

This artifact is truthful prep with native-runner evidence now active. OpenClog still treats the Fastify API and shared application layer as the current authority for operator policy, verification command receipts, report assembly, and delivery governance.

## Current Native Boundary

- Tauri owns desktop-native self-check execution, native-runner evidence capture, launch-health inspection, and secure-secret handling.
- Fastify still owns operations reporting, verification receipt assembly, retention, delivery policy, and incident action contracts.
- The browser consumes bounded local report/view-model data and does not gain direct secret or Gateway authority.

Current follow-through inside that boundary:

- The scheduled self-check report now carries a native receipt id, observed API base, LaunchAgent state, SQLite path state, secure-store state, and a divergence summary.
- The desktop host persists that report into `journal_native_runner_history`, and `@openclog/app` promotes the latest native-runner row into the Native Truth Monitor and Operations Ledger.
- Divergence between desktop-observed health and Fastify-reported readiness remains an evidence item, not a browser-side policy decision or authority handoff.
- As of the 2026-05-30/31 proof, the default desktop self-check base is `http://127.0.0.1:8787`, matching the local Fastify LaunchAgent rather than the old development port.
- The refreshed root-DB native receipt is `desktop-self-check:http___127_0_0_1_8787:2026_05_31T03_07_26_520Z`; it observed API liveness, public Gateway readiness, the loaded `com.m4.openclog-api` LaunchAgent, `/Users/m4/OpenClog/openclog.db`, and macOS Keychain availability.
- The 8787 listener itself reported backend commit `2d37c7f`, PID `53455`, build timestamp `2026-05-31T03:06:08.801Z`, and runtime fingerprint `96c1db842ef7bf6990883b995733c9cc491ca181dbee6d81ebefaea98388977f` after rebuilding and restarting the tracked LaunchAgent script.
- As of the 2026-05-27 current-HEAD proof, `/Users/m4/OpenClog/openclog.db` contains real native-runner receipt `desktop-self-check:http___127_0_0_1_8787:2026_05_26T12_04_47_490Z`; focused desktop tests also prove that a failed native-runner history write returns a blocked self-check with a failed `native_runner_history` item.
- The same May 27 proof kept the route-budget boundary honest: live `npm run test:load` against then-current Fastify persisted live rows, but `/api/operations/report` breached the harness budget and remained degraded until later optimization.
- The route-budget boundary has now been optimized and rebaselined: the full operations report is green at 647 ms against a 750 ms live budget, while `/api/healthz` remains the cheap readiness contract.

## Cutover Goals

- Keep secure-secret handling native-only and fail closed when the desktop boundary is unavailable.
- Keep Fastify as policy/report authority until a native policy-parity proof can replace it with fresh receipts.
- Add mutation-enabled Gateway proof before any live-send or authority handoff claim.

## Not In This Campaign

- No migration of report assembly from `@openclog/app` into Tauri.
- No migration of verification command receipt writing into the browser or desktop UI.
- No browser-visible secret fallback.
- No raw OpenClaw playback/import-queue management.
- No broad remote multi-user operations or admin/config/secret editing surface.
- No duplication of retention, delivery, or incident policy in the desktop host.
