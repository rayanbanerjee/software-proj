# Spec: Authentication Flow

## Status

Draft

## Goal

Define the initial authentication module boundaries and the browser-to-API Google sign-in contract.

## Scope

- API bootstrap responsibilities for auth
- Google token validation abstraction
- web Google Identity Services bootstrap
- auth callback request and response shape
- initial session issuance strategy and transport

## Interfaces

- `registerAuthModule(app)`: registers auth-related services and route placeholders
- `createGoogleTokenValidator(config)`: returns a validator implementation for Google ID tokens
- `POST /v1/auth/callback`: validates the Google token, issues a signed session, and returns the session payload
- `GoogleSignInPanel`: loads Google Identity Services in the web app and exchanges the returned ID token with the API

## Data Model

- `GoogleTokenClaims`
  - `subject`
  - `email`
  - `emailVerified`
  - `name`
  - `picture`
  - `audience`

## Flow

1. The web auth page loads Google Identity Services with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
2. Google returns an ID token to the browser after successful sign-in.
3. The web client posts that token to `POST /v1/auth/callback`.
4. API bootstraps and parses required auth environment variables.
5. Auth module registers a token validator implementation.
6. The callback validates the token against Google while enforcing the configured `GOOGLE_CLIENT_ID` audience.
7. On success, the API issues an HMAC-signed session token and sets it in the `collab_session` cookie.
8. The callback returns a normalized session payload containing the current user plus issued-at and expiry timestamps.

## Failure Cases

- invalid or empty token input
- audience mismatch against configured `GOOGLE_CLIENT_ID`
- browser origin mismatch against configured `WEB_ORIGIN`
- invalid or expired API-issued session tokens during future guard and current-user work
- downstream Google verification failures

## Open Questions

- whether future auth guards should accept bearer tokens in addition to the primary cookie transport
- whether session renewal should stay callback-based or add a dedicated refresh endpoint later
