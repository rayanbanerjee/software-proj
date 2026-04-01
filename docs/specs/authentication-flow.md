# Spec: Authentication Flow

## Status

Draft

## Goal

Define the initial authentication module boundaries and callback/session contract for the first real auth slice.

## Scope

- API bootstrap responsibilities for auth
- Google token validation abstraction
- auth callback request and response shape
- initial session issuance strategy and transport

## Interfaces

- `registerAuthModule(app)`: registers auth-related services and route placeholders
- `createGoogleTokenValidator(config)`: returns a validator implementation for Google ID tokens
- `POST /v1/auth/callback`: validates the Google token, issues a signed session, and returns the session payload

## Data Model

- `GoogleTokenClaims`
  - `subject`
  - `email`
  - `emailVerified`
  - `name`
  - `picture`
  - `audience`

## Flow

1. API bootstraps and parses required auth environment variables.
2. Auth module registers a token validator implementation.
3. The auth callback receives a Google ID token from the client.
4. The callback validates that token through the shared validator abstraction instead of depending directly on Google SDK logic.
5. On success, the API issues an HMAC-signed session token and sets it in the `collab_session` cookie.
6. The callback returns a normalized session payload containing the current user plus issued-at and expiry timestamps.
7. Real Google validation can replace the stub without changing the app bootstrap contract.

## Failure Cases

- invalid or empty token input
- audience mismatch against configured `GOOGLE_CLIENT_ID`
- invalid or expired API-issued session tokens during future guard and current-user work
- downstream network failures when real Google validation is introduced later

## Open Questions

- whether future auth guards should accept bearer tokens in addition to the primary cookie transport
- whether session renewal should stay callback-based or add a dedicated refresh endpoint later
