# TASK-0002: Framework Decisions And Test Foundation

## Status

Completed

## Goal

Record the immediate framework decisions needed to unblock implementation and establish a real repository-level test harness with passing placeholder coverage.

## Scope

- decide the API framework direction
- decide the web app setup direction
- choose and configure the initial test framework
- add passing placeholder tests at the repository level

## Non-Goals

- implementing the full API service
- converting `apps/web` into a real Next.js app
- adding subsystem-specific integration or E2E tests

## Dependencies

- ADRs: `docs/adr/0002-api-framework.md`, `docs/adr/0003-web-framework.md`
- Specs:
- Blockers:

## Implementation Notes

- the initial scaffold already established TypeScript and workspace tooling
- Fastify is a better fit than NestJS for the current stage because it keeps service setup lightweight
- Next.js App Router remains the intended web framework, but full wiring is deferred to `WEB-001`
- Vitest is used as the initial test runner because it is lightweight and integrates cleanly with TypeScript

## Progress Log

### 2026-03-30

- added API and web framework ADRs
- configured Vitest at the repository root
- added passing placeholder smoke tests

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded

