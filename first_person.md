# First Person Log

## Purpose
Record first-person implementation notes from the builder/operator perspective.

## 2026-05-02 Bootstrap Intent
- I am building OpenClog as a local operational memory for OpenClaw, not as a replacement for the existing Control UI.
- I will keep Gateway credentials server-side and show degraded or blocked state instead of pretending live state exists.

## 2026-05-02 MVP Closeout
- I kept the browser on the safe side of the boundary: it receives public health, journal, approval, and export data, but no Gateway token, cookie, auth header, env value, or raw secret-looking payload.
- I treated the Gateway live probe honestly. The local Gateway path did not negotiate because device identity was required, so I recorded the result as failed closed.
- I refactored after the first green verification pass, then reran the complete deterministic gate.

## 2026-05-02 Live Flow Follow-Up
- I chased the user's real `ping` failure instead of treating Gateway readiness as enough.
- The missing piece was not auth; the backend was ignoring Gateway `event` frames after request responses.
- I verified the fix through OpenClog itself: composer `ping` now produces a visible OpenClaw `pong`.

## 2026-05-02 Five-Theme UI Refinement
- I treated this as a presentation addendum and left backend, Gateway, permission, composer, and delivery behavior untouched.
- I made theme switching a visual-only state change: composer text, selected day, diagnostics, pending approvals, readiness, and local journal data stay put.
- I kept the decorative themes readable and made Accessibility a first-class mode with larger targets, clearer focus, and explicit status text.

## 2026-05-02 Interaction Refinement
- I fixed the Blackbeard overlap by constraining layout flow instead of hiding content.
- I made `Show Tool Calls` a UI-only preference so stored journal evidence remains complete.
- I turned live event notices into short-lived navigation affordances: clicking one selects the right day and focuses the matching entry.
- I kept approval handling explicit: approve maps to `allow-once`, disapprove maps to `deny`, and defer sends nothing.

## 2026-05-02 Theme Families Expansion
- I expanded the theme system without turning each theme into its own app or behavior branch.
- I kept the richer parody themes generic and local: no external logos, copied assets, proprietary glyphs, or remote background fetches.
- I treated the Accessibility variants as real usability modes, with larger targets, stronger focus, reduced motion where appropriate, and visible status text.
- I kept the operational surface steady while switching themes: the journal, composer text, diagnostics, Gateway readiness, approvals, agents, and tools stay where they are.

## 2026-05-03 Stabilization And Refactor
- I kept this pass narrow: UI/core presentation stabilization only, with no backend or Gateway behavior changes.
- I moved the new timeline grouping and browser-visible safety behavior into core helpers so the React layer stays mostly rendering-focused.
- I treated grouped entries as a visual convenience, not a data rewrite; raw history remains available and redacted in both grouped and raw views.
- I made the Pending approvals card easier to act on while preserving zero-count visibility.
- I reran the deterministic gate after the visual snapshot refresh and treated the live Gateway probe as failed closed when device identity was required.

## 2026-05-03 Stitch Operator Shell Integration
- I treated Stitch as a visual authority, not a source-code authority: I rebuilt the shell in native OpenClog components and left generated HTML, CDN scripts, fonts, and remote images out of the repo.
- I kept every top-bar action safe. Journal, Command, Network, Logs, settings, tool filters, and help only focus existing UI regions or toggle the existing shortcuts panel.
- I preserved the operational surfaces across the redesign: Gateway state, Agent Activity, Recent Tools, Pending approvals, degraded/blocked warnings, and status chips stay visible.
- I refreshed the full desktop/mobile visual baseline only after checking representative Stitch references against the implementation.
- I reran the deterministic gate after the refactor and recorded the live Gateway probe as failed closed with `device identity required`.

## 2026-05-03 Stitch Fidelity Correction
- I agreed with the visual critique and treated the first Stitch pass as insufficient, not as done.
- I compared the OpenClog Journal, Captain's Log, Blackbeard's Log, grouped-events, approval-dialog, mobile, and Dyslexia Friendly Stitch screenshots against the browser output with `view_image`.
- I pushed the interface closer to the accepted mockups through native CSS and component-safe markup instead of importing generated HTML or external assets.
- I kept the live and security boundaries steady while changing only presentation.

## 2026-05-03 Gateway Device Auth And Shell Shortcuts
- I traced the Gateway failure to the missing device-identity handshake rather than restarting services that were already healthy.
- I kept the token and device identity path backend-only and verified the live Gateway path after implementing the signed challenge response.
- When the shell controls looked inert, I treated it as an interaction bug: the controls were technically focusing elements but lacked visible feedback or concrete family selection.
- I added failing UI tests first, made the shortcuts visibly useful, refreshed snapshots only for intentional chrome changes, and kept the behavior bounded.

## 2026-05-03 Theme Intent Realignment And Contrast Pass
- I treated the user's theme-intent table as the design contract and kept Stitch as shell vocabulary only.
- I did not add themes; I made the current 27 themes more legible, more differentiated, and more honest to their OpenClog purpose.
- I used practical group and interaction-emphasis metadata so the UI can express daybook, operations, news, social, desktop, terminal, and accessibility mental models without one-off behavior branches.
- I audited the non-accessibility themes for readable text and status contrast, especially the dark and sidebar-heavy surfaces that were easiest to under-light.
- I kept the Gateway and safety boundaries steady: this pass changes presentation and test coverage, not authority.

## 2026-05-03 Durable Gateway Connection
- I reproduced the important split before changing code: `npm run verify:gateway` could connect live, but the already-running OpenClog API stayed degraded after the Gateway process restarted.
- I fixed the lifetime problem inside OpenClog instead of leaning on another manual restart.
- I kept auto-restart narrow and grudging: OpenClog first heals its own socket, then restarts only the local LaunchAgent after repeated eligible failures and never for auth, pairing, scope, or remote-deployment problems.
- I kept the browser on public status data only; reconnect details are useful, but secrets and raw frames still stay backend-only.

## 2026-05-04 Phase 1 Quick Wins Hardening
- I kept this turn honest and tranche-scoped: I shipped the current operator-surface Quick Wins rather than pretending the whole native pivot could be finished in one pass.
- I pulled the new decision logic into a small helper module because `App.tsx` was already carrying too much conditional state for safe testing.
- I made the profile panel tell the truth about where it points, whether it is loopback-safe, LAN-local, remote, invalid, or unset, because operators should not have to infer that from a URL string.
- I treated the generated-summary stale marker and pinned-summary validation as operator trust work, not cosmetic polish.
- I reran the full deterministic gate after the UI, test, and visual snapshot changes and logged the result only after it was green.

## 2026-05-04 Phase 2 Domain And Lifecycle Tranche
- I used the user's larger native-pivot plan as the guide, but I kept this implementation tranche grounded in the real missing seam: product behavior was still living in Fastify handlers and repository helpers.
- I added the shared application package first and made it earn its place with failing tests before I moved the HTTP routes over.
- When the package import path broke `tsc -b`, I fixed the workspace integration properly with a dependency refresh instead of normalizing brittle source-import hacks.
- I let the full gate be the authority; the only regression it found was the canonical table-order list, and I reran the entire verify stack after fixing it.

## 2026-05-04 Full Improvement Tranche Closeout
- I treated the user's “commit everything” correction as a scope rule, not a suggestion: all repo-owned non-ignored work belongs in the final local commit.
- I changed the shortcut chords because `Shift+letter` was a real usability trap in an app where operators type notes, summaries, and searches all day.
- I kept the last tranche concrete: saved presets, evidence badges, API examples, diff classes, local note confirmation, tests, docs, snapshots, and publication rather than vague roadmap naming.
