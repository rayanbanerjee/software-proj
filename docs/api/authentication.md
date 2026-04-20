# Authentication API And Config

## Required API Environment Variables

- `SESSION_SECRET`
- `JWT_ISSUER`

## Optional API Environment Variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_JWKS_URL`

If `GOOGLE_CLIENT_ID` is not configured, Google callback auth returns `503` and the local username/password login flow remains available.

## `POST /v1/auth/callback`

Accepts a Google ID token, verifies it against Google signing keys, and issues the API session cookie used by the rest of the platform.

Request body:

```json
{
  "credential": "<google-id-token>"
}
```

Compatibility alias:

```json
{
  "idToken": "<google-id-token>"
}
```

Response:

```json
{
  "session": {
    "issuedAt": "2026-04-19T10:00:00.000Z",
    "expiresAt": "2026-04-26T10:00:00.000Z",
    "user": {
      "id": "google:sub_123",
      "email": "owner@example.com",
      "name": "Owner Demo",
      "imageUrl": "https://example.com/avatar.png"
    }
  }
}
```

Failure cases:

- `400 BAD_REQUEST` when the token field is missing
- `401 AUTH_INVALID_GOOGLE_TOKEN` when verification fails
- `503 AUTH_PROVIDER_NOT_CONFIGURED` when Google auth is not configured

## `POST /v1/auth/login`

Accepts a local username/password payload for development flows and issues the same JWT-backed API session contract.

Request body:

```json
{
  "username": "owner",
  "password": "dev-password",
  "createUserIfMissing": false
}
```

Response:

```json
{
  "outcome": "authenticated",
  "session": {
    "issuedAt": "2026-04-19T10:00:00.000Z",
    "expiresAt": "2026-04-26T10:00:00.000Z",
    "user": {
      "id": "jwt:2d530b372d57f5b4",
      "email": "owner@local.test",
      "name": "owner",
      "imageUrl": null
    }
  }
}
```

Failure cases:

- `400 BAD_REQUEST` when username or password is missing
- `401 AUTH_INVALID_CREDENTIALS` when the password is wrong
- `404 AUTH_USER_NOT_FOUND` when the user does not exist and auto-create was not requested

## `GET /v1/auth/me`

Returns the normalized current-user profile for a valid API session.

Authentication:

- `collab_session` cookie by default
- `Authorization: Bearer <token>` also accepted for non-browser clients

Response:

```json
{
  "user": {
    "id": "jwt:2d530b372d57f5b4",
    "email": "owner@local.test",
    "name": "owner",
    "imageUrl": null
  }
}
```

Failure cases:

- `401 UNAUTHORIZED` when session credentials are missing
- `401 UNAUTHORIZED` when the session token is invalid or expired

## Rate Limiting

API requests use the configured process-local limiter controlled by:

- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

Responses may include:

- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`
- `retry-after` on `429 TOO_MANY_REQUESTS`

## Notes

- `SESSION_SECRET` signs the API-issued JWT session token
- `JWT_ISSUER` controls the `iss` claim used during session verification
- protected API routes now share a route-level `protectedRoute` helper instead of repeating raw guard registration
