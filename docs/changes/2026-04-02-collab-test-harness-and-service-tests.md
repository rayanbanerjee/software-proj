# Change: Collab Test Harness And Service Tests

## Date

2026-04-02

## Summary

Added a reusable collaboration test harness and a service-level lifecycle test that drives the configured collab hooks through connect, awareness, reconnect, and disconnect flows.

## Affected Areas

- `apps/collab/tests`
- `docs/process`

## Completed Tasks

- `TEST-004`
- `COLLAB-010`

## Follow-Up

- add reconnect integration coverage once the sync path is implemented
- extend the harness for permission downgrade and writer-slot scenarios
- decide whether a real websocket integration layer is needed beyond the current hook-driven tests

## References

- task: `docs/tasks/TASK-0021-collab-test-harness-and-service-tests.md`
- collab server: `apps/collab/src/server.ts`
