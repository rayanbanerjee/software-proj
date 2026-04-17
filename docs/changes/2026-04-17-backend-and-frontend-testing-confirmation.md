# Change: Backend and Frontend Testing Confirmation

## Date

2026-04-17

## Summary

Confirmed the current backend and frontend automated testing coverage on a fresh clone after dependency installation, and documented the supported test commands and coverage split for contributors.

## Affected Areas

- `README.md`
- `docs/process/local-setup.md`
- `docs/process/testing-guide.md`

## Key Decisions

- treat backend testing as the combined API, collab, and worker suite
- treat frontend testing as web unit coverage plus the existing Playwright E2E setup
- document the exact commands that were run successfully so the team can repeat the same checks without guessing

## Confirmed Commands

- `pnpm --filter @repo/api test`
- `pnpm --filter @repo/collab test`
- `pnpm --filter @repo/worker test`
- `pnpm --filter @repo/web test`
- `pnpm e2e:check`

## Follow-Up

- run full Playwright browser tests regularly once browser installation and local stack boot become standardized for every teammate
- add websocket and end-to-end coverage for newer collaboration behaviors as those flows stabilize
