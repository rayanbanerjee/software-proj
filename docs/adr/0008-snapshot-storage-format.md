# ADR 0008: Snapshot Storage Format

## Status

Accepted

## Context

The versioning and collaboration roadmap needs a canonical snapshot format before `VER-001`, rollback flows, and persistence hooks can be implemented safely. The repository already accepted Yjs plus Hocuspocus for real-time collaboration, but it has not yet decided what representation should be stored for durable revision snapshots.

## Decision

Store canonical document snapshots as binary Yjs snapshots in object storage, referenced by a stable `snapshotId` and accompanied by metadata in the API persistence layer.

Each stored snapshot should preserve the full collaborative document state without lossy conversion. The persisted metadata should include:

- `snapshotId`
- `documentId`
- `createdAt`
- `contentType` set to `application/vnd.collab-editor.yjs-snapshot`
- the editor schema version used to create the snapshot

Derived representations such as plain text, HTML, or editor-schema JSON may be generated later for exports, diffs, and AI workflows, but they are not the canonical rollback source of truth.

## Consequences

- versioning and rollback can operate on the same lossless document state used by the collaboration layer
- the storage format aligns directly with the accepted Yjs/Hocuspocus stack from `ADR-004`
- exports, diffing, and AI features will need explicit derived-document pipelines instead of reading snapshots as plain text directly
- binary snapshots are harder to inspect manually, so operational tooling and metadata become more important for debugging

## Links

- Task: `docs/tasks/TASK-0009-web-bootstrap-and-auth-foundations.md`
- Spec:
- Related ADR: `docs/adr/0004-collaboration-stack.md`
