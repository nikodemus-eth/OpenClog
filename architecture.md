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

## 2026-05-03 Stitch Operator Shell Integration
- `apps/web/src/App.tsx` now owns focus refs for the main page, composer, Gateway diagnostics, theme selector, timeline, and tool-call switch so the shell can navigate safely without changing data.
- `JournalLayout` renders the native operator-console shell: top app bar, local avatar, operator rail, day archive, grouped theme selector, journal page, diagnostics rail, shortcuts panel, and live toasts.
- The shell uses the existing theme CSS variable pipeline and `data-*` metadata; no separate Stitch app, raw generated HTML, remote assets, or theme-specific behavior branch was introduced.
- Diagnostics and timeline components continue to receive sanitized OpenClog view models and handlers; Gateway state, approvals, Agent Activity, Recent Tools, and status chips remain in the same authority path.
- The refactor split operator shell helpers while preserving the existing frontend/backend boundary.

## 2026-05-03 Stitch Fidelity Correction
- The shell CSS now treats the Stitch operator-console frame as the outer architecture: fixed 56px top bar, fixed 280px left rail, constrained center measure, fixed 360px diagnostics rail, and 1px structural dividers.
- `JournalLayout` gained rail family/system shortcut helpers while keeping the same data and focus handlers.
- The composer is now a larger journal-entry surface with native textarea input, local icons, and the same submit path.
- Theme-specific fidelity is still token/data-attribute driven: Blackbeard and Captain change shell surfaces through CSS variables, not behavior branches.
- The approval review surface keeps the existing non-admin approval model while using a Stitch-like centered panel with mobile-safe bounds.

## 2026-05-03 Gateway Device Auth And Shell Shortcuts
- The Gateway client now includes a backend-only device-auth layer between token loading and `connect`, signing the Gateway challenge without changing public API contracts.
- Device identity helpers live in the API package so the web bundle cannot import private keys, tokens, raw connect frames, or auth headers.
- The shell shortcut architecture now separates family theme selection from system diagnostics navigation: family controls change only presentation, while Network, Monitors, and Security move focus to Gateway, Agent Activity, and Pending approvals.
- The top utility controls expose visible action feedback through a local shell status line after user action, keeping default visual snapshots free of extra transient state.

## 2026-05-03 Theme Intent Realignment And Contrast Pass
- `packages/core/src/theme.ts` now treats theme intent as first-class presentation metadata: practical group, generic inspiration, OpenClog design intent, and interaction emphasis.
- `JournalLayout` emits `data-practical-group` and `data-interaction-emphasis` so CSS can express archetypes without React theme branches or behavior changes.
- Theme selector structure now follows practical usage groups instead of broad implementation families, while aliases remain centralized compatibility inputs.
- The styling layer uses computed shell and rail text variables to preserve contrast when light page surfaces sit inside dark or expressive shells.
- Theme differentiation audit:
  - Core Daily Modes: daybook, operations console, high-contrast light/dark, low-stimulus, large-print, dyslexia-oriented, and keyboard-first workflows.
  - Narrative / Character Modes: bardic manuscript and nautical logbook surfaces.
  - News / Analysis Modes: headline desk, live broadcast desk, financial ledger, tech review desk, and compact old-web tech feed.
  - Social / Feed Modes: threaded community, profile page, practical cards, story framing, microfeed, airy social, and reply-thread flow.
  - OS / Console Modes: productivity shell, polished desktop app, Linux workspace, retro desktop geometry, and terminal TUI.

## 2026-05-03 Durable Gateway Connection
- `LiveGateway` is now a resilient Gateway port with explicit connection status, reconnect attempts, stale timestamps, last error reason, and service-recovery state.
- `GatewayPort.getState()` returns a safe runtime state used by `/api/health`; `close()` lets the API shut down timers and sockets cleanly.
- Reconnect owns reauthentication and subscription replay; repository and UI layers continue to consume normalized public events and health state.
- Service recovery is isolated behind an injectable backend restart function so tests use a fake restart and production uses the local LaunchAgent path only after guarded thresholds.

## 2026-05-04 Phase 1 Quick Wins Hardening
- Completed the current operator-surface Quick Wins in the existing API/web stack instead of broadening into the native pivot prematurely.
- Added a small frontend state boundary in [`apps/web/src/state/operator-workspace.ts`](/Users/m4/OpenClog/apps/web/src/state/operator-workspace.ts) for pinned-summary validation, summary staleness, Gateway URL safety classification, reconnect trend text, retention preview formatting, and empty-state copy.
- Route state now owns URL-persisted search query alongside the existing day/filter view state so investigative views can be shared exactly.
- `/api/health.gateway` now exposes explicit freshness metadata through `lastSuccessfulSyncAt`, while reconnect count and recovery state remain backend-authored instead of browser-derived.
- The diagnostics/profile surfaces now show Gateway URL authority and loopback/LAN/remote safety classification as explicit view-model data rather than implicit operator knowledge.
- The journal day model is now carrying advanced-operator data directly: pinned context, generated summary, retention metadata, incidents, alerts, adapter events, integration payloads, and bundle export helpers.
- The Phase 1 refactor stayed additive: no native host was introduced yet, and the Fastify API remains the compatibility façade over the current local SQLite domain.

## 2026-05-04 Phase 2 Domain And Lifecycle Tranche
- Added a new shared application package at [`/Users/m4/OpenClog/packages/app/src/index.ts`](/Users/m4/OpenClog/packages/app/src/index.ts) so pagination, retention lifecycle, alert state lifecycle, integration payload routing, and replay-bundle inspection are no longer owned directly by Fastify handlers.
- The API now consumes that application layer for paginated search, paginated session drilldowns, retention apply/rollback, alert acknowledgement/snooze, expanded integration targets, and replay bundle inspection.
- Repository persistence grew new lifecycle tables for retention snapshots and alert state so rollback and operator acknowledgement/snooze survive beyond in-memory request handling.
- This tranche still stops short of the native host pivot: the current web/API stack remains the product surface, but it now sits on a clearer domain seam that the future native client can call into.

## 2026-05-04 Ladder 1 Investigation Acceleration Slice
- Search remains application-layer paginated, but the public contract now carries operator-facing match metadata: sanitized snippets and field hints travel from repository search through `@openclog/app` into the web workbench.
- Gateway health remains backend-authored, while short-form operational history is now repo-derived from persisted public events instead of inferred in the browser.
- Session drilldown, bundle preview, summary freshness, and search presets are all additive workbench capabilities on top of the existing API/web shell; no browser-visible secret, raw Gateway frame, or direct Gateway browser connection path was introduced.

## 2026-05-04 Ladder 2 Incident Workspace Slice
- The application seam now owns more than pagination and retention: `@openclog/app` assembles incident workspaces from persisted incidents, journal days, alert findings, and investigation notes, and it computes replay-bundle diffs plus closeout plans from bounded evidence inputs.
- SQLite persistence now includes a first-class investigation-note store keyed by day and optional incident id, which keeps operator-authored notes separate from pinned day context and rule-generated summaries.
- The web workbench now treats incident review as a composed surface instead of three disconnected buttons: incident selection, workspace summary, operator notes, bundle comparison, and closeout planning all consume explicit API contracts rather than ad hoc frontend joins.

## 2026-05-04 Full Improvement Tranche Closeout
- `JournalDay` now carries optional evidence-completeness metadata so archive rows can show the same operator-quality signal whether they come from fixtures or SQLite-backed API responses.
- The repository composes per-day completeness from persisted summary, investigation notes, bundle exports, and incidents; UI code renders the result as view-model data instead of re-counting tables in the browser.
- Replay-bundle diffs now include a first-class change class from `@openclog/app`, keeping narrative/metadata/evidence-shape triage close to the shared application boundary.
- Workbench interaction helpers continue moving into `apps/web/src/state/operator-workspace.ts`, with React owning orchestration and focus rather than policy decisions.

## 2026-05-05 Incident Command Loop Convergence
- `packages/app` is no longer a single catch-all file: the shared application layer now has explicit contracts, settings normalization, utility helpers, and a dedicated incident-loop module that assembles `Detect -> Explain -> Recommend -> Act -> Record` from bounded local evidence.
- `IncidentWorkspace` now carries a typed `loop` model rather than only loose summary fields, so the API and web UI can render the same operator decision surface without React inventing policy.
- Incident actions are now explicit backend-mediated contracts rather than scattered button wiring: rebuild-state, raw-log review, replay/correlation review, incident packet copy, outbound delivery, GitHub issue creation, plugin execution, summary refresh, note capture, and closeout recording all execute through one incident action route.
- SQLite persistence now records incident action history in `journal_incident_action_records`, while delivery receipts carry richer operational metadata such as `correlationId`, `retryCount`, and `deadLetterReason`.
- Settings now have a versioned `settings.v2` shape that preserves theme, tool-call preference, search presets, and saved operator views across the web and future desktop surfaces.

## 2026-05-05 Full Campaign Closeout
- `packages/app/src/index.ts` is now a thin application factory composed from dedicated feature modules for search, retention, alerts, incidents, delivery, governance, and settings/view normalization, while still exporting one product-facing contract surface.
- The shared contracts now model named operator views with drilldown persistence, summary jobs, health aggregates, idempotent/dry-run delivery, plugin validation metadata, signed replay bundles, replay workspaces, declarative incident rule packs, SLO snapshots, and generated operator runbooks.
- The Fastify API remains the local compatibility facade, but it now exposes bounded routes for summary-job polling, health aggregates, paginated/sorted receipt and incident-action history, replay workspace creation, rule-pack inspection, SLO status, and runbook generation on top of the shared application seam.
- SQLite persistence now includes first-class summary-job and replay-workspace tables plus targeted indexes for session drilldowns, statuses, adapter events, tool failures, delivery receipts, and incident action history so the investigation-heavy surfaces stay responsive on larger journals.
- The desktop shell is now a real native host boundary rather than a placeholder: the Tauri surface exposes a contract snapshot, scheduled self-check entrypoint, and backend-only secure-secret commands backed by the macOS Keychain with explicit fail-closed behavior off macOS.

## 2026-05-05 Workbench Execution Lanes
- The web workbench now exposes the existing retention execution lane directly: preview remains the gate, apply calls `/api/retention/apply`, rollback calls `/api/retention/rollback/:id`, and the UI shows the applied snapshot impact instead of treating retention as preview-only copy.
- Alert findings are now operator-actionable per finding through the existing acknowledgement and snooze backend routes; the browser refetches alert state after each mutation instead of inventing optimistic lifecycle state.
- Mission replay and correlation are now inspectable evidence lists in the incident workbench, with local entry jump affordances and explicit fail-closed unavailable copy when the replay or correlation endpoint cannot serve local evidence.
- The new view logic stays in `apps/web/src/state/operator-workspace.ts`, keeping `App.tsx` focused on orchestration, route calls, and local focus/navigation state.
