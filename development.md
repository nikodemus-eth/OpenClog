# Development Log

## Purpose
Track OpenClog implementation decisions, verification passes, refactors, and closeout evidence.

## 2026-05-02 Bootstrap Intent
- Initialize this folder as the local OpenClog repo on `main`.
- Build the local-first OpenClaw Journal MVP from `Instructions.md`.
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
