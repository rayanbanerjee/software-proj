# Change: Document Session Bootstrap

## Date

2026-04-02

## Summary

Added a protected document-session bootstrap endpoint so clients can fetch join state and the authenticated collaboration WebSocket URL before connecting to the collab service.

## Affected Areas

- `apps/api/src/modules/documents`
- `apps/api/tests`
- `docs/api`

## Completed Tasks

- `COLLAB-003`

## Follow-Up

- add shared presence state once the collab service tracks active collaborators
- implement reconnect cleanup and resume semantics in the collaboration layer
- decide whether session bootstrap should eventually move fully into the collab service

## References

- task: `docs/tasks/TASK-0017-document-session-bootstrap.md`
- spec: `docs/specs/document-session-lifecycle.md`
- API doc: `docs/api/documents.md`
