# Versions API

## `GET /v1/documents/:documentId/versions`

Returns revision metadata for a document in reverse chronological order.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Response:

```json
{
  "revisions": [
    {
      "revisionId": "rev_uuid",
      "documentId": "doc_uuid",
      "label": "Initial snapshot: Project kickoff",
      "authorUserId": "google:user_owner",
      "createdAt": "2026-04-02T18:00:00.000Z"
    }
  ]
}
```

## `GET /v1/documents/:documentId/versions/:revisionId`

Returns a single revision detail payload.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Response:

```json
{
  "revision": {
    "revisionId": "rev_uuid",
    "documentId": "doc_uuid",
    "label": "Initial snapshot: Project kickoff",
    "authorUserId": "google:user_owner",
    "createdAt": "2026-04-02T18:00:00.000Z",
    "snapshotId": "snap_uuid",
    "contentType": "application/vnd.collab.document+json"
  }
}
```

## `POST /v1/documents/:documentId/versions/rollback`

Creates a new head revision derived from an earlier checkpoint.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Request body:

```json
{
  "revisionId": "rev_uuid"
}
```

Response:

```json
{
  "revisionId": "rev_new_uuid",
  "rolledBackAt": "2026-04-02T18:10:00.000Z"
}
```

## `GET /v1/documents/:documentId/versions/:revisionId/diff`

Returns a stub diff payload for a revision.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Optional query parameters:

- `compareToRevisionId`

Response:

```json
{
  "documentId": "doc_uuid",
  "revisionId": "rev_uuid",
  "compareToRevisionId": null,
  "summary": "Stub diff for Initial snapshot: Project kickoff against the current head.",
  "changes": [
    {
      "field": "content",
      "kind": "stub",
      "description": "Detailed diff generation is not wired yet."
    }
  ]
}
```

## Notes

- the current implementation keeps revisions in-memory and seeds a baseline revision on first access
- only document owners can perform rollback in the current permission model
- rollback creates a new head revision and does not delete older history
- diff responses currently validate the comparison target and return a placeholder summary
