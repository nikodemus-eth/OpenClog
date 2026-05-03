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
