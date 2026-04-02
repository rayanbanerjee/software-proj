# TASK-0019: Presence Timeout Cleanup

## Status

Completed

## Goal

Ensure stale collaboration sessions are removed from presence snapshots when they stop refreshing for too long.

## Scope

- add timeout-based stale-session pruning to the collab presence manager
- run a periodic sweep in the collab server and rebroadcast snapshots after cleanup
- add test coverage for stale-session pruning
- document the cleanup behavior in the collab API notes and lifecycle spec

## Non-Goals

- reconnect restoration
- token refresh or heartbeat protocol redesign
- writer-slot cleanup

## Dependencies

- Collaboration: `COLLAB-004`
- Docs: `DOC-002`, `DOC-004`
- Blockers:

## Implementation Notes

- keep cleanup in-memory for now because presence state is still service-local
- use `lastSeenAt` from awareness activity as the timeout source of truth
- rebroadcast the snapshot after pruning so clients converge on the new active set

## Progress Log

### 2026-04-02

- added stale-session pruning to the presence manager
- scheduled periodic cleanup in the collab server
- extended presence tests and documentation for timeout cleanup behavior

## Definition of Done

- code merged
- docs updated
- tests pass
