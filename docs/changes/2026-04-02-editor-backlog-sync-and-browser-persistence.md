# 2026-04-02 Editor Backlog Sync And Browser Persistence

## Summary

Synced the stale editor backlog to the code already present in the repo, added IndexedDB-backed local draft persistence alongside local storage, and introduced reconnect banner states for the editor workspace shell.

## What Changed

- wrote editor drafts to IndexedDB and hydrated from IndexedDB before falling back to local storage
- added sync-state parsing for `offline`, `reconnecting`, and `recovered` banner states on the document route
- updated the editor toolbar and banner copy to expose reconnect-state previews
- added helper coverage for the IndexedDB persistence path
- refreshed the backlog to mark the already-landed editor foundation tasks as done

## Follow-Up

- state-vector based reconnect merge
- unsynced recovery buffering
- permission-downgrade handling after offline edits
