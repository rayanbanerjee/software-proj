# Authentication API And Config

## Required API Environment Variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`

## `POST /v1/auth/callback`

Accepts a Google ID token, validates it through the auth module's shared validator abstraction, issues the initial API session, and returns the normalized session payload.

Request body:

```json
{
  "idToken": "stub-valid-token"
}
```

Response:

```json
{
  "session": {
    "issuedAt": "2026-04-02T10:00:00.000Z",
    "expiresAt": "2026-04-09T10:00:00.000Z",
    "user": {
      "id": "google:google-oauth-subject",
      "email": "stub-user@example.com",
      "name": "Stub User",
      "imageUrl": "https://example.com/avatar.png",
      "googleSubject": "google-oauth-subject"
    }
  }
}
```

Cookie behavior:

- sets `collab_session`
- `HttpOnly`
- `SameSite=Lax`
- `Path=/`
- one-week lifetime
- `Secure` in production

Failure cases:

- `400 BAD_REQUEST` when `idToken` is missing or blank
- `401 INVALID_GOOGLE_TOKEN` when validation fails

## `GET /v1/auth/me`

Returns the normalized current-user profile for a valid API session.

Authentication:

- `collab_session` cookie by default
- `Authorization: Bearer <token>` also accepted for non-browser clients

Response:

```json
{
  "user": {
    "id": "google:google-oauth-subject",
    "email": "stub-user@example.com",
    "name": "Stub User",
    "imageUrl": "https://example.com/avatar.png",
    "googleSubject": "google-oauth-subject"
  }
}
```

Failure cases:

- `401 UNAUTHORIZED` when session credentials are missing
- `401 UNAUTHORIZED` when the session token is invalid or expired

## Notes

- `GOOGLE_CLIENT_ID` controls Google token audience validation
- `SESSION_SECRET` signs the API-issued session token
- the current implementation uses the repo's stub validator path, so `stub-valid-token` remains the local test credential until real Google verification replaces it
- protected API routes now read the same signed session token from the cookie or bearer header instead of the earlier test-only identity headers
