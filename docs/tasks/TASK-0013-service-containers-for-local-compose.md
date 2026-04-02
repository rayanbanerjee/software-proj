# TASK-0013: Service Containers For Local Compose

## Status

Completed

## Goal

Extend the local Docker Compose setup so the API, collaboration service, and worker can run alongside Postgres, Redis, and MinIO in a single stack.

## Scope

- add Compose service definitions for `api`, `collab`, and `worker`
- add a shared development Dockerfile for the monorepo workspace
- update infrastructure docs for the full-stack local workflow

## Non-Goals

- adding the web app container
- production-grade image optimization
- automatic database migrations during container startup

## Dependencies

- ADRs:
- Specs:
- Blockers:

## Implementation Notes

- keep the image simple and aligned with the workspace `dev` commands
- use service-to-service hostnames in container env vars
- document the tradeoff that migrations still run manually

## Progress Log

### 2026-04-02

- added a shared development Dockerfile for workspace services
- added Compose services for `api`, `collab`, and `worker`
- updated the infrastructure README with the new stack behavior

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded
