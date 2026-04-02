# TASK-0016: Document List Stub And Backlog Sync

## Status

Completed

## Goal

Unblock the web document list with a concrete create-document stub and bring the task source of truth back in line with work that was already landed in the repo.

## Scope

- implement the `WEB-006` create-document stub on the list shell
- add focused coverage for the stubbed draft-record behavior
- mark stale completed package, document-service, sharing, and docs tasks as done in the Notion backlog
- regenerate the Notion board import after the backlog update

## Non-Goals

- wiring the web app to the real create-document API endpoint
- replacing the in-memory document and sharing implementations with Prisma persistence
- implementing the collaboration join flow

## Dependencies

- Web: `WEB-005`
- Document Service: `DOCSVC-001`
- Docs: change notes that already recorded the document and sharing slices
- Blockers:

## Implementation Notes

- keep the create flow explicitly shell-level so users can exercise the entry point without pretending persistence exists
- use the existing shell data model instead of introducing a separate draft-only shape
- only mark backlog items done when code or docs already in the repo clearly satisfy the definition of done

## Progress Log

### 2026-04-02

- added a local draft creation button and section to the document list shell
- added a helper for deterministic shell draft records and covered it in the web test suite
- synced stale backlog statuses for document DTO, authz, UI package, document service, sharing, and permission-propagation work

## Definition of Done

- code merged
- related docs updated
- Notion import refreshed
