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
