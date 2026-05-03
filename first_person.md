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
