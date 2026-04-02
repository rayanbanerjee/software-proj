# Change: Presence Timeout Cleanup

## Date

2026-04-02

## Summary

Added timeout-based stale presence cleanup in the collab service so abandoned sessions are removed from stateless collaborator snapshots without waiting for an explicit disconnect.

## Affected Areas

- `apps/collab/src/awareness`
- `apps/collab/src/server.ts`
- `apps/collab/tests`
- `docs/api`
- `docs/specs`

## Completed Tasks

- `COLLAB-005`

## Follow-Up

- add reconnect-aware session restoration
- reuse the timeout cleanup path when permission changes force disconnects
- consider making the timeout configurable if operators need different collaboration tuning

## References

- task: `docs/tasks/TASK-0019-presence-timeout-cleanup.md`
- WebSocket doc: `docs/api/websocket-events.md`
- spec: `docs/specs/document-session-lifecycle.md`
