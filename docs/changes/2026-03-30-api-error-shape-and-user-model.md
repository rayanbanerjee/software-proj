# Change: API Error Shape And User Model

## Date

2026-03-30

## Summary

Added the standard API error envelope, improved the user model baseline for Google-auth-backed identity, and introduced the documents module registration point.

## Affected Areas

- `apps/api/src/common`
- `apps/api/src/modules/auth`
- `apps/api/src/modules/documents`
- `apps/api/prisma/schema.prisma`
- `packages/shared-types/src/index.ts`
- `docs/api/error-responses.md`

## Completed Tasks

- `API-005`
- `API-007`
- `DB-002`
- `AUTH-003`

## Follow-Up

- implement document endpoints on top of the new module boundary
- add database migrations for expanded models once the schema stabilizes
- add auth route handlers that use the normalized user profile type

## References

- task: `docs/tasks/TASK-0006-api-error-shape-and-user-model.md`
- api doc: `docs/api/error-responses.md`

