# 2026-04-02 Sync Reconnect And Offline Recovery

## Summary

Completed the remaining sync slice by adding reconnect state-vector hints, browser-side unsynced recovery buffers, offline permission degradation handling, and collab lifecycle coverage for the reconnect contract.

## What changed

- added recovery-buffer helpers alongside local editor draft persistence
- taught the web editor to replay recovery content during reconnect and recovered states when the server state vector differs from the browser's last local sync point
- added document route parsing for offline permission changes so reconnect can degrade into read-only or revoked recovery mode
- extended the collab reconnect lifecycle test to cover the `stateVector` reconnect hint
- updated lifecycle, permission, and websocket contract docs to describe the new reconnect flow

## Follow-up

- replace the reconnect hint contract with real Yjs state-vector exchange once browser collab wiring lands
- add browser E2E coverage for offline recovery and permission-loss states
