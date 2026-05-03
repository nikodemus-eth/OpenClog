# Local LLM Log

## Purpose
Track local model usage, local-only execution boundaries, and future local LLM integration notes.

## 2026-05-02 Bootstrap Intent
- OpenClog does not require a local LLM for the MVP.
- Any future local LLM path must be explicit, authentic, and documented before it is presented as active.

## 2026-05-02 MVP Closeout
- No local LLM runtime was invoked by OpenClog.
- The MVP leaves local model work as a future explicit integration, separate from Gateway journal ingestion and composer forwarding.
- The app must not present fixture responses as local model activity.

## 2026-05-02 Live Flow Follow-Up
- The live `ping`/`pong` flow came from OpenClaw through Gateway, not from a local LLM runtime owned by OpenClog.
- OpenClog still does not invoke a local model directly.
- Future local model activity must remain separate from Gateway-derived journal ingestion unless an explicit integration is added.

## 2026-05-02 Five-Theme UI Refinement
- No local LLM runtime was added for the theme work.
- The five-theme UI only changes presentation, labels, focus behavior, and static decorative assets.
- Accessibility and visual tests use deterministic fixtures, not simulated local model activity.

## 2026-05-02 Interaction Refinement
- No local LLM runtime was added for tool-call filtering, Agent Activity, approvals, archive navigation, or live event toasts.
- Agent Activity summaries are derived from sanitized Gateway session metadata or selected-day journal entries, not from a local model.
- The live event toast behavior navigates to existing journal entries and does not synthesize model responses.

## 2026-05-02 Theme Families Expansion
- No local LLM runtime was added for the 27-theme expansion.
- Theme labels, tokens, backgrounds, and previews are deterministic code/assets in the repo.
- Browser-visible event previews are redacted and summarized locally rather than interpreted by a model.

## 2026-05-03 Stabilization And Refactor
- No local LLM runtime was added for timeline grouping, browser-visible safety metadata, theme metadata, contrast polish, or pending approval actionability.
- Group summaries and redaction reasons are deterministic local logic, not model-generated interpretations.
- Agent Activity and OpenClog timeline display continue to rely on sanitized Gateway/journal data rather than a local model.

## 2026-05-03 Stitch Operator Shell Integration
- No local LLM runtime was added for the Stitch shell integration, visual snapshot refresh, shell navigation, or asset-safety checks.
- The local operator avatar, backgrounds, and shell controls are deterministic UI assets and focus actions.
- Timeline and diagnostics content still comes from sanitized OpenClog API state and local fixture data during deterministic tests, not from a local model.

## 2026-05-03 Stitch Fidelity Correction
- No local LLM runtime was added for the fidelity correction.
- The revised shell, rail styling, composer treatment, approval panel placement, and visual baselines are deterministic frontend code and Playwright artifacts.
- No model-generated local activity is presented as OpenClog or OpenClaw activity.
