# Collaboration WebSocket Events

## Connection

The collaboration service uses Hocuspocus over WebSocket.

Development endpoint:

- `ws://localhost:4001`

Required query parameters:

- `documentName`: the document/session identifier the client wants to join
- `token`: the API-issued signed session token from the auth flow

Example:

```text
ws://localhost:4001?documentName=project-kickoff&token=<signed-session-token>
```

Authentication behavior:

- the collab server verifies the same HMAC-signed session token issued by `POST /v1/auth/callback`
- missing, malformed, expired, or invalid signatures are rejected before the connection is treated as established

## Message Types

The current server follows Hocuspocus/Yjs wire-level message categories.

- `Sync (0)`: document synchronization frames for Yjs state exchange
- `Awareness (1)`: collaborator presence and awareness updates
- `Auth (2)`: authentication-related protocol messages
- `QueryAwareness (3)`: request current awareness state
- `SyncReply (4)`: sync reply frame
- `Stateless (5)`: custom stateless payload
- `BroadcastStateless (6)`: broadcast stateless payload
- `Close (7)`: connection close frame
- `SyncStatus (8)`: sync state status updates

## Current Hooks

- `onConnect`: verifies the `token` query parameter and attaches the authenticated user to collab context
- `connected`: logs successful document connections
- `onDisconnect`: logs connection shutdown

## Operational Endpoints

The collab service also exposes:

- `GET /health`
- `GET /ready`

## Notes

- the current implementation bootstraps the authenticated handshake and base Hocuspocus runtime only
- the web app can now preflight the join through `POST /v1/documents/:documentId/sessions` before opening the socket
- document load, persistence, join-state DTOs, and permission update pushes will expand this contract in later collaboration tasks
