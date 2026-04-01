# Documents API

## `POST /v1/documents`

Creates a new document and records the requesting user as the owner.

Required headers:

- `x-user-id`
- `x-user-name` optional

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

Required headers:

- `x-user-id`

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

Required headers:

- `x-user-id`

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

Required headers:

- `x-user-id`

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

## `DELETE /v1/documents/:documentId`

Archives a document when the current user is the owner.

Required headers:

- `x-user-id`

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
