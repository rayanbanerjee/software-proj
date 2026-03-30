# TASK-0007: Local Infra Bootstrap

## Status

Completed

## Goal

Provide a standard local infrastructure bootstrap for development so agents and humans can start the required backing services consistently.

## Scope

- add Docker Compose for PostgreSQL, Redis, and object storage
- add helper scripts for starting and stopping local infrastructure
- document the expected local bootstrap workflow

## Non-Goals

- adding API, collab, or worker service containers
- provisioning production infrastructure
- writing deployment manifests

## Dependencies

- ADRs: `docs/adr/0006-database-orm.md`
- Specs:
- Blockers:

## Implementation Notes

- MinIO is used as the local object storage stand-in
- service credentials stay development-only and match the `.env.example` defaults where possible
- helper scripts are thin wrappers around Docker Compose commands

## Progress Log

### 2026-03-30

- added compose file for Postgres, Redis, and MinIO
- added start, stop, and logs helper scripts
- replaced the infra placeholder README with real setup guidance

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded

