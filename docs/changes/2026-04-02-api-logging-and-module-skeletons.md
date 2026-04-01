# Change: API Logging And Module Skeletons

## Date

2026-04-02

## Summary

Added shared-logger-backed request logging to the API service and registered the remaining planned API module skeletons so the Fastify app now exposes stable module boundaries for sharing, versions, AI, exports, comments, and audit work.

## Affected Areas

- `apps/api/src/app.ts`
- `apps/api/src/common/logger.ts`
- `apps/api/src/common/request-logging.ts`
- `apps/api/src/modules/ai`
- `apps/api/src/modules/audit`
- `apps/api/src/modules/comments`
- `apps/api/src/modules/exports`
- `apps/api/src/modules/sharing`
- `apps/api/src/modules/versions`
- `apps/api/src/server.ts`
- `apps/api/src/types/fastify.d.ts`
- `apps/api/tests/app.test.ts`
- `apps/api/tests/request-logging.test.ts`

## Key Decisions

- keep the logger abstraction API-local for now so `API-004` can land without taking on the wider cross-service `OPS-001` rollout
- model each skeleton module as a decorated service placeholder to match the existing auth and documents module boundaries
- verify request logging by injecting a spy logger abstraction into the app factory and asserting against a real Fastify request

## Completed Tasks

- `API-004`
- `API-008`
- `API-009`
- `API-010`
- `API-011`
- `API-012`
- `API-013`

## Follow-Up

- extend the shared logger abstraction to the collaboration and worker services when `OPS-001` is completed end to end
- add real route handlers and persistence behind the new module skeletons in their follow-up task batches

## References

- task: `docs/tasks/TASK-0008-api-logging-and-module-skeletons.md`
- backlog: `docs/process/notion-backlog.csv`
- ADR: `docs/adr/0002-api-framework.md`
