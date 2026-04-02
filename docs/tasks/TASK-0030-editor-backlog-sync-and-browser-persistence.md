# TASK-0030 Editor Backlog Sync And Browser Persistence

## Summary

Finish the remaining editor setup bookkeeping by syncing the backlog to match the already-landed editor foundation, while adding real IndexedDB-backed draft persistence and reconnect banner states to the web editor shell.

## Scope

- add IndexedDB draft persistence helpers and wire them into the base editor
- add reconnect-state banner handling to the editor route shell
- mark the editor foundation tasks as done because the codebase already includes the mounted base editor, schema package, block controls, title UI, read-only mode, history helpers, selection helpers, and editor tests

## Out Of Scope

- collab-aware state-vector merge on reconnect
- permission downgrade handling after offline edits
- deeper editor schema expansion beyond the already-landed base surface

## Completion

- synced `EDIT-001` through `EDIT-010`
- completed `SYNC-001`
- completed `SYNC-002`
