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

## 2026-05-03 Stabilization And Refactor
- Stabilized the existing 27-theme set without adding themes or changing backend, Gateway, permission, composer, persistence, approval, API, or delivery behavior.
- Cleaned product-facing archive/export/sample display paths so historical source titles render as OpenClog Journal while OpenClaw Gateway wording stays limited to integration/status contexts.
- Added display-only timeline grouping for adjacent repeated low-value events, a grouped/raw timeline toggle, and target-entry navigation that expands the containing group when needed.
- Added browser-visible safety metadata with explicit redaction reasons for credentials, token-like values, auth headers, cookies, OAuth, SMTP, env assignments, raw Gateway-looking payloads, unsafe local paths, and long previews.
- Added theme lifecycle, use-case, timeline layout mode, and diagnostics density metadata for the existing theme catalog.
- Refactored timeline focus and grouped-entry rendering after the first green verification pass, keeping the behavior token-driven.
- Refreshed desktop/mobile visual snapshots for every selectable theme after checking diagnostics and status chips remained visible.
- Ignored local Stitch export artifacts so generated design bundles do not enter the verified source commit.
- Live Gateway verification failed closed with `device identity required`; no live Gateway activity was fabricated.

## 2026-05-03 Stitch Operator Shell Integration
- Integrated the approved Stitch visual direction as native React/CSS: a visible OpenClog operator top bar, safe Journal/Command/Network/Logs focus navigation, utility controls, local deterministic operator avatar, fixed 280px left rail, fluid center, 360px diagnostics rail, and structural dividers.
- Preserved the existing 27 theme IDs, token-driven theme family architecture, three-pane information model, grouped/raw timeline, newest-first ordering, diagnostics visibility, approval semantics, composer behavior, Gateway boundaries, and local-first data flow.
- Rebuilt the Stitch direction without importing raw generated HTML, Tailwind CDN scripts, Google fonts, Material Symbols, remote profile images, or external assets.
- Added tests for safe shell navigation, operator shell proportions, local-only asset usage, and source-level remote Stitch asset leakage.
- Refactored the shell after the first green verification pass by extracting the operator avatar/header helpers and deduplicating top-bar button rendering.
- Refreshed desktop and mobile visual snapshots for every selectable theme after comparing representative screenshots with the Stitch references.
- `npm run verify` passed after implementation, snapshot refresh, and refactor; coverage remained 100% statements, branches, functions, and lines for the configured coverage targets.
- `npm run verify:gateway` failed closed with `device identity required`; no live Gateway activity was fabricated or marked green.

## 2026-05-03 Stitch Fidelity Correction
- Corrected the Stitch integration after visual review found the first pass too structurally themed and not close enough to the mockups.
- Tightened the shell toward the Stitch reference: 56px flat top bar, uppercase navigation, grouped operator rail shortcuts, larger journal-entry composer, constrained 800px center measure, and denser right diagnostics rail.
- Adjusted flagship surfaces so Blackbeard's Log uses a light operator/header shell with a dark diagnostics rail, Captain's Log uses dark operator-console chrome, and core/accessibility themes keep the flat light operator shell.
- Kept this as a frontend presentation pass only; no backend, Gateway, permission, composer forwarding, approval semantics, persistence, API, or delivery behavior changed.
- Added a browser fidelity regression for Stitch shell vocabulary and flagship rail colors, then refreshed all 54 desktop/mobile visual snapshots.
- Fixed the mobile Pending approvals review panel placement so the Stitch-style approval surface remains actionable on narrow viewports.
- Final `npm run verify` passed on the logged tree; `npm run verify:gateway` failed closed with `device identity required`.

## 2026-05-03 Gateway Device Auth And Shell Shortcut Fix
- Added backend-only OpenClaw device-identity authentication for the Gateway handshake, including challenge handling, v3 payload signing, connect-frame redaction, and classified verifier failures.
- Kept Gateway token ownership in the backend and continued requesting only `operator.read`, `operator.write`, and `operator.approvals`; no browser credential, secret, pairing, or admin surface was added.
- Fixed inert-looking shell controls: family shortcuts now select the default theme for Core, News, Social, OS, and Accessibility; Network, Monitors, and Security focus their corresponding diagnostics; settings and filter icons announce the focused control.
- Refactored the shortcut wiring into focused shell-target handlers and diagnostics refs while preserving presentation-only theme switching and existing Gateway/composer/approval behavior.
- Refreshed desktop/mobile visual snapshots after confirming the family shortcut chrome remained readable and diagnostics/status chips stayed visible.
- The first final live probe timed out waiting for `connect.challenge`; `openclaw gateway restart` restored the local Gateway listener before the final live probe.
- Live `npm run verify:gateway` passed after device auth, reaching `hello-ok` and probing health, presence, approval list, session list, and session subscriptions without mutation testing.

## 2026-05-03 Theme Intent Realignment And Contrast Pass
- Realigned the existing 27 themes to the user-provided intent table without adding themes, changing behavior, or cloning proprietary trade dress.
- Added presentation-only theme intent metadata: practical group, generic inspiration, OpenClog design intent, and interaction emphasis.
- Replaced the selector grouping with practical groups: Core Daily Modes, Narrative / Character Modes, News / Analysis Modes, Social / Feed Modes, and OS / Console Modes.
- Retuned theme tokens and archetype CSS so themes read as daybook, operations console, accessibility mode, narrative journal, news/analysis desk, social feed, desktop shell, or terminal instead of collapsing into one visual family.
- Improved non-accessibility theme contrast across shell text, side rails, archive metadata, status chips, placeholder text, dark/sidebar-heavy themes, and disabled/inactive surfaces.
- Tightened Dyslexia Friendly spacing, line-height, selector width, diagnostics card flow, mobile stacking, and 200 percent zoom behavior.
- Refactored the theme/style pass into token-driven metadata and CSS data attributes: `data-practical-group` and `data-interaction-emphasis`; no backend, Gateway, permission, composer, approval, persistence, API, or delivery behavior changed.
- Refreshed all 54 desktop/mobile Playwright visual snapshots after representative inspection of Blackbeard's Log, Clog News, Clog News Network, Clog-Net, Clogbuntu, Cloginal, Accessibility Dark, Dyslexia Friendly, and mobile OpenClog Journal.
- Final deterministic verification and live Gateway verification passed after the log update; live mutation testing remained disabled.

## 2026-05-03 Durable Gateway Connection
- Fixed the recurring stale Gateway condition by replacing the one-shot backend socket lifecycle with a resilient live Gateway manager.
- The root cause was an OpenClog API process surviving an OpenClaw Gateway restart: the existing socket marked itself stale/degraded but never reconnected, while fresh live verifier connections succeeded.
- The backend now reconnects automatically after socket close, socket error, heartbeat/request timeout, sequence gap, or startup unavailability; every reconnect re-reads Gateway token and device identity, signs a fresh connect challenge, validates `hello-ok`, and reruns the reconnect subscription plan.
- Added guarded backend-only auto-restart for the local loopback LaunchAgent after repeated eligible reconnect failures; it is cooldown-bound, macOS/loopback-only, and never runs for token mismatch, missing device identity, pairing-required, missing-scope, or remote Gateway failures.
- Added safe public health fields for reconnect status, last connection/disconnection times, last error reason, next reconnect, reconnect attempt, and redacted service-recovery summary.
- Added visible UI copy for reconnecting/stale service recovery states without adding admin, pairing, config, secret, or broad-scope controls.
- Refactored timeout handling so connect-timeout failures are counted once, while ordinary request timeouts still stale the socket and schedule recovery.

## 2026-05-04 Phase 1 Quick Wins Hardening
- Implemented the Quick Wins as a bounded tranche: API/view-model changes first, then frontend wiring, then helper extraction, then verification and docs.
- Pulled the new operator-surface logic out of [`apps/web/src/App.tsx`](/Users/m4/OpenClog/apps/web/src/App.tsx) into [`apps/web/src/state/operator-workspace.ts`](/Users/m4/OpenClog/apps/web/src/state/operator-workspace.ts) so validation, stale-summary checks, URL safety classification, reconnect trend text, and empty-state decisions are unit-testable without rendering the full shell.
- Kept the route-state refactor narrow by extending [`apps/web/src/hooks/useJournalRouting.ts`](/Users/m4/OpenClog/apps/web/src/hooks/useJournalRouting.ts) with URL-backed `q=` search state instead of introducing another state container.
- Tightened the operator workflow by blocking pinned-context saves on invalid summary text, adding a clear-filters affordance, and routing the incident bundle copy action through the existing export path rather than duplicating serialization logic.
- Preserved additive schema/domain growth already underway in the repo and extended tests around it rather than trying to collapse Phase 2-4 into a single speculative rewrite.

## 2026-05-04 Phase 2 Domain And Lifecycle Tranche
- Added the new `@openclog/app` workspace package and drove it from failing tests first before wiring the API to it.
- Kept the first application-layer cut narrow and useful: stable cursor pagination, retention snapshot/apply/rollback, alert acknowledgement/snooze state, integration payload pass-through, and replay bundle inspection.
- Corrected the package integration at the workspace level with a real `npm install` refresh so `@openclog/app` resolves as a package in tests and `tsc -b`, instead of leaving brittle cross-package source imports in place.
- Let the full verify gate find the schema-ordering regression before touching the logs, then fixed the canonical table-name order and reran the full gate from scratch.

## 2026-05-04 Ladder 1 Investigation Acceleration Slice
- Extended the existing search lane instead of replacing it: `/api/search` now preserves cursor pagination and adds sanitized `matchSnippet` plus `matchFieldHints`, while the web workbench adds saved search presets and explicit load-more behavior.
- Added operator-facing review helpers in the current shell: sanitized session-summary copy, bundle-manifest preview before offline review/copy, generated-summary freshness detail, and inline empty-state actions for incidents, alerts, and adapter-driven offline review.
- Added bounded Gateway diagnostic enrichment without widening authority: a redacted last-error category, repo-derived recent health-history entries, and keyboard search focus that behaves as a true global operator shortcut.

## 2026-05-04 Ladder 2 Incident Workspace Slice
- Continued the roadmap with the next bounded tranche instead of jumping to native/plugin surfaces: persistent investigation notes, incident workspace retrieval, replay-bundle diffing, and an end-of-day closeout planner are now implemented across `packages/app`, the API, SQLite persistence, and the web workbench.
- Added a dedicated investigation-note artifact path backed by `journal_investigation_notes`, keeping operator-authored notes distinct from pinned context and generated summaries.
- Promoted more operator workflow logic into `@openclog/app`: incident workspace assembly, replay-bundle diffing, investigation-note lifecycle, and closeout-plan construction now live behind the shared application seam rather than inside Fastify handlers.
- Kept the tranche additive and fail-closed: new surfaces operate on stored redacted evidence, not live raw Gateway payloads, and the browser still receives only bounded, sanitized view models.

## 2026-05-04 Full Improvement Tranche Closeout
- Completed the next operator tranche on top of the existing dirty implementation rather than cherry-picking only fresh edits: the workbench now ships eight default investigative search presets, per-day evidence-completeness badges, API route/payload copy controls, local note confirmation, and replay-bundle diff classifications.
- Corrected global keyboard commands away from plain `Shift+letter` chords; command shortcuts now use `Alt+E`, `Alt+A`, `Alt+T`, `Alt+C`, and `Alt+S` so operators can still type capital letters in text fields.
- Kept the refactor boundary practical: shared behavior lives in `@openclog/app`, core display/types, repository helpers, and frontend state helpers while Fastify routes stay mostly as API adapters.
- Refreshed deterministic visual baselines after the archive badge and workbench control changes, and added `.gitignore` coverage for repo-local cache/build output that should not be committed as source.

## 2026-05-05 Workbench Execution Lanes
- Implemented this as a narrow web-workbench activation over existing backend contracts rather than adding new application routes.
- Added client wrappers for retention apply/rollback and alert acknowledge/snooze, then kept React mutation handlers fail-closed: successful actions refetch authoritative data; failed actions leave existing state untouched and report explicit local notices.
- Continued the frontend refactor by moving retention impact, alert-state classification, snooze calculation, replay-step formatting, correlation formatting, and workbench-copy redaction into `apps/web/src/state/operator-workspace.ts`.
- Expanded the fixture-driven browser lane so lifecycle execution, per-finding alert controls, and replay/correlation inspection are tested as operator workflows instead of helper-only behavior.

## 2026-05-08 Monitoring Import And Capability Registry
- Added a local, explicit monitoring-import flow for `newsletter-monitoring.md` style Gmail, blogwatcher, and OpenClaw triage decisions, turning bullets into redacted investigation notes, incident summaries, handoff packets, pinned context, and delivery payload context.
- Added capability registry manifests for incident actions, delivery targets, plugins, and governance surfaces with purpose, version, permissions, failure modes, audit provenance, approval signature, and review or expiry gates before live use.
- Kept the new lanes fail-closed: monitoring imports require explicit local confirmation, malformed capability manifests block execution, incident action buttons surface registry state, and delivery/plugin routes translate blocked capabilities into bounded API errors.
- Refactored capability error handling in the API, moved registry and monitoring-import logic into `@openclog/app`, extended the SQLite schema and Drizzle schema list, and refreshed mobile visual baselines for the new operator panels.
- Verification passed with `npm run verify` after the visual refresh, keeping configured coverage at 100% statements, branches, functions, and lines; `npm run verify:gateway` also passed against the live Gateway with mutation testing disabled; `npm run verify:desktop-native` passed the desktop-native cargo tests.
