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
