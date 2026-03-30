# Change: Framework Decisions And Test Foundation

## Date

2026-03-30

## Summary

Established the first round of framework decisions and added a real repository-level test harness with passing placeholder tests so later agents can build on stable assumptions.

## Affected Areas

- `docs/adr/0002-api-framework.md`
- `docs/adr/0003-web-framework.md`
- `docs/tasks/TASK-0002-framework-decisions-and-test-foundation.md`
- `vitest.config.mjs`
- `tests/*`
- `package.json`

## Key Decisions

- use Fastify rather than NestJS for the API baseline
- keep Next.js App Router as the web app baseline
- use Vitest for the initial repository-wide test runner

## Completed Tasks

- `ADR-002`
- `ADR-003`
- `TEST-001`
- `FOUND-009`

## Follow-Up

- implement `WEB-001` as a real Next.js app
- implement `API-001` using Fastify
- expand from smoke tests to service-level and integration tests

## References

- task: `docs/tasks/TASK-0002-framework-decisions-and-test-foundation.md`
- ADRs: `docs/adr/0002-api-framework.md`, `docs/adr/0003-web-framework.md`

