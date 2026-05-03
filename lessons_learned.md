# Lessons Learned Log

## Purpose
Capture durable lessons that should shape future OpenClog work.

## 2026-05-02 Bootstrap Intent
- Gateway protocol spelling is a correctness boundary; dotted RPC method names are part of the contract.
- Offline fixtures can prove deterministic behavior, but they cannot be used to claim live Gateway readiness.

## 2026-05-02 MVP Closeout
- The Gateway probe itself needs deterministic validation; an early top-level initialization bug was caught by `npm run verify:gateway` before any socket claim could be trusted.
- Coverage pressure is useful when it targets core logic and security-sensitive paths; it also exposed a date bug where new manual notes could have landed on the seeded day.
- Visual tests needed scoped locators because the interface intentionally repeats product naming in both navigation and page heading regions.

## 2026-05-02 Live Flow Follow-Up
- A negotiated Gateway connection is not the same as information flow; event frames must be consumed, normalized, and reconciled into the local journal.
- OpenClaw can emit the same user message more than once during lifecycle transitions, so dedupe must use semantic identity instead of raw frame identity.
- Package build output matters for the running API because `@openclog/core` resolves through its built package entrypoint outside the Vitest alias path.

## 2026-05-02 Five-Theme UI Refinement
- Browser tests must build and launch a fresh preview; reusing a stale preview can make the test runner inspect old UI assets.
- Rich theme decoration needs explicit safety surfaces and visible text statuses so color and ambience never become the only signal.
- Keyboard shortcuts should be scoped to non-editing contexts, and timeline roving focus needs to stop bubbling once an entry handles an arrow key.

## 2026-05-02 Interaction Refinement
- Grid overlap bugs are easiest to prevent by constraining columns with `minmax(0, 1fr)` and giving cards explicit overflow behavior.
- A display filter must not become an ingestion filter; OpenClog should hide tool calls only in the rendered timeline, not in persistence.
- Mobile popovers need to participate in normal document flow unless they have full dialog-style positioning and focus management.
- Agent activity should prefer live sanitized session data when available, then degrade to local journal evidence without inventing state.

## 2026-05-02 Theme Families Expansion
- Family presets are the right boundary for many visual skins; they keep theme variety high without scattering one-off JSX branches.
- Accessibility overlays work best when they change real interaction traits, not just colors.
- Browser-visible event text needs its own safety layer because redacted persistence alone does not guarantee safe previews.
- Visual snapshot breadth can be large, but stable theme IDs and grouped fixtures make the coverage manageable.

## 2026-05-03 Stabilization And Refactor
- Product-copy compatibility helpers should not leave stale product phrases in source; construct compatibility guards without keeping forbidden visible strings around.
- Timeline grouping needs explainable metadata and navigation support, or it becomes harder to search and debug than raw entries.
- Browser-visible redaction is more useful when every replacement carries a reason that tests and users can inspect without exposing the value.
- Dyslexia-friendly layout work must account for selector width, line-height, weight pressure, and zoom behavior together.
- Snapshot updates are safest after representative visual inspection plus E2E assertions that operational cards and status chips remain visible.

## 2026-05-03 Stitch Operator Shell Integration
- Design artifacts are best treated as constraints and references, not imported implementation; rebuilding locally avoided remote scripts, fonts, images, and accidental generated-code behavior.
- Focus-only navigation needs tests because utility-looking controls can otherwise drift into unsafe settings/admin behavior.
- Shell geometry tests are useful for visual integrations: rail-width assertions caught the intended 280px/360px operator-console proportions without overfitting every pixel.
- Visual snapshot refreshes are safe when paired with browser-visible operational checks and an asset-safety red-team scan.

## 2026-05-03 Stitch Fidelity Correction
- Passing functional shell tests does not prove visual fidelity; a direct screenshot-to-reference pass still matters.
- A visual authority can require global shell vocabulary changes, not just themed cards inside the old layout.
- Fixed-position approval surfaces need explicit mobile viewport rules, or they can be visible to accessibility APIs while still unreachable by pointer tests.
- Fidelity tests should assert design vocabulary such as top-bar height, flat background, uppercase nav treatment, composer size, rail contrast, and center measure without freezing every pixel.
