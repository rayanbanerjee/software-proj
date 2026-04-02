# AI API

## `POST /v1/documents/:documentId/ai/requests`

Submits an AI request for a document and immediately returns the queued request identifier.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Request:

```json
{
  "action": "summarize",
  "prompt": "Keep it short",
  "context": {
    "scope": "selection",
    "selectedText": "This document needs a concise summary.",
    "surroundingText": "Context around the selected passage."
  },
  "maskPersonalData": true
}
```

Response:

```json
{
  "requestId": "air_uuid",
  "status": "succeeded",
  "queuedAt": "2026-04-02T18:30:00.000Z"
}
```

## `GET /v1/documents/:documentId/ai/requests/:requestId`

Returns the current lifecycle state and active proposal, if one exists.

Response:

```json
{
  "requestId": "air_uuid",
  "status": "succeeded",
  "startedAt": "2026-04-02T18:30:00.000Z",
  "completedAt": "2026-04-02T18:30:00.000Z",
  "errorMessage": null,
  "proposal": {
    "proposalId": "proposal_uuid",
    "requestId": "air_uuid",
    "documentId": "doc_uuid",
    "action": "summarize",
    "originalText": "This document needs a concise summary.",
    "proposedText": "[SUMMARY] xxxx xxxxxxxx xxxxx x xxxxxxx xxxxxxx.",
    "summary": "Mock summarize proposal generated locally for development.",
    "createdAt": "2026-04-02T18:30:00.000Z",
    "isStale": false
  }
}
```

## `POST /v1/documents/:documentId/ai/proposals/accept`

Applies a proposal decision placeholder and returns the application timestamp.

Request:

```json
{
  "proposalId": "proposal_uuid"
}
```

Response:

```json
{
  "proposalId": "proposal_uuid",
  "appliedAt": "2026-04-02T18:31:00.000Z"
}
```

## `POST /v1/documents/:documentId/ai/proposals/reject`

Rejects the current proposal and clears it from status polling.

Request:

```json
{
  "proposalId": "proposal_uuid"
}
```

Response:

```json
{
  "proposalId": "proposal_uuid",
  "rejectedAt": "2026-04-02T18:31:30.000Z"
}
```

## Notes

- the current implementation uses a local mock provider path for development
- request state is stored in memory
- accepted proposals do not yet mutate document content
