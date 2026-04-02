# Change: Auth Session Guard And Current User

## Date

2026-04-02

## Summary

Completed the first protected auth flow by verifying API-issued session tokens on requests, enforcing auth on document routes, and exposing the normalized current user through `GET /v1/auth/me`.

## Affected Areas

- `apps/api/src/modules/auth`
- `apps/api/src/modules/documents`
- `apps/api/tests`
- `docs/api`

## Completed Tasks

- `AUTH-005`
- `AUTH-006`
- `AUTH-007`

## Follow-Up

- replace the stub Google validator with real verification
- extend the same session verification contract into the collaboration service for `COLLAB-002`
- decide whether future API modules should use route-level guards or shared plugin registration

## References

- task: `docs/tasks/TASK-0011-auth-session-guard-and-current-user.md`
- ADR: `docs/adr/0007-auth-token-and-session-strategy.md`
