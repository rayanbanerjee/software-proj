# Change: Local DB Workflow And Seed

## Date

2026-03-31

## Summary

Added a usable local Prisma migration workflow and a demo seed script so developers can move the schema forward locally and populate baseline users, documents, and memberships for manual testing.

## Affected Areas

- `apps/api/package.json`
- `apps/api/prisma/seed.mjs`
- `infrastructure/docker/README.md`

## Key Decisions

- expose migration and seed steps as API package scripts so local setup stays consistent across contributors
- keep the seed data idempotent by using Prisma upserts instead of one-shot inserts
- seed only the currently supported baseline entities: users, documents, and memberships

## Completed Tasks

- `DB-010`
- `DB-011`

## Follow-Up

- add AI, export, and audit seed data once those flows have executable endpoints
- commit real Prisma migration files once the team is ready to persist the current schema history

## References

- task backlog: `docs/process/task-backlog.md`
- local infra: `infrastructure/docker/README.md`
