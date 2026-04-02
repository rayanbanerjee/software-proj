# 2026-04-02 Rollback Events And Version History Hook

## Summary

Connected version rollback operations to the collab runtime and replaced the editor shell's static history panel with a fetch-backed revision history loader that falls back cleanly when the API is unavailable.

## What Changed

- added a stateless `document.rollback` event shape in shared types
- taught the collab service to accept rollback event posts and rebroadcast them to active document sessions
- updated the versions rollback route to notify the collab service after a successful rollback
- added a web version history loader that fetches `/v1/documents/:documentId/versions` and maps revisions into sidebar entries
- updated the editor route to pass forwarded cookies into the history loader for authenticated server-side fetches
- added API, collab, and web tests for the new behavior

## Follow-Up

- apply rollback events to live Yjs document state
- add a rendered diff and rollback affordances to the web history panel
- replace in-memory revision history with durable snapshot-backed storage
