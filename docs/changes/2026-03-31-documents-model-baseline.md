# Change: Documents Model Baseline

## Date

2026-03-31

## Summary

Added the first Prisma `Document` model to the API schema so document service work has a stable persistence baseline for document metadata and lifecycle fields.

## Affected Areas

- `apps/api/prisma/schema.prisma`

## Key Decisions

- keep the initial model focused on core document metadata only: identifier, title, archive marker, and timestamps
- model archival as a nullable `archivedAt` timestamp so later delete or archive flows can be implemented without hard deletes
- leave ownership and access relationships to the separate memberships task so `DB-003` stays narrowly scoped

## Completed Tasks

- `DB-003`

## Follow-Up

- add the memberships model in `DB-004`
- add migrations and document service endpoints on top of the new schema baseline

## References

- task backlog: `docs/process/task-backlog.md`
- ADR: `docs/adr/0006-database-orm.md`
