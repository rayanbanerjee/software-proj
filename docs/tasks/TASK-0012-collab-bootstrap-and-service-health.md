# TASK-0012: Collab Bootstrap And Service Health

## Status

Completed

## Goal

Initialize the collaboration service with the chosen Hocuspocus stack and standardize health and readiness endpoints across the platform services.

## Scope

- bootstrap `apps/collab` with a real Hocuspocus server
- add collab env parsing and service tests
- add health and readiness endpoints for collab and worker
- add an API readiness endpoint for consistency

## Non-Goals

- session verification for collaboration joins
- persistence hooks for Yjs documents
- worker queue processing changes beyond readiness reporting

## Dependencies

- ADRs: `ADR-004`
- Specs:
- Blockers:

## Implementation Notes

- keep the initial collab server intentionally minimal and ready for later auth hooks
- use the same `health` and `ready` route naming across services
- keep readiness payloads lightweight and operationally useful

## Progress Log

### 2026-04-02

- added Hocuspocus-based collaboration server bootstrap
- added collab env parsing and tests
- added worker health and readiness server
- aligned API health module with a readiness endpoint

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded
