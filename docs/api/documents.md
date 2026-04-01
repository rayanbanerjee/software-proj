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

## Notes

- the current implementation uses an app-scoped in-memory repository while the API is still being wired to Prisma-backed persistence
- owner membership is created together with the document creation flow
