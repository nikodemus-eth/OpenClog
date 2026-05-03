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
