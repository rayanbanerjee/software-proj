# TASK-0014: Collab Session Verification And WebSocket Docs

## Status

Completed

## Goal

Extend the collaboration service so it verifies API-issued session tokens during connection setup and document the resulting WebSocket contract for later agents.

## Scope

- verify collab connection tokens against the shared signed session format
- require a token during collab connection setup
- add focused tests for collab token verification
- document the WebSocket handshake and message categories

## Non-Goals

- document join-state DTOs
- permission update broadcasts
- persistence-backed document loading

## Dependencies

- ADRs: `ADR-004`, `ADR-007`
- Specs:
- Blockers:

## Implementation Notes

- reuse the API-issued session token format instead of inventing a separate collab token
- keep the first slice query-parameter based so browser and test clients can connect simply
- keep docs explicit about what is implemented now versus deferred

## Progress Log

### 2026-04-02

- added collab session verification helpers
- enforced token presence during collab connection setup
- updated collab env handling to require the shared session secret
- documented the WebSocket handshake and message categories

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded
