# Spec: Authentication Flow

## Status

Draft

## Goal

Define the initial authentication module boundaries before the real Google callback and session issuance flows are implemented.

## Scope

- API bootstrap responsibilities for auth
- Google token validation abstraction
- current stub behavior and future replacement point

## Interfaces

- `registerAuthModule(app)`: registers auth-related services and route placeholders
- `createGoogleTokenValidator(config)`: returns a validator implementation for Google ID tokens

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
3. Later auth endpoints will call the validator abstraction instead of depending directly on Google SDK logic.
4. Real validation can replace the stub without changing the app bootstrap contract.

## Failure Cases

- invalid or empty token input
- audience mismatch against configured `GOOGLE_CLIENT_ID`
- downstream network failures when real Google validation is introduced later

## Open Questions

- whether session issuance will use signed cookies or token pairs
- whether auth route handlers should live in one plugin or split by provider

