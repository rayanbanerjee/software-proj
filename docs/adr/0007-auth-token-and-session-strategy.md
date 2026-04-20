# ADR 0007: Auth Token And Session Strategy

## Status

Accepted

## Context

The API needs a concrete session strategy before `AUTH-004`, `AUTH-005`, `AUTH-006`, `AUTH-007`, and `COLLAB-002` can be implemented coherently. The callback and downstream auth flows need a durable contract for what gets issued after a user identity is accepted by the application.

## Decision

Use an API-issued, self-contained, HMAC-signed session token as the initial auth session format, delivered primarily through an `HttpOnly` cookie named `collab_session`.

The initial flow is:

1. The client submits an identity payload to `POST /v1/auth/login`.
2. The API validates that the payload contains a canonical email identity.
3. The API issues a signed session token using `SESSION_SECRET`.
4. The API returns a session payload containing the normalized user profile plus issued-at and expiry timestamps.
5. The API also sets the signed token in an `HttpOnly`, `SameSite=Lax`, path-wide cookie. The `Secure` attribute is enabled in production.

The session token should initially contain enough self-describing user claims to avoid a database lookup during the first auth slice:

- session version
- issued-at and expiry timestamps
- email
- display name
- avatar URL

The canonical normalized user identifier for this initial slice is a stable application-issued `jwt:<hash>` identifier or an explicitly provided application user id.

Subsequent API middleware should read the cookie by default. Non-browser flows and future integration tooling may also accept the same signed token as a bearer credential, but the browser cookie remains the primary transport.

## Consequences

- the first auth flow can work without introducing a server-side session store before the rest of the auth stack exists
- `AUTH-004` can return a real session payload immediately after login succeeds
- `AUTH-005` and `AUTH-006` can build on the same issue-and-verify token contract instead of redefining session semantics later
- `SESSION_SECRET` rotation will invalidate existing sessions unless multi-key verification is added in a future task
- self-contained tokens duplicate a small amount of user profile data, so profile changes are reflected on the next callback or future re-issuance event rather than instantly

## Links

- Task: `docs/tasks/TASK-0009-web-bootstrap-and-auth-foundations.md`, `docs/tasks/TASK-0005-health-and-auth-skeleton.md`
- Spec: `docs/specs/authentication-flow.md`
- Related ADR: `docs/adr/0002-api-framework.md`
