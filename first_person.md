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
