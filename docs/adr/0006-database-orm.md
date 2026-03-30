# ADR 0006: Database ORM

## Status

Accepted

## Context

The API service needs a database access strategy before `DB-001` and the first persistent modules can be implemented. The main decision is whether to optimize for a lower-level query builder or for faster schema iteration and developer ergonomics.

## Decision

Use Prisma as the initial ORM and schema management baseline.

## Consequences

- schema definition, migrations, and generated client access stay in one workflow
- the team gets fast iteration on relational models for users, documents, memberships, revisions, and AI requests
- Prisma's generated client is easy for a small TypeScript team to adopt quickly
- some advanced SQL patterns may eventually require raw queries or Prisma workarounds if performance-sensitive paths grow more complex

## Links

- Task: `docs/tasks/TASK-0003-core-platform-adrs.md`
- Spec:
- Related ADR: `docs/adr/0001-monorepo.md`

