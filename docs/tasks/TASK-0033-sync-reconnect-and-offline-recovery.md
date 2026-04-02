# TASK-0033 Sync Reconnect And Offline Recovery

## Goal

Finish the remaining sync slice so reconnect behavior has a concrete state-vector contract, the web editor can recover unsynced local edits, and offline permission changes degrade access safely.

## Scope

- add browser recovery-buffer helpers for unsynced local edits
- add reconnect-aware editor hydration using state-vector hints
- handle permission downgrades and revocations during offline recovery
- extend collab reconnect lifecycle coverage with state-vector handshake metadata

## Non-goals

- full CRDT merge conflict resolution
- durable sync checkpoints in the database
- browser E2E automation

## Status

Completed on 2026-04-02.

## Completed tasks

- `SYNC-003`
- `SYNC-004`
- `SYNC-005`
- `SYNC-006`

## Key files

- [local-persistence.ts](/Users/rayan.banerjee/courses/software%20project/apps/web/src/editor/local-persistence.ts)
- [base-editor.tsx](/Users/rayan.banerjee/courses/software%20project/apps/web/src/editor/base-editor.tsx)
- [page.tsx](/Users/rayan.banerjee/courses/software%20project/apps/web/src/app/(workspace)/documents/[documentId]/page.tsx)
- [server.ts](/Users/rayan.banerjee/courses/software%20project/apps/collab/src/server.ts)
