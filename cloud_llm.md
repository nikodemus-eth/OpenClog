# Cloud LLM Log

## Purpose
Track cloud model usage and cloud-boundary decisions.

## 2026-05-02 Bootstrap Intent
- OpenClog itself does not call cloud LLM APIs directly in the MVP.
- Cloud-backed OpenClaw activity may appear only as redacted Gateway-derived journal entries.

## 2026-05-02 MVP Closeout
- OpenClog does not call cloud LLM APIs directly.
- Any cloud model activity remains outside this app unless it arrives from OpenClaw Gateway and is normalized, redacted, hashed, and journaled.
- No closeout logs claim cloud LLM activity from fixture data.

## 2026-05-02 Live Flow Follow-Up
- The observed `pong` was live OpenClaw activity delivered through Gateway and journaled by OpenClog.
- OpenClog still makes no direct cloud LLM API calls.
- Closeout evidence distinguishes the live Gateway response from deterministic fixture tests.

## 2026-05-02 Five-Theme UI Refinement
- No cloud LLM API calls were added for theme generation, copy cleanup, or accessibility verification.
- Local SVG/CSS backgrounds are deterministic assets, not generated or fetched cloud media.
- Fixture-based Playwright checks remain separate from live Gateway behavior.

## 2026-05-02 Interaction Refinement
- No cloud LLM API calls were added for the interaction work.
- Tool-call visibility, approval choices, archive navigation, and live event toasts operate on public OpenClog API data.
- Fixture-based tests still do not claim cloud activity; live activity must arrive through OpenClaw Gateway and the backend journal path.

## 2026-05-02 Theme Families Expansion
- No cloud LLM API calls were added for theme generation, asset creation, browser-visible redaction, or visual verification.
- The expanded theme catalog is implemented with local TypeScript, CSS, and SVG assets.
- Fixture-driven E2E and visual tests remain separate from live OpenClaw Gateway verification.

## 2026-05-03 Stabilization And Refactor
- No cloud LLM API calls were added for product-copy cleanup, event grouping, redaction reason metadata, Dyslexia Friendly polish, or visual snapshot refreshes.
- Browser-visible previews, grouped summaries, and safety checks are deterministic local code paths.
- Deterministic tests still use fixtures and do not claim live cloud activity; live Gateway verification failed closed with `device identity required`.

## 2026-05-03 Stitch Operator Shell Integration
- No cloud LLM API calls were added for the Stitch shell integration, visual inspection, snapshot refresh, or refactor.
- Stitch-provided remote-looking design assets were not fetched or embedded; the implementation uses local CSS, lucide icons, and deterministic UI markup.
- Deterministic verification remains fixture-based, and the live OpenClaw Gateway probe failed closed with `device identity required`.

## 2026-05-03 Stitch Fidelity Correction
- No cloud LLM API calls were added for the fidelity correction.
- Stitch screenshots remained local visual references only; no remote image, font, script, or generated asset URL was fetched or embedded.
- Deterministic Playwright fixtures remain separate from any live OpenClaw Gateway activity.

## 2026-05-03 Gateway Device Auth And Shell Shortcuts
- No cloud LLM provider, remote inference endpoint, API key, or hosted model dependency was added for the Gateway auth fix or shortcut repair.
- Device-auth signing uses local filesystem identity material and the local OpenClaw Gateway token on the backend.
- Verification remained local plus the explicit live loopback Gateway probe.
