# Lessons Learned Log

## Purpose
Capture durable lessons that should shape future OpenClog work.

## 2026-06-08 Final Coverage Closeout
- A green focused regression bundle is not enough when the repo has a 100 percent coverage contract. Run the all-up gate, then close missed resilience branches with behavior tests rather than loosening thresholds.
- Coverage failures can be a useful refactor signal: repeated `error instanceof Error ? ...` branches were easier to cover and reason about once throwable normalization had one owner.
- Keep live proof fresh after refactors and after code commits, even when the code change looks test-only. The post-code-commit listener reported runtime-code commit `f6d3cef` and the final live load check stayed under budget at 396 ms on `/api/operations/report`.

## 2026-06-08 Default Startup And Load Proof
- Moving import work after `app.listen` proves prompt bind, but it does not prove a usable listener if the scheduled import can still monopolize the request loop. Bound the startup pass and prove route budgets after the scheduled work fires.
- Backfill recovery should batch by day and summarize once per touched day; per-message `addEntry` is too expensive for LaunchAgent startup recovery on a large local corpus.
- Live load regressions can move: after `/api/operations/report` was optimized, `/api/sessions/:key` became the red route because it still parsed every journal row. Keep the harness as the arbiter instead of focusing only on the previous slow route.

## 2026-06-06 Current-Source Listener Reverification
- A matching `/api/version` commit is not enough when dirty source is in play; compare changed source to emitted package files and restart the actual LaunchAgent before treating a listener as current proof.
- Keep startup ingestion separate from listener liveness. The existing backfill switch was enough to get a current proof listener online, and the logs must record that scoped runtime environment.
- A current live listener can still be a red load proof. Preserve route-budget regressions as evidence instead of replacing a stale green proof with a fresh overclaim.

## 2026-06-03 Trust-Surface Reverification
- Built-in saved views should not count against user-saved view caps; defaults are product vocabulary, while user views are operator state that must survive new built-ins.
- Route-budget percentiles are evidence, not labels. Do not emit p99-style copy until the repository has actual route observations for that route.
- A green historical listener is not current proof after HEAD and the dirty diff move. Keep live runtime, command receipt, native-test, and fixture-load authority separate.

## 2026-05-20 Mega Tranche Rework
- Many “new” operator features are actually contract-clarity problems; if the report shape is too thin, the UI either invents state or duplicates policy.
- Saved-view persistence becomes a governance surface once operators use it for handoff; restart persistence, linting, and selected-gate recovery need explicit behavior and tests.
- Queue-pressure work should be domain-backed, not UI-backed. Deduping summary jobs at the repository boundary is more trustworthy than teaching the browser to guess whether a job is already running.
- Native truth-monitor work is safest when it adds divergence evidence without creating a second authority path.

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

## 2026-05-03 Gateway Device Auth And Shell Shortcuts
- A healthy OpenClaw Gateway can still reject OpenClog until the client satisfies device identity; `Connectivity probe: ok` and `hello-ok` are different gates.
- Existing paired devices may negotiate broader scopes than OpenClog requests, so tests must assert requested scopes as well as the negotiated ready state.
- Visible feedback matters for icon and rail shortcuts: if a click only moves focus, the UI should either show the target clearly or announce the action.
- Snapshot churn should be reduced by avoiding default transient status text; action feedback should appear after interaction, not in idle baselines.

## 2026-05-03 Theme Intent Realignment And Contrast Pass
- A large theme catalog needs intent metadata, not just palette metadata; practical group and interaction emphasis make differences testable.
- Broad family CSS can accidentally make themes feel alike. Archetype-level selectors work better when they are keyed by purpose such as headline, ledger, thread, desktop, or terminal.
- Contrast should be checked against actual shell and rail surfaces, not only page/card backgrounds.
- Mobile fixes need selector specificity that can beat desktop base rules; otherwise a visually correct desktop grid can still intercept mobile interactions.
- Accessibility-adjacent themes like Dyslexia Friendly need layout pressure checks, not just font stack changes.

## 2026-05-03 Durable Gateway Connection
- A green one-shot Gateway verifier does not prove the long-lived API socket will recover after the Gateway restarts.
- The durable boundary is the API connection lifecycle: reconnect, reauthenticate, resubscribe, and reconcile before asking the user to touch services.
- Service restart should be a last resort with failure classification, cooldown, and an explicit refusal path for auth and scope problems.
- Public health needs enough detail to explain stale/reconnecting state without leaking the auth material that made the connection possible.

## 2026-05-04 Phase 1 Quick Wins Hardening
- Small operator improvements become easier to verify when their decision logic is extracted into pure helpers before the UI is stretched further.
- Search state is part of the investigative contract; if operators cannot deep-link the current query, the feature is materially less useful.
- A `Copy incident bundle JSON` affordance should reuse the same export authority path as file export, or the product will drift into multiple incident-evidence formats.
- Coverage pressure is still useful here, but the right honest statement is `100 percent on the configured measured surface` until the heavier bootstrap/repository exclusions are retired.
- Visual snapshot refreshes are safe only when paired with targeted E2E assertions for the new operator cues, especially diagnostics copy and empty-state behavior.

## 2026-05-04 Phase 2 Domain And Lifecycle Tranche
- If a new workspace package is meant to be consumed as a real package, refresh the workspace install instead of leaving temporary cross-package source imports in place.
- Retention rollback is more reliable when the snapshot captures the full pre-apply state, not only the removed subset.
- Seed data matters for lifecycle tests: OpenClog's canonical sample day participates in retention behavior and needs to be accounted for honestly in assertions.
- Full-gate regressions after schema growth are often contract-order problems rather than logic problems; rerun from the failing lane upward instead of assuming the new behavior is wrong.

## 2026-05-04 Full Improvement Tranche Closeout
- Do not bind global commands to plain `Shift+letter` in a text-heavy operator app; those chords compete with ordinary capitalization and make the interface feel hostile during note-taking.
- Visual snapshot updates are expected when archive row content changes, but they should follow targeted behavior assertions for the new badges and controls.
- Default search presets are safest as a merge helper, not as one-time settings seed data, because stored operator preferences should survive while new canonical presets still appear.
- Evidence-quality signals are more useful when they show concrete counts and missing pieces than when they hide behind generic “complete” labels.

## 2026-05-05 Workbench Execution Lanes
- A backend route is not “implemented in the product” until the workbench gives operators a truthful way to execute it, see the result, and recover from failure.
- Preview-gated mutation controls need tests for the disabled state as much as the success state; otherwise cleanup can drift from “inspect first” into a one-click destructive path.
- Snoozed and acknowledged alerts are different operator states, so active counts should exclude future-snoozed findings while still keeping the finding visible.
- Count-only replay/correlation summaries are not enough for incident review; even a small list of steps, nodes, edges, and local jump buttons makes the evidence inspectable without widening authority.

## 2026-05-08 Monitoring Import And Capability Registry
- Local imports need an explicit operator confirmation boundary; turning pasted monitoring decisions into notes or handoffs should never happen as a passive sync side effect.
- Capability manifests should replace earlier defaults by id, not merge into them, because inheriting a default approval signature can accidentally turn a malformed local override into an approved live action.
- Incident action availability and execution gates must read the same registry state; otherwise the UI can imply an action is usable while the API correctly refuses it.
- Full-page mobile visual baselines are expected to move when new operator panels are added, but only after a screenshot check confirms the additional height is clean flow rather than overlap.

## 2026-05-09 Process Swarm Compatibility Closeout
- iCloud workspace paths can break bundler aliases when URL pathnames are used directly; use `fileURLToPath(...)` for module aliases that must survive spaces and tildes.
- Root workspace builds need explicit dependency order when a downstream desktop package checks for another package's built web artifacts.
- Process Swarm compatibility is safest when it reuses an existing operator-note ingress instead of adding a parallel heartbeat authority path.
