# ADR 0002: API Framework

## Status

Accepted

## Context

The repository needs a concrete API framework choice before `API-001`, auth work, database setup, and request lifecycle tooling can proceed. The main candidates are NestJS and Fastify.

## Decision

Use Fastify as the API framework baseline.

## Consequences

- setup remains lightweight for an early-stage student project
- the team keeps direct control over module structure instead of adopting a larger framework abstraction immediately
- Fastify's performance characteristics and plugin model fit the expected API shape well
- more architectural discipline will be required because Fastify imposes less structure than NestJS

## Links

- Task: `docs/tasks/TASK-0002-framework-decisions-and-test-foundation.md`
- Spec:
- Related ADR: `docs/adr/0001-monorepo.md`

