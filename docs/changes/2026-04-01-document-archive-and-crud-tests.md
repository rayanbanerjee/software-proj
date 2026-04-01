# Change: Document Archive And CRUD Tests

## Date

2026-04-01

## Summary

Added document archive behavior plus broader CRUD-style tests for the document service endpoints, including owner-only archive enforcement and end-to-end flow coverage.

## Affected Areas

- `apps/api/src/modules/documents/index.ts`
- `apps/api/src/modules/documents/service.ts`
- `apps/api/tests/documents.test.ts`
- `docs/api/documents.md`

## Key Decisions

- implement delete behavior as archive semantics instead of hard deletion
- restrict archive access to owners only
- treat archived documents as hidden from list responses while still retrievable by id for now

## Completed Tasks

- `DOCSVC-005`
- `DOCSVC-007`

## Follow-Up

- move these endpoint tests into a dedicated API integration harness when `TEST-003` is added
- replace the in-memory repository with Prisma-backed persistence

## References

- task backlog: `docs/process/task-backlog.md`
- API doc: `docs/api/documents.md`
