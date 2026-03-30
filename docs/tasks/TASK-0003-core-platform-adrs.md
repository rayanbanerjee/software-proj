# TASK-0003: Core Platform ADRs

## Status

Completed

## Goal

Decide the collaboration stack, worker queue framework, and database access layer so the next implementation tasks can proceed with stable assumptions.

## Scope

- decide the collaboration gateway stack
- decide the background job queue framework
- decide the ORM or database access layer

## Non-Goals

- implementing the collaboration server
- implementing worker jobs
- adding database schema or migrations

## Dependencies

- ADRs: `docs/adr/0004-collaboration-stack.md`, `docs/adr/0005-worker-queue.md`, `docs/adr/0006-database-orm.md`
- Specs:
- Blockers:

## Implementation Notes

- these decisions unblock `COLLAB-001`, `WORK-001`, and `DB-001`
- the selected stack favors implementation speed and alignment with the system design document over maximal abstraction
- the choices keep the first version friendly to a small team and to agent-driven incremental work

## Progress Log

### 2026-03-30

- selected Hocuspocus plus Yjs for collaboration
- selected BullMQ on Redis for background jobs
- selected Prisma as the ORM baseline

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded

