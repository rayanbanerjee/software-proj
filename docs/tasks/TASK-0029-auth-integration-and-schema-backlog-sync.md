# TASK-0029 Auth Integration And Schema Backlog Sync

## Summary

Close the remaining auth integration gap by adding a full callback-to-session integration flow, and sync the backlog for the already-landed Prisma invitation and revision models.

## Scope

- add an auth integration test that covers callback, cookie auth, and bearer reuse
- keep the test inside the reusable integration harness path
- mark `DB-005` and `DB-006` as done because the Prisma schema already contains `Invitation` and `Revision`

## Out Of Scope

- real Google verification
- database-backed auth sessions
- additional auth endpoints beyond the current callback and current-user flow

## Completion

- completed `AUTH-008`
- synced `DB-005`
- synced `DB-006`
