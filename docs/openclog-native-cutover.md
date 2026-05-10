# OpenClog Native Cutover Prep

## Status

This artifact is truthful prep only. OpenClog still treats the Fastify API and shared application layer as the current authority for operator policy, verification evidence, and delivery governance.

## Current Native Boundary

- Tauri owns desktop-native self-check execution and secure-secret handling.
- Fastify still owns operations reporting, verification receipt assembly, retention, delivery policy, and incident action contracts.
- The browser consumes bounded local report/view-model data and does not gain direct secret or Gateway authority.

## Cutover Goals

- Move scheduled self-check ownership into the desktop boundary without duplicating Fastify policy logic.
- Keep secure-secret handling native-only and fail closed when the desktop boundary is unavailable.
- Promote launch-health evidence into the machine-local operations ledger before any larger authority shift.

## Not In This Campaign

- No migration of report assembly from `@openclog/app` into Tauri.
- No browser-visible secret fallback.
- No duplication of retention, delivery, or incident policy in the desktop host.
