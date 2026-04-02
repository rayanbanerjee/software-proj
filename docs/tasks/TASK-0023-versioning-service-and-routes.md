# TASK-0023: Versioning Service And Routes

## Status

Completed

## Goal

Turn the versions module into a working in-memory API slice with revision listing, detail lookup, and rollback behavior.

## Scope

- implement the revision creation policy service baseline
- add revision list and detail endpoints
- add rollback endpoint with owner-only permission enforcement
- add API tests and durable docs for the versions surface

## Non-Goals

- persistent revision storage
- diff endpoint behavior
- collab rollback push propagation

## Dependencies

- Docs: `DOC-007`
- Auth and document modules already in place
- Blockers:

## Implementation Notes

- seed a baseline revision lazily from current document metadata
- keep rollback forward-only by creating a new head revision instead of mutating history
- use in-memory revision records until the Prisma-backed revision model lands

## Progress Log

### 2026-04-02

- implemented the in-memory versions service
- added list, detail, and rollback routes
- added versions API tests and docs

## Definition of Done

- code merged
- tests pass
- docs updated
