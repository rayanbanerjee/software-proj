# Testing Guide

## Confirmed coverage

This repository currently has working automated coverage across the backend and frontend codebase.

Confirmed on a clean clone on `2026-04-17` after `pnpm install`:

- API tests: `pnpm --filter @repo/api test`
- collab server tests: `pnpm --filter @repo/collab test`
- worker tests: `pnpm --filter @repo/worker test`
- web unit tests: `pnpm --filter @repo/web test`
- E2E setup check: `pnpm e2e:check`

## Current testing split

### Backend

Backend automated coverage currently includes:

- API route and service tests in `apps/api/tests`
- API integration tests in `apps/api/tests/integration`
- collaboration server tests in `apps/collab/tests`
- worker tests in `apps/worker/tests`

Run the backend suites:

```bash
./run.sh test:backend
```

### Frontend

Frontend automated coverage currently includes:

- web unit tests in `apps/web/tests`
- Playwright configuration and E2E shell coverage in `apps/web/tests/e2e`

Run the frontend unit tests:

```bash
./run.sh test:frontend
```

Run Playwright E2E tests:

```bash
./run.sh test:e2e
```

Check that E2E files are present:

```bash
pnpm e2e:check
```

## Notes

- the E2E setup is present and validated, but real browser execution still depends on Playwright browser installation and the local app stack being available
- most backend tests run against the current in-memory or local harness-based flows, which is appropriate for the current prototype state
- `./run.sh check` is the fastest repository-level sanity pass for docs, typecheck, lint, and E2E setup
