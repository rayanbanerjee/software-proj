# Authentication API And Config

## Required API Environment Variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `WEB_ORIGIN`

## Required Web Environment Variables

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_API_BASE_URL`

## `POST /v1/auth/callback`

Accepts a Google ID token from the browser, verifies it against Google with the configured `GOOGLE_CLIENT_ID`, issues the initial API session, and returns the normalized session payload.

Request body:

```json
{
  "idToken": "<google-id-token>"
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
- `GOOGLE_CLIENT_SECRET` should be stored for Google OAuth configuration and future server-side auth flow expansion, but the current browser sign-in path exchanges a Google ID token instead of an authorization code
- `WEB_ORIGIN` controls the allowed browser origin for the API CORS policy
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is required by the web app to render the Google sign-in button
- `NEXT_PUBLIC_API_BASE_URL` should point at the API origin that serves `/v1/auth/callback`
- tests still use the local `stub-valid-token` helper through an injected test validator; production and development runtime now verify real Google tokens
- protected API routes now read the same signed session token from the cookie or bearer header instead of the earlier test-only identity headers
