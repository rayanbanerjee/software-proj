# Change: Document Metadata And Rename

## Date

2026-04-01

## Summary

Added document metadata and rename endpoints to the API module, including view and edit permission checks plus tests covering authorized and forbidden flows.

## Affected Areas

- `apps/api/src/modules/documents/index.ts`
- `apps/api/src/modules/documents/service.ts`
- `apps/api/tests/documents.test.ts`
- `docs/api/documents.md`

## Key Decisions

- expose document metadata at `GET /v1/documents/:documentId`
- allow rename when the current user has edit access
- return explicit document-specific 403 and 404 error codes for metadata and rename operations

## Completed Tasks

- `DOCSVC-003`
- `DOCSVC-004`

## Follow-Up

- add archive behavior next on the same service boundary
- replace the in-memory repository with Prisma-backed persistence

## References

- task backlog: `docs/process/task-backlog.md`
- API doc: `docs/api/documents.md`
