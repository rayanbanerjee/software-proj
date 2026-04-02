# 2026-04-02 Collab Writer Slots And Permission Push

## Summary

Added deterministic writer-slot allocation and queueing to the collab runtime, plus an API-to-collab permission update path so active sessions receive stateless permission changes and writer-slot state can be downgraded immediately.

## What Changed

- added a writer-slot manager with deterministic allocation and queue promotion
- broadcast `writer.slot.snapshot` events from the collab runtime
- added `document.permission.updated` as a stateless collab event
- added an internal collab endpoint for permission updates
- updated sharing routes to post permission updates into the collab service after accept, role change, and revoke flows
- documented the new websocket payloads and session bootstrap access level

## Follow-Up

- state-vector reconnect merge
- unsynced local recovery handling
- permission downgrade handling inside the browser client after receiving the collab event
