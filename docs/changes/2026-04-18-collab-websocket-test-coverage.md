# Change: Collab Websocket Test Coverage

## Date

2026-04-18

## Summary

Expanded the collaboration server tests to cover websocket authentication rejection, read-only socket handshakes, and permission-revocation broadcasts that clear presence and writer-slot state.

## Affected Areas

- `apps/collab/tests/websocket-flow.test.ts`
- `docs/process/testing-guide.md`

## Key Decisions

- treat websocket testing as hook-level collaboration coverage instead of waiting for a full browser socket harness
- verify both handshake-time behavior and stateless event rebroadcast behavior
- keep the tests deterministic by using the existing collab harness and in-memory runtime objects

## Follow-Up

- add a higher-level websocket client harness once the team wants browser-to-collab end-to-end coverage
- extend these tests for reconnect state-vector recovery and future conflict-resolution behavior
