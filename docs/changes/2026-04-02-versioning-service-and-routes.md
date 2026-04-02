# Change: Versioning Service And Routes

## Date

2026-04-02

## Summary

Implemented the first real versions API slice with in-memory revision history, revision listing, revision detail lookup, and owner-only rollback creation.

## Affected Areas

- `apps/api/src/modules/versions`
- `apps/api/tests`
- `docs/api`

## Completed Tasks

- `VER-001`
- `VER-002`
- `VER-003`
- `VER-005`
- `VER-008`

## Follow-Up

- add a diff endpoint stub
- move revisions onto persistent storage
- push rollback events into the collab service

## References

- task: `docs/tasks/TASK-0023-versioning-service-and-routes.md`
- spec: `docs/specs/versioning-model.md`
