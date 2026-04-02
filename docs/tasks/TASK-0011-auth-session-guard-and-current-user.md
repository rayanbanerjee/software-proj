# TASK-0011: Auth Session Guard And Current User

## Status

Completed

## Goal

Complete the first authenticated session flow by verifying issued session tokens on incoming requests and exposing the normalized current user through the API.

## Scope

- verify HMAC-signed session tokens from cookies and bearer headers
- add reusable auth guard middleware for protected routes
- add `GET /v1/auth/me`
- migrate protected API tests away from test-only identity headers

## Non-Goals

- persistent session storage
- refresh-token rotation
- real Google token verification beyond the current stub

## Dependencies

- ADRs: `ADR-007`
- Specs: `DOC-003`
- Blockers:

## Implementation Notes

- keep cookie transport as the primary browser path
- accept bearer transport for non-browser and test flows
- keep the protected-route contract compatible with later collab token verification

## Progress Log

### 2026-04-02

- added session token verification to the auth session service
- added request guard helpers and current-user request context
- exposed `GET /v1/auth/me`
- migrated documents tests to authenticated session cookies

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded
