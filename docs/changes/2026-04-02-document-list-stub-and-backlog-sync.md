# Change: Document List Stub And Backlog Sync

## Date

2026-04-02

## Summary

Added a real stubbed create-document action to the web list shell and corrected the backlog to mark several already-landed document, sharing, and package tasks as complete.

## Affected Areas

- `apps/web/src/components/documents`
- `apps/web/src/lib`
- `apps/web/tests`
- `docs/process`

## Completed Tasks

- `WEB-006`

## Backlog Sync

- `DOC-005`
- `PKG-001`
- `PKG-005`
- `PKG-006`
- `PKG-009`
- `DB-003`
- `DB-004`
- `DOCSVC-001`
- `DOCSVC-002`
- `DOCSVC-003`
- `DOCSVC-004`
- `DOCSVC-005`
- `DOCSVC-006`
- `DOCSVC-007`
- `SHARE-001`
- `SHARE-002`
- `SHARE-003`
- `SHARE-004`
- `SHARE-005`
- `SHARE-006`
- `SHARE-007`

## Follow-Up

- replace the local draft insertion with the real create-document API flow
- add an explicit browser-side redirect after create once persisted document IDs exist
- continue on the collaboration join flow and permission push path

## References

- task: `docs/tasks/TASK-0016-document-list-stub-and-backlog-sync.md`
- web shell: `apps/web/src/components/documents/document-list-shell.tsx`
