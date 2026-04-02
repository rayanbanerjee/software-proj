# TASK-0020: Collab Reconnect Handling

## Status

Completed

## Goal

Let reconnecting collaborators safely replace a recent disconnected session so live presence state can recover without leaving duplicate session identities behind.

## Scope

- retain disconnected sessions long enough for reconnect attempts
- allow a new connection to claim a prior session id through `lastKnownSessionId`
- keep public presence snapshots limited to currently active collaborators
- document the reconnect query parameter and replacement behavior

## Non-Goals

- full Yjs state-vector merge logic
- browser reconnect UX
- integration-level collab harness coverage

## Dependencies

- Collaboration: `COLLAB-003`, `COLLAB-004`, `COLLAB-005`
- Docs: `DOC-002`, `DOC-004`
- Blockers:

## Implementation Notes

- treat reconnect as a replacement of a disconnected in-memory session entry for the same user
- keep disconnected sessions internal so they can be resumed before timeout cleanup removes them
- continue exposing only active collaborators in stateless presence snapshots

## Progress Log

### 2026-04-02

- added reconnect-aware session replacement in the collab presence manager
- passed `lastKnownSessionId` from the collab handshake into reconnect logic
- updated WebSocket and lifecycle docs to describe the resume path

## Definition of Done

- code merged
- docs updated
- tests pass
