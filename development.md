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
