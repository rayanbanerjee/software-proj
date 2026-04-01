# TASK-0009: Web Bootstrap And Auth Foundations

## Status

Completed

## Goal

Decide the remaining auth and snapshot architecture details needed for the next implementation slice, add the first container diagram source, turn `apps/web` into a real Next.js app, and land the first working auth callback endpoint.

## Scope

- accept `ADR-007` for auth token and session strategy
- accept `ADR-008` for snapshot storage format
- add the initial container diagram source for the current service architecture
- convert `apps/web` from a TSX placeholder into a runnable Next.js App Router app
- implement `AUTH-004` in `apps/api/src/modules/auth`

## Non-Goals

- implementing auth guards, current-user lookup, or full session verification middleware
- implementing collaboration persistence, revision storage, or rollback flows
- building document routes and editor feature screens beyond the initial web application shell

## Dependencies

- ADRs: `docs/adr/0003-web-framework.md`, `docs/adr/0007-auth-token-and-session-strategy.md`, `docs/adr/0008-snapshot-storage-format.md`
- Specs: `docs/specs/authentication-flow.md`
- Blockers:

## Implementation Notes

- auth callback behavior should stay compatible with the existing stub Google token validator so the endpoint can be verified without external OAuth calls
- the chosen auth strategy should be concrete enough for `AUTH-005`, `AUTH-006`, `AUTH-007`, and `COLLAB-002` to build on directly
- the container diagram should reflect only already accepted architecture decisions plus the first real web/api runtime boundaries

## Progress Log

### 2026-04-02

- started ADR work for auth sessions and snapshot storage
- confirmed the requested task rows are unblocked by repo dependencies
- accepted `ADR-007` for signed cookie-backed API sessions
- accepted `ADR-008` for binary Yjs snapshot storage
- added the first Mermaid container diagram source under `docs/diagrams`
- converted `apps/web` into a real Next.js App Router app with working package scripts
- implemented `POST /v1/auth/callback` with signed session issuance, cookie setting, docs, and tests

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded
