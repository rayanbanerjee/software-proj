# Change: Collab Reconnect Handling

## Date

2026-04-02

## Summary

Added reconnect-aware session replacement in the collab layer so a client can resume from a recent disconnected session id instead of creating duplicate presence entries.

## Affected Areas

- `apps/collab/src/awareness`
- `apps/collab/src/auth`
- `apps/collab/src/server.ts`
- `apps/collab/tests`
- `docs/api`
- `docs/specs`

## Completed Tasks

- `COLLAB-009`

## Follow-Up

- add service-level collaboration harness coverage
- wire browser reconnect UX to the new `lastKnownSessionId` behavior
- build state-vector based resync on top of the reconnect path

## References

- task: `docs/tasks/TASK-0020-collab-reconnect-handling.md`
- WebSocket doc: `docs/api/websocket-events.md`
- spec: `docs/specs/document-session-lifecycle.md`
