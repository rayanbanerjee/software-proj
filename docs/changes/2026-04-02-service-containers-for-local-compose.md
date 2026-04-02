# Change: Service Containers For Local Compose

## Date

2026-04-02

## Summary

Extended the local Docker Compose stack to include the API, collaboration service, and worker containers so the backend services can run together with Postgres, Redis, and MinIO.

## Affected Areas

- `infrastructure/docker`
- repo root Docker build context

## Completed Tasks

- `INFRA-003`
- `INFRA-004`
- `INFRA-005`

## Follow-Up

- decide whether the web app should get a Compose service too
- add a migration/bootstrap helper if the backend stack should self-initialize
- revisit image size and Docker layer caching once the workspace stabilizes

## References

- task: `docs/tasks/TASK-0013-service-containers-for-local-compose.md`
