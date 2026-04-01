# Change: Document Create And List

## Date

2026-04-01

## Summary

Added the first working document service endpoints for creating and listing documents, including owner membership assignment and API documentation for the new routes.

## Affected Areas

- `apps/api/src/modules/documents/index.ts`
- `apps/api/src/modules/documents/service.ts`
- `apps/api/tests/documents.test.ts`
- `docs/api/documents.md`

## Key Decisions

- expose document routes under `/v1/documents`
- create owner membership at the same time as document creation so the create flow already satisfies the ownership requirement
- use an app-scoped in-memory repository for now so the endpoints are executable and testable before full Prisma wiring is added

## Completed Tasks

- `DOCSVC-001`
- `DOCSVC-002`
- `DOCSVC-006`

## Follow-Up

- move the document service onto Prisma-backed persistence
- add metadata, rename, and archive flows on top of the same service boundary

## References

- task backlog: `docs/process/task-backlog.md`
- API notes: `docs/api/README.md`
