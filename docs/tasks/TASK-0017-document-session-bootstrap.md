# TASK-0017: Document Session Bootstrap

## Status

Completed

## Goal

Provide a concrete API-backed session bootstrap flow so the web app can ask for document join state before opening the collaboration WebSocket.

## Scope

- add a protected document-session route under the documents module
- return `JoinDocumentSessionResponse` using the authenticated API session token
- include resume metadata and an initial collaborator snapshot in the response
- document the new route and align the WebSocket notes with the preflight flow

## Non-Goals

- persistent collaboration session storage
- awareness broadcasting and multi-user presence fanout
- reconnect cleanup and stale-session eviction

## Dependencies

- Auth: `AUTH-005`, `AUTH-006`
- Docs: `DOC-002`, `DOC-004`
- Collaboration: `COLLAB-002`
- Blockers:

## Implementation Notes

- keep the session bootstrap in the API for now because it already has document authorization and access to the signed session token
- return the caller as the initial collaborator snapshot until shared presence state exists
- preserve the `lastKnownSessionId` field so later reconnect logic can build on a stable contract

## Progress Log

### 2026-04-02

- added `POST /v1/documents/:documentId/sessions`
- returned bootstrap session state plus the collab WebSocket URL
- covered authorized and forbidden join cases in the document tests

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded
