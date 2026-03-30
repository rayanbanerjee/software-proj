# Change: Core Platform ADRs

## Date

2026-03-30

## Summary

Recorded the remaining near-term platform decisions required to start collaboration, worker, and database implementation without further architectural drift.

## Affected Areas

- `docs/adr/0004-collaboration-stack.md`
- `docs/adr/0005-worker-queue.md`
- `docs/adr/0006-database-orm.md`
- `docs/tasks/TASK-0003-core-platform-adrs.md`
- `docs/process/notion-backlog.csv`

## Key Decisions

- use Hocuspocus with Yjs for the collaboration server baseline
- use BullMQ on Redis for worker queues
- use Prisma as the initial ORM baseline

## Completed Tasks

- `ADR-004`
- `ADR-005`
- `ADR-006`

## Follow-Up

- start `COLLAB-001` against the Hocuspocus baseline
- start `WORK-001` and `DB-001` with the chosen stack assumptions
- record any exceptions that require deviating from Prisma or BullMQ during implementation

## References

- task: `docs/tasks/TASK-0003-core-platform-adrs.md`
- ADRs: `docs/adr/0004-collaboration-stack.md`, `docs/adr/0005-worker-queue.md`, `docs/adr/0006-database-orm.md`

