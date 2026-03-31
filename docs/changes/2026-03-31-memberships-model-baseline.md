# Change: Memberships Model Baseline

## Date

2026-03-31

## Summary

Added the first Prisma memberships model and connected it to users and documents so future document creation, sharing, and authorization work has a relational access baseline.

## Affected Areas

- `apps/api/prisma/schema.prisma`

## Key Decisions

- represent document access as a dedicated `DocumentMembership` join model between users and documents
- keep document role values explicit in the schema with a Prisma `DocumentRole` enum
- enforce one membership per user and document pair with a unique constraint and add a user lookup index for common access queries

## Completed Tasks

- `DB-004`

## Follow-Up

- create owner membership transactionally during document creation in `DOCSVC-001` and `DOCSVC-006`
- add sharing endpoints on top of the new membership baseline

## References

- task backlog: `docs/process/task-backlog.md`
- ADR: `docs/adr/0006-database-orm.md`
