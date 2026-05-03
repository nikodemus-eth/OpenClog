# Testing Log

## Purpose
Record deterministic verification, live Gateway verification, coverage policy, and closeout results.

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
- Playwright visual snapshots passed for `default`, `captains-log`, `hearty-tale`, and `blackbeards-log` on desktop and mobile.
- `npm run verify:gateway` failed closed with `device identity required`; no live Gateway session, approval, message, or tool activity was fabricated.

## 2026-05-02 Local Gateway Token Follow-Up
- `npm run verify` passed after the live Gateway adapter and protocol correction.
- `npm run verify:gateway` passed live with the local OpenClaw token.
- Live probe result: negotiated role `operator`, scopes `operator.read`, `operator.write`, and `operator.approvals`, with no missing scopes.
- Mutation testing remained disabled, so no create/send/abort test session was fabricated or performed.
