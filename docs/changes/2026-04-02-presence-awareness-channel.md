# Change: Presence Awareness Channel

## Date

2026-04-02

## Summary

Added a stateless presence snapshot channel to the collaboration server so clients can observe active collaborators as connections open, send awareness, and disconnect.

## Affected Areas

- `apps/collab/src/awareness`
- `apps/collab/src/server.ts`
- `apps/collab/tests`
- `docs/api`
- `docs/specs`

## Completed Tasks

- `COLLAB-004`

## Follow-Up

- add timeout-driven stale-session cleanup
- connect permission updates so active presence reflects downgraded access
- evolve the snapshot into richer reconnect-aware session state

## References

- task: `docs/tasks/TASK-0018-presence-awareness-channel.md`
- WebSocket doc: `docs/api/websocket-events.md`
- spec: `docs/specs/document-session-lifecycle.md`
