# ADR 0004: Collaboration Stack

## Status

Accepted

## Context

The collaboration gateway needs a concrete implementation direction before `COLLAB-001`, session DTO design, and reconnect behavior can be built. The system design document already assumes Yjs-style CRDT collaboration and a WebSocket gateway, but the repository still needs a practical library-level decision.

## Decision

Use Yjs for document CRDT state and Hocuspocus as the initial collaboration server framework over WebSocket.

## Consequences

- the project aligns directly with the design document's CRDT-based model
- Hocuspocus reduces the amount of custom protocol code needed for the first implementation
- awareness, persistence hooks, and auth hooks can be introduced incrementally instead of building a sync server from scratch
- the collaboration layer becomes opinionated around Yjs document flow, which makes future migration to a different CRDT stack more expensive

## Links

- Task: `docs/tasks/TASK-0003-core-platform-adrs.md`
- Spec:
- Related ADR: `docs/adr/0001-monorepo.md`, `docs/adr/0008-snapshot-storage-format.md`
