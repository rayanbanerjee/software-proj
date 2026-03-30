# Change: Local Infra Bootstrap

## Date

2026-03-30

## Summary

Added a concrete local infrastructure bootstrap using Docker Compose plus helper scripts so the project has a repeatable backing-services setup.

## Affected Areas

- `infrastructure/docker/docker-compose.yml`
- `infrastructure/scripts`
- `infrastructure/docker/README.md`
- `docs/process/notion-backlog.csv`

## Completed Tasks

- `INFRA-001`
- `INFRA-002`
- `INFRA-006`
- `INFRA-007`

## Follow-Up

- add API, collab, and worker service containers later
- add service-specific seed/bootstrap commands once application modules mature

## References

- task: `docs/tasks/TASK-0007-local-infra-bootstrap.md`

