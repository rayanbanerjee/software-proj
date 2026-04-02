# Change: Collab Bootstrap And Service Health

## Date

2026-04-02

## Summary

Bootstrapped the collaboration service on Hocuspocus and added consistent health and readiness endpoints across the API, collaboration, and worker services.

## Affected Areas

- `apps/collab`
- `apps/worker`
- `apps/api/src/modules/health`
- `docs/api`

## Completed Tasks

- `COLLAB-001`
- `OPS-005`

## Follow-Up

- add collab session verification for `COLLAB-002`
- attach document persistence and load hooks to the collab service
- decide whether readiness should later verify downstream dependencies like Redis and Postgres

## References

- task: `docs/tasks/TASK-0012-collab-bootstrap-and-service-health.md`
- ADR: `docs/adr/0004-collaboration-stack.md`
