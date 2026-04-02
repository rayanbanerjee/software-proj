# Sharing API

## Routes

### `POST /v1/documents/:documentId/invitations`

Creates a signed invitation for a document.

Request body:

```json
{
  "email": "viewer@example.com",
  "role": "viewer"
}
```

Response:

```json
{
  "invitation": {
    "id": "inv_123",
    "documentId": "doc_123",
    "inviteeEmail": "viewer@example.com",
    "role": "viewer",
    "invitedByUserId": "user_owner",
    "createdAt": "2026-04-02T10:00:00.000Z",
    "expiresAt": "2026-04-09T10:00:00.000Z",
    "acceptedAt": null,
    "revokedAt": null
  },
  "acceptToken": "signed-token",
  "acceptUrl": "/accept-invitation?token=signed-token"
}
```

Notes:

- requires `x-user-id`
- only members with share permission can create invitations
- invitations cannot assign the `owner` role

### `POST /v1/invitations/accept`

Accepts an invitation and creates or updates membership for the current user.

Request body:

```json
{
  "token": "signed-token"
}
```

Notes:

- requires `x-user-id`
- requires `x-user-email`
- invitation email must match the current user email

### `PATCH /v1/documents/:documentId/members/:userId`

Updates the role for an existing document member.

Request body:

```json
{
  "role": "commenter"
}
```

Notes:

- requires `x-user-id`
- only owners can change member roles
- this endpoint cannot promote a user to `owner`
- successful role changes also push a `document.permission.updated` event into the collab service

### `DELETE /v1/documents/:documentId/members/:userId`

Revokes access for an existing document member.

Notes:

- requires `x-user-id`
- only owners can revoke access
- revocation also closes any pending invitations for that document in the in-memory implementation
- revocation pushes a `document.permission.updated` event with `accessLevel: none` into the collab service
