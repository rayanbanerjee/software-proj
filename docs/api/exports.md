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
  "status": "queued",
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
  "downloadUrl": "/documents/doc_uuid/exports/exp_uuid/artifact?expiresAt=...&token=...",
  "expiresAt": "2026-04-02T18:45:00.000Z"
}
```

## `GET /v1/documents/:documentId/exports/:exportJobId/artifact`

Streams the generated export artifact when the download token is valid.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Required query parameters:

- `expiresAt`
- `token`

## Notes

- export jobs and generated artifacts are persisted under the configured local API data directory
- artifact files are stored inside a bucketed object-storage-style directory rooted at `API_DATA_DIR/object-storage/<bucket>`
- create requests return `queued`, then the process-local export worker advances jobs through `running` to `succeeded`
- the artifact endpoint validates the signed download token and streams the generated file to the client
