# AI Streaming API

## `GET /v1/ai/prompt-templates`

Returns the prompt template catalog shared by the API and web UI.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Response:

```json
{
  "templates": [
    {
      "action": "rewrite",
      "title": "Rewrite template",
      "systemPrompt": "Rewrite the provided text while preserving the original meaning and intent.",
      "version": "v1"
    }
  ]
}
```

## `POST /v1/ai/context/retrieve`

Runs the branch's current RAG-style retrieval strategy over the authenticated workspace state.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Request body:

```json
{
  "query": "release invite",
  "topK": 5
}
```

Response:

```json
{
  "query": "release invite",
  "chunks": [
    {
      "id": "document-title:doc_123",
      "sourceType": "document_title",
      "sourceLabel": "Release plan title",
      "documentId": "doc_123",
      "text": "Release plan",
      "score": 1,
      "rationale": "Document titles are the lightest-weight retrieval signal available in this branch."
    }
  ]
}
```

Notes:

- the current retrieval corpus is intentionally limited to the real data available on this branch:
  stored document body chunks, document titles, role summaries, recent audit events, and prompt templates
- document body chunks come from `GET/PUT /v1/documents/:documentId/content`
- it is still lexical retrieval, not a vector-backed semantic index yet

## `POST /v1/documents/:documentId/ai/stream`

Starts a streaming AI generation request for the given document and returns a Server-Sent Events response.

Authentication:

- `collab_session` cookie
- or `Authorization: Bearer <token>`

Request body:

```json
{
  "action": "summarize",
  "prompt": "Keep it concise.",
  "context": {
    "scope": "selection",
    "selectedText": "The draft paragraph to summarize",
    "surroundingText": null
  },
  "maskPersonalData": false
}
```

Response content type:

- `text/event-stream`

Event stream format:

```text
data: {"type":"started","requestId":"ai_123","status":"running"}

data: {"type":"delta","requestId":"ai_123","delta":"Summary: ","text":"Summary: "}

data: {"type":"completed","requestId":"ai_123","status":"succeeded","proposal":{"proposalId":"proposal_123","requestId":"ai_123","documentId":"doc_123","action":"summarize","originalText":"The draft paragraph to summarize","proposedText":"Summary: ...","summary":"summarize: Summary: ...","createdAt":"2026-04-19T08:00:00.000Z","isStale":false}}
```

Failure cases:

- `401 UNAUTHORIZED` when session credentials are missing or invalid
- `403 DOCUMENT_FORBIDDEN` when the current user cannot use AI for the document
- stream-level `error` events when provider generation fails after the stream has started

Notes:

- when `OPENROUTER_API_KEY` or `LLM_API_KEY` is configured, the endpoint streams from OpenRouter using the configured model
- without a live key, the current implementation falls back to a deterministic local provider so tests and local development can still exercise the streaming flow
