# Spec: Authentication Flow

## Status

Draft

## Goal

Define the authentication module boundaries and JWT session contract for the first real auth slice.

## Scope

- API bootstrap responsibilities for auth
- JWT login request and response shape
- initial session issuance strategy and transport

## Interfaces

- `registerAuthModule(app)`: registers auth-related services and route placeholders
- `POST /v1/auth/login`: accepts identity input, issues a signed JWT session, and returns the session payload

## Flow

1. API bootstraps and parses required auth environment variables.
2. Auth module registers the JWT issue-and-verify service.
3. The login endpoint receives a client identity payload with a required email address.
4. On success, the API issues an HMAC-signed JWT session token and sets it in the `collab_session` cookie.
5. The endpoint returns a normalized session payload containing the current user plus issued-at and expiry timestamps.
6. Guards and the current-user endpoint verify the same JWT from the cookie or bearer header.

## Failure Cases

- invalid or empty identity input
- invalid or expired API-issued session tokens during future guard and current-user work

## Open Questions

- whether future auth guards should accept bearer tokens in addition to the primary cookie transport
- whether session renewal should stay login-based or add a dedicated refresh endpoint later
