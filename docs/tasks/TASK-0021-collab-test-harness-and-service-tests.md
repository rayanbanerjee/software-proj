# TASK-0021: Collab Test Harness And Service Tests

## Status

Completed

## Goal

Create a reusable collaboration test harness and use it to cover the main collab lifecycle hooks at the service level.

## Scope

- add a collab test harness for signed session setup and hook payload construction
- add a lifecycle test that drives connect, awareness, reconnect, and disconnect through the real server hook configuration
- record the testing and collaboration task completions in the backlog

## Non-Goals

- browser E2E coverage
- multi-process websocket integration
- full sync-state reconnect testing

## Dependencies

- Testing: `TEST-001`
- Collaboration: `COLLAB-001`, `COLLAB-009`
- Blockers:

## Implementation Notes

- keep the harness in `apps/collab/tests` so later collab tasks can reuse the same hook-driving helpers
- test the configured Hocuspocus hook functions instead of only isolated helpers
- treat this as service-level coverage rather than transport-level websocket integration

## Progress Log

### 2026-04-02

- added a reusable collab harness for signed sessions, mock documents, and hook payloads
- added lifecycle coverage for connect, awareness, reconnect, and disconnect
- updated backlog tracking for the collab testing slice

## Definition of Done

- code merged
- tests pass
- backlog updated
