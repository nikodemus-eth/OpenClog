# Architecture Log

## Purpose
Track OpenClog architecture, component ownership, and authority boundaries.

## 2026-05-02 Bootstrap Intent
- `packages/core` owns shared types, protocol constants, redaction, normalization, exports, theme tokens, and UI-safe policy helpers.
- `apps/api` owns Gateway credentials, Gateway connection state, SQLite persistence, audit logging, and public HTTP/SSE routes.
- `apps/web` owns the local journal interface and never talks to OpenClaw Gateway directly.

## 2026-05-02 MVP Closeout
- `packages/core` now owns dotted Gateway method constants, handshake evaluation, reconnect call plans, composer classification, redaction, normalization, exports, sample data, and theme tokens.
- `apps/api` exposes the public REST/SSE API, keeps Gateway state behind a backend port, persists the local SQLite journal, and declares the Drizzle table schema contract for all required journal tables.
- `apps/web` owns the usable journal screen with left archive, top composer, daily timeline, right diagnostics, export, and four theme variants.
- Gateway events are treated as non-replayable: reconnect plans refresh health, presence, approvals, active sessions, session index subscription, and active session message/tool subscription.

## 2026-05-02 Live Flow Follow-Up
- Added the missing event bridge between the live Gateway WebSocket adapter and the repository-backed journal.
- Repository ownership now includes `addEntry(entry, sourceEvent)` so normalized entries and redacted Gateway payload columns are written together.
- Browser state updates through both polling and SSE, so a live OpenClaw response appears without exposing Gateway credentials or raw frames.
- Normalization now handles the installed Gateway's `payload.sessionKey` plus nested `payload.message.role/content/timestamp` shape.
