# Exports API

## `POST /v1/documents/:documentId/exports`

Creates an export job for a document the current user can access.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Request body:

```json
{
  "format": "txt"
}
```

Response:

```json
{
  "exportJobId": "exp_uuid",
  "status": "succeeded",
  "requestedAt": "2026-04-02T18:30:00.000Z"
}
```

## `GET /v1/documents/:documentId/exports/:exportJobId`

Returns the current status for an export job.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Response:

```json
{
  "job": {
    "exportJobId": "exp_uuid",
    "documentId": "doc_uuid",
    "format": "pdf",
    "status": "succeeded",
    "requestedAt": "2026-04-02T18:30:00.000Z",
    "completedAt": "2026-04-02T18:30:00.000Z",
    "downloadUrl": null
  }
}
```

## `GET /v1/documents/:documentId/exports/:exportJobId/download`

Returns a time-limited download link when the export job is complete.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Response:

```json
{
  "downloadUrl": "/documents/doc_uuid/exports/exp_uuid/artifact?token=...",
  "expiresAt": "2026-04-02T18:45:00.000Z"
}
```

## Notes

- the current implementation stores export jobs in-memory
- export jobs are marked `succeeded` immediately while the worker/export pipeline remains stubbed
- download links are signed-looking placeholders and the artifact endpoint itself is not implemented yet
