# ADR 0005: Worker Queue Framework

## Status

Accepted

## Context

The worker service needs a concrete job queue decision before `WORK-001`, export jobs, and AI request processing can be implemented. The system design document already assumes Redis-backed background coordination.

## Decision

Use BullMQ on top of Redis as the initial worker queue framework.

## Consequences

- the queueing layer matches the existing Redis dependency in the architecture
- retries, delayed jobs, and worker concurrency controls are available without custom job orchestration
- local development remains simple because no new infrastructure is introduced beyond Redis
- the system becomes more tightly coupled to Redis for asynchronous execution paths

## Links

- Task: `docs/tasks/TASK-0003-core-platform-adrs.md`
- Spec:
- Related ADR: `docs/adr/0001-monorepo.md`

