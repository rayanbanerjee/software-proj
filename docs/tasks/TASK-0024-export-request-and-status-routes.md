# TASK-0024: Export Request And Status Routes

## Status

Completed

## Goal

Turn the exports module into a working authenticated API slice for export job creation, status lookup, and secure-link response generation.

## Scope

- align export routes with the `/v1/documents/:documentId/exports` API surface
- require document access through the existing auth and documents modules
- add request, status, and download-link tests
- document the exports API contract

## Non-Goals

- persistent export job storage
- artifact download endpoint implementation
- real background worker integration

## Dependencies

- Docs: `DOC-008`
- Auth and documents modules already in place
- Blockers:

## Implementation Notes

- keep export jobs in-memory for now
- expose the typed shared export DTO shape from the API module
- use the current service to return succeeded jobs immediately until queue integration lands

## Progress Log

### 2026-04-02

- rewired exports onto the authenticated `/v1/documents` surface
- added export request, status, and download-link tests
- documented the exports API contract

## Definition of Done

- code merged
- tests pass
- docs updated
