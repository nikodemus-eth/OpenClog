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
