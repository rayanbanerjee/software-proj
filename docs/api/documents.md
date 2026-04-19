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

## `GET /v1/documents/:documentId/content`

Returns the stored text corpus for a document.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Response:

```json
{
  "content": {
    "documentId": "uuid",
    "text": "Release plan\n\nInvite the editor to review the launch notes.",
    "updatedAt": "2026-04-19T09:00:00.000Z"
  }
}
```

## `PUT /v1/documents/:documentId/content`

Replaces the stored text corpus for a document.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Request body:

```json
{
  "text": "Release plan\n\nInvite the editor to review the launch notes."
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
- document routes now require the signed auth session established by `POST /v1/auth/login`
