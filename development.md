# Development Log

## Purpose
Track OpenClog implementation decisions, verification passes, refactors, and closeout evidence.

## 2026-05-02 Bootstrap Intent
- Initialize this folder as the local OpenClog repo on `main`.
- Build the local-first OpenClog Journal MVP from `Instructions.md`.
- Keep Gateway protocol names dotted and documented: no underscore RPC variants.
- Treat deterministic verification and live Gateway verification as separate gates.

## 2026-05-02 MVP Closeout
- Initialized the repo on `main` and preserved `Instructions.md`.
- Built the React/Vite/TypeScript frontend, Fastify API, SQLite journal repository, Drizzle schema contract, core protocol/redaction/export/theme package, and deterministic fixture tests.
- Added the post-green refactor by splitting the React shell into focused journal layout components while keeping state and side effects in `App.tsx`.
- `npm run verify` passed after the refactor: dotted-RPC guard, typecheck, lint, build, 100% unit coverage, Playwright e2e, Playwright visual snapshots, red-team fixtures, and log checks.
- `npm run verify:gateway` failed closed with `device identity required`; no live Gateway activity was fabricated or logged as green.

## 2026-05-02 Local Gateway Token Follow-Up
- Read the local OpenClaw Gateway token from `/Users/m4/.openclaw/openclaw.json` without printing or storing the secret.
- Corrected the reconnect presence RPC from the invented `system.presence` name to the installed OpenClaw `system-presence` method.
- Added a live Gateway adapter for the API startup path; when the local token is present, OpenClog negotiates `operator.read`, `operator.write`, and `operator.approvals`.
- Restarted the local API and browser surface; `/api/health` now reports Gateway `ready` with no missing scopes.

## 2026-05-02 Live Flow Follow-Up
- Fixed the missing data flow from OpenClaw into OpenClog: live Gateway `event` frames are now emitted through the backend port, normalized, redacted, persisted in SQLite, and pushed to browsers over `/api/stream`.
- Changed composer ask/command flow to `sessions.create` with no duplicate initial message, then `sessions.messages.subscribe`, then one `sessions.send`.
- Removed the optional reused `OpenClog` session label after live Gateway rejected it as already in use.
- Verified a real OpenClog composer `ping` produced a real OpenClaw `pong` journal entry in the running app.

## 2026-05-02 Five-Theme UI Refinement
- Renamed product-facing UI copy to OpenClog and OpenClog Journal while keeping OpenClaw Gateway wording for integration/status text.
- Added the typed five-theme system with canonical IDs: `openclog-journal`, `captains-log`, `accessibility`, `a-hearty-tale`, and `blackbeards-log`; compatibility aliases remain centralized.
- Refactored the frontend into focused shell, sidebar, composer, readiness, day header, timeline, diagnostics, status chip, skip link, and shortcuts-help components.
- Added deterministic local background assets and refreshed Playwright desktop/mobile visual snapshots for all five themes.

## 2026-05-02 Interaction Refinement
- Fixed the Blackbeard's Log desktop overlap by tightening the shell grid, capping the diagnostics rail, and moving timeline status chips below entry text at narrower desktop widths.
- Added persisted `Show Tool Calls` display filtering in Recent Tools; all redacted OpenClaw events remain stored while tool entries can be hidden from the visible timeline.
- Added selected-day archive navigation, clickable 10-second live event toasts, target-entry scroll/focus, richer Agent Activity, and a Pending approvals popover with approve, disapprove, and defer choices.
- Refreshed the desktop/mobile visual snapshots after visually checking the Blackbeard layout.
- Deterministic `npm run verify` passed for this interaction refinement.
- Live `npm run verify:gateway` failed closed with `device identity required`; no live Gateway activity was fabricated.

## 2026-05-02 Theme Families Expansion
- Expanded OpenClog from the original five themes into a 27-theme family system using shared `familyPresets`, accessibility overlays, `defineTheme()`, and token-driven CSS variables.
- Added grouped theme selection for Core, News / Media, Social / Community, OS / Desktop, and Accessibility while preserving theme switching as presentation-only behavior.
- Refactored the theme layer around reusable metadata, local asset registry entries, rail contrast variables, and browser-visible event preview/redaction helpers.
- Kept Gateway state, Agent Activity, Recent Tools, Pending approvals, status chips, degraded state, blocked state, and security warnings visible across every selectable theme.
- Removed stale decorative asset paths and updated desktop/mobile visual snapshots for every theme.
- Final deterministic closeout verification passed with `npm run verify` before commit.
- Live Gateway closeout verification failed closed with `device identity required`; no live Gateway activity was fabricated or claimed green.
