# Spec: Versioning Model

## Status

Draft

## Goal

Define the baseline revision and rollback model for collaborative documents so API, worker, and UI work can build on a shared vocabulary before persistence is fully wired.

## Scope

- revision checkpoint shape and lifecycle
- list, detail, diff, and rollback API responsibilities
- interaction points between document revisions and active collaboration sessions
- future worker responsibilities for revision summaries

## Non-Goals

- binary snapshot encoding details
- final storage schema for revision content blobs
- text diff algorithm selection

## Core Concepts

- `revision`: an immutable checkpoint representing document state at a point in time
- `head revision`: the latest active revision for a document
- `rollback`: creation of a new head revision derived from a prior checkpoint rather than mutation of history
- `revision summary`: asynchronous metadata or explanation attached after the checkpoint exists

## Data Model

- `revisionId`
- `documentId`
- `createdAt`
- `createdByUserId`
- `reason`
  - `manual`
  - `auto-checkpoint`
  - `rollback`
- `parentRevisionId`
- `snapshotRef`
- `summaryStatus`
  - `pending`
  - `completed`
  - `failed`

## API Responsibilities

- `GET /v1/documents/:documentId/versions`
  - returns revision metadata in reverse chronological order
- `GET /v1/documents/:documentId/versions/:revisionId`
  - returns metadata and the requested revision content reference
- `GET /v1/documents/:documentId/versions/:revisionId/diff`
  - returns a comparison payload against the current head or another requested revision
- `POST /v1/documents/:documentId/versions/:revisionId/rollback`
  - creates a new head revision from the requested checkpoint
  - does not delete or rewrite newer history

## Lifecycle

### 1. Create Revision

1. A checkpoint policy or explicit user action decides a revision should be created.
2. The API records a new immutable revision row or in-memory record.
3. The new revision becomes the current head when it represents the latest document state.

### 2. View Revision History

1. The UI requests the revision list for a document.
2. The API returns metadata sufficient for ordering, labeling, and author attribution.
3. The UI may request a specific revision for detail or comparison.

### 3. Roll Back

1. The user selects a prior revision.
2. The API validates access and creates a new head revision using that checkpoint as input.
3. Active collaboration sessions are notified that the document head changed.
4. The original historical revisions remain intact.

## Collaboration Interaction

- active collab sessions continue to reference the current head
- rollback is a forward-moving event that swaps the active content base
- later collab work should broadcast a rollback event instead of silently changing state underneath clients
- the current collab contract uses a stateless `document.rollback` payload so open clients can reconcile to the new head revision

## Worker Interaction

- revision-summary jobs are asynchronous and non-blocking
- summary failures do not invalidate the revision itself
- future AI or summarization features may attach derived metadata to an existing revision

## Failure Cases

- revision requested for a document the user cannot access
- rollback requested to a revision that does not exist
- rollback attempted without sufficient permission
- summary generation fails after the revision was already created

## Open Questions

- how often should automatic checkpoints be created during active collaboration
- should diff responses target current head by default or require explicit comparison targets
- should rollback require an optimistic concurrency guard against concurrent active edits
