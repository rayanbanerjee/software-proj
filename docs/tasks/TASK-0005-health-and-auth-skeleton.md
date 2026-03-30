# TASK-0005: Health And Auth Skeleton

## Status

Completed

## Goal

Formalize the API health endpoint and introduce the first auth module boundary, including a Google token validation stub behind a replaceable abstraction.

## Scope

- add a dedicated health route registration
- add auth module registration
- implement a Google token validator abstraction and stub
- add tests and docs for the current behavior

## Non-Goals

- implementing OAuth callback flow
- issuing sessions or cookies
- calling Google APIs in this batch

## Dependencies

- ADRs: `docs/adr/0002-api-framework.md`
- Specs: `docs/specs/authentication-flow.md`
- Blockers:

## Implementation Notes

- the auth module stays intentionally small so later work can extend it without refactoring the app bootstrap
- the token validator is a stub, not a real verifier
- the health endpoint should be treated as part of the stable service surface from now on

## Progress Log

### 2026-03-30

- moved health handling into a dedicated route module
- added auth module registration to the Fastify app
- added a Google token validator abstraction and stub implementation
- added tests for health and validator behavior

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded

