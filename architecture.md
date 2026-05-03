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
- `apps/web` owns the usable journal screen with left archive, top composer, daily timeline, right diagnostics, export, and theme variants.
- Gateway events are treated as non-replayable: reconnect plans refresh health, presence, approvals, active sessions, session index subscription, and active session message/tool subscription.

## 2026-05-02 Live Flow Follow-Up
- Added the missing event bridge between the live Gateway WebSocket adapter and the repository-backed journal.
- Repository ownership now includes `addEntry(entry, sourceEvent)` so normalized entries and redacted Gateway payload columns are written together.
- Browser state updates through both polling and SSE, so a live OpenClaw response appears without exposing Gateway credentials or raw frames.
- Normalization now handles the installed Gateway's `payload.sessionKey` plus nested `payload.message.role/content/timestamp` shape.

## 2026-05-02 Five-Theme UI Refinement
- `packages/core/src/theme.ts` now owns the strongly typed `OpenClogTheme` model, canonical IDs, aliases, labels, palette, typography, focus, status, motif, background, and safety tokens.
- The frontend component system consumes CSS variables from one theme source instead of separate theme-specific apps or data models.
- The three-pane desktop journal layout remains primary, with a stacked tablet/mobile layout that keeps the composer and timeline readable.
- Static backgrounds live under `apps/web/src/assets/backgrounds/` and are decorative only; removing them does not change information architecture.

## 2026-05-02 Interaction Refinement
- Frontend state now tracks selected day, visible tool-call preference, live event toasts, target entry focus, Agent Activity, approvals, and pending approval choices.
- Timeline rendering derives from visible entries while the backing journal day remains complete.
- Diagnostics cards now accept sanitized data and handlers, allowing Recent Tools, Agent Activity, and Pending approvals to become interactive without changing Gateway authority.
- The API adds `GET /api/sessions?dayKey=` as a sanitized view-model endpoint sourced from `sessions.list` when ready and local journal data when not.

## 2026-05-02 Theme Families Expansion
- `packages/core/src/theme.ts` now models theme families, accessibility overlays, card styles, diagnostics styles, timeline styles, accessibility profiles, motion profiles, and local background asset IDs.
- The frontend emits `data-theme`, `data-family`, `data-density`, `data-card-style`, `data-motion`, `data-diagnostics-style`, `data-timeline-style`, and `data-accessibility-profile` for token-driven styling.
- Theme backgrounds are managed through a local asset registry and can be removed without changing the three-pane information architecture.
- Browser-visible event text is normalized through a UI safety helper before rendering in timeline cards.

## 2026-05-03 Stabilization And Refactor
- `packages/core/src/display.ts` now owns product-copy normalization, browser-visible redaction reason metadata, timeline grouping, group summaries, group membership checks, and stable newest-first ordering.
- `JournalLayout` renders grouped/raw timeline items from core display helpers, expands groups for target-entry navigation, and keeps raw redacted entries available.
- Theme metadata now includes lifecycle, use-case, timeline layout mode, and diagnostics density while preserving the same three-pane shell and token-driven styling.
- Diagnostics density is presentational only; summary modes still render Gateway state, Agent Activity, Recent Tools, Pending approvals, visible status chips, and degraded/blocked warnings.
- The post-green refactor tightened timeline focus dependencies and grouped-entry index handling without changing data authority.
