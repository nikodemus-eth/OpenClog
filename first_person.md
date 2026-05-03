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
