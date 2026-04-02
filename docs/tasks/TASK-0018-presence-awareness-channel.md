# TASK-0018: Presence Awareness Channel

## Status

Completed

## Goal

Add a concrete presence-awareness channel in the collab service so active collaborator state is rebroadcast as document presence changes.

## Scope

- track active collaborator connections in the collab service
- broadcast stateless presence snapshots on connect, awareness activity, and disconnect
- add focused tests for the presence manager
- document the stateless presence payload contract

## Non-Goals

- permission downgrade handling
- reconnect resume semantics
- writer-slot coordination

## Dependencies

- Collaboration: `COLLAB-002`, `COLLAB-003`
- Docs: `DOC-002`, `DOC-004`
- Blockers:

## Implementation Notes

- use an in-memory presence registry keyed by document and connection session id
- keep the payload transport-level and lightweight rather than mirroring the full API bootstrap response
- use Hocuspocus stateless broadcast for the high-level presence snapshot layer

## Progress Log

### 2026-04-02

- added the collab presence manager and stateless snapshot builder
- wired presence broadcasts into connect, awareness update, and disconnect hooks
- documented the presence snapshot payload in the WebSocket API notes

## Definition of Done

- code merged
- related docs updated
- tests pass
