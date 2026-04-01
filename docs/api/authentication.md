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

## Notes

- `GOOGLE_CLIENT_ID` controls Google token audience validation
- `SESSION_SECRET` signs the API-issued session token
- the current implementation uses the repo's stub validator path, so `stub-valid-token` remains the local test credential until real Google verification replaces it
