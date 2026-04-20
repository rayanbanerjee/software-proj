# Testing Guide

## Confirmed coverage

This repository currently has working automated coverage across the backend and frontend codebase.

Confirmed on a clean clone on `2026-04-17` after `pnpm install`:

- API tests: `pnpm --filter @repo/api test`
- collab server tests: `pnpm --filter @repo/collab test`
- worker tests: `pnpm --filter @repo/worker test`
- web unit tests: `pnpm --filter @repo/web test`
- E2E setup check: `pnpm e2e:check`
- Playwright browser install command: `./run.sh e2e:install`

## Current testing split

### Backend

Backend automated coverage currently includes:

- API route and service tests in `apps/api/tests`
- API integration tests in `apps/api/tests/integration`
- collaboration server tests in `apps/collab/tests`
- worker tests in `apps/worker/tests`

Collaboration websocket coverage currently includes:

- session-token authentication rejection checks
- connect and reconnect hook behavior
- presence snapshot updates
- writer-slot snapshot updates
- stateless permission and rollback event rebroadcasts

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
./run.sh e2e:install
./run.sh db:seed
./run.sh test:e2e
```

Check that E2E files are present:

```bash
pnpm e2e:check
```

## Notes

- Playwright browser execution is standardized through `./run.sh e2e:install`; the remaining requirement is having the local stack and web app running
- backend tests now cover filesystem-backed local persistence for document metadata, comments, and export jobs/artifacts
- `./run.sh check` is the fastest repository-level sanity pass for docs, typecheck, lint, and E2E setup
