# Documents API

## `POST /v1/documents`

Creates a new document and records the requesting user as the owner.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Request body:

```json
{
  "title": "Project kickoff"
}
```

Response:

```json
{
  "document": {
    "id": "uuid",
    "title": "Project kickoff",
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T10:00:00.000Z",
    "archivedAt": null,
    "permissions": {
      "role": "owner",
      "canView": true,
      "canComment": true,
      "canEdit": true,
      "canShare": true,
      "canExport": true,
      "canUseAi": true,
      "canRollback": true
    }
  }
}
```

## `GET /v1/documents`

Lists the documents visible to the current user.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Response:

```json
{
  "documents": [
    {
      "id": "uuid",
      "title": "Project kickoff",
      "role": "owner",
      "updatedAt": "2026-04-01T10:00:00.000Z"
    }
  ]
}
```

## `GET /v1/documents/:documentId`

Returns document metadata and permission summary for an authorized user.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Response:

```json
{
  "document": {
    "id": "uuid",
    "title": "Project kickoff",
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T10:00:00.000Z",
    "archivedAt": null,
    "permissions": {
      "role": "owner",
      "canView": true,
      "canComment": true,
      "canEdit": true,
      "canShare": true,
      "canExport": true,
      "canUseAi": true,
      "canRollback": true
    }
  }
}
```

## `PATCH /v1/documents/:documentId`

Renames a document when the current user has edit access.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Request body:

```json
{
  "title": "Renamed title"
}
```

Response:

```json
{
  "document": {
    "id": "uuid",
    "title": "Renamed title",
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T10:05:00.000Z",
    "archivedAt": null,
    "permissions": {
      "role": "owner",
      "canView": true,
      "canComment": true,
      "canEdit": true,
      "canShare": true,
      "canExport": true,
      "canUseAi": true,
      "canRollback": true
    }
  }
}
```

## `POST /v1/documents/:documentId/sessions`

Returns the bootstrap payload the web app can use before opening the collaboration WebSocket.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Request body:

```json
{
  "lastKnownSessionId": "session-prev-123"
}
```

`lastKnownSessionId` is optional and is used for reconnect or resume attempts.

Response:

```json
{
  "session": {
    "documentId": "uuid",
    "joinedAt": "2026-04-02T17:20:00.000Z",
    "resumedFromSessionId": "session-prev-123",
    "self": {
      "sessionId": "uuid",
      "documentId": "uuid",
      "userId": "google:user_owner",
      "displayName": "Owner Demo",
      "role": "owner",
      "accessLevel": "write",
      "isPresent": true,
      "lastSeenAt": "2026-04-02T17:20:00.000Z",
      "connectionStatus": "active"
    },
    "collaborators": [
      {
        "sessionId": "uuid",
        "documentId": "uuid",
        "userId": "google:user_owner",
        "displayName": "Owner Demo",
        "role": "owner",
        "accessLevel": "write",
        "isPresent": true,
        "lastSeenAt": "2026-04-02T17:20:00.000Z",
        "connectionStatus": "active"
      }
    ]
  },
  "websocketUrl": "ws://localhost:4001?documentName=uuid&token=<signed-session-token>",
  "token": "<signed-session-token>"
}
```

## `DELETE /v1/documents/:documentId`

Archives a document when the current user is the owner.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Response:

```json
{
  "documentId": "uuid",
  "archivedAt": "2026-04-01T10:10:00.000Z"
}
```

## Notes

- the current implementation uses an app-scoped in-memory repository while the API is still being wired to Prisma-backed persistence
- owner membership is created together with the document creation flow
- archived documents are removed from list responses but can still be retrieved directly by id
- document routes now require the signed auth session established by `POST /v1/auth/callback`
- the session bootstrap route currently returns the joining user as the only collaborator until broader collab presence state is wired
