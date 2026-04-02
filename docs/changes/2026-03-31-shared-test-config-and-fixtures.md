# Change: Shared Test Config And Fixtures

## Date

2026-03-31

## Summary

Added shared test configuration utilities and reusable fixture factories to reduce duplicated setup across the repository.

## Affected Areas

- `tests/config`
- `packages/test-fixtures/src/index.ts`
- `vitest.config.mjs`
- `apps/api/tests`

## Completed Tasks

- `TEST-002`
- `TEST-006`
- `PKG-008`

## Follow-Up

- migrate remaining API, web, and worker tests onto the shared helpers
- add domain-specific fixtures as more persistence models land

## References

- task: `docs/tasks/TASK-0010-shared-test-config-and-fixtures.md`

