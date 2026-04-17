# Change: Local Run Workflow and Setup Refresh

## Date

2026-04-17

## Summary

Added a root `run.sh` helper for the common local workflow and rewrote the setup guidance so contributors can start the stack, run checks, and understand the current backend and frontend testing coverage more quickly.

## Affected Areas

- `run.sh`
- `README.md`
- `docs/process/local-setup.md`

## Key Decisions

- keep `run.sh` as a thin wrapper around the existing pnpm scripts and infrastructure helpers
- document backend and frontend test coverage separately so the team can quickly see what is already automated
- centralize the detailed local setup guide under `docs/process` while keeping the README focused on quick start commands

## Follow-Up

- add real Playwright execution guidance once browser install and seed flow are fully standardized
- fold future auth and AI setup details into the local setup guide as those workflows stabilize
