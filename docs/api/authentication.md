# Authentication API And Config

## Required API Environment Variables

- `SESSION_SECRET`
- `JWT_ISSUER`

## `POST /v1/auth/login`

Accepts a client-provided identity payload, issues an HMAC-signed JWT session, and returns the normalized session payload.

Request body:

```json
{
  "email": "owner@example.com",
  "name": "Owner Demo",
  "imageUrl": "https://example.com/avatar.png"
}
```

Response:

```json
{
  "session": {
    "issuedAt": "2026-04-02T10:00:00.000Z",
    "expiresAt": "2026-04-09T10:00:00.000Z",
    "user": {
      "id": "jwt:2d530b372d57f5b4",
      "email": "owner@example.com",
      "name": "Owner Demo",
      "imageUrl": "https://example.com/avatar.png"
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

- `400 BAD_REQUEST` when `email` is missing or invalid

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
    "email": "owner@example.com",
    "name": "Owner Demo",
    "imageUrl": "https://example.com/avatar.png"
  }
}
```

Failure cases:

- `401 UNAUTHORIZED` when session credentials are missing
- `401 UNAUTHORIZED` when the session token is invalid or expired

## Notes

- `SESSION_SECRET` signs the API-issued JWT session token
- `JWT_ISSUER` controls the `iss` claim used during session verification
- protected API routes now read the same signed session token from the cookie or bearer header instead of the earlier test-only identity headers
