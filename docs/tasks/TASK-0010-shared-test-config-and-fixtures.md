# TASK-0010: Shared Test Config And Fixtures

## Status

Completed

## Goal

Reduce duplicated test setup across the repository by adding shared Vitest configuration helpers and reusable fixture factories.

## Scope

- add shared Vitest config utilities
- add shared environment helpers for API tests
- expand reusable fixture factories in `packages/test-fixtures`
- refactor representative tests to use the shared helpers

## Non-Goals

- migrating every test in the repository in one pass
- adding browser or E2E-specific test harnesses
- changing application behavior

## Dependencies

- ADRs:
- Specs:
- Blockers:

## Implementation Notes

- keep the helpers lightweight and framework-agnostic where possible
- the shared config should support both top-level tests and app-level tests
- fixture factories should return plain objects so they are easy to adapt to Prisma, HTTP, or UI tests

## Progress Log

### 2026-03-31

- added shared Vitest config helpers
- added shared env snapshot helpers for tests
- expanded test fixture factories
- refactored API tests to use the new helpers

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded

