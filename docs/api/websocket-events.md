# Collaboration WebSocket Events

## Connection

The collaboration service uses Hocuspocus over WebSocket.

Development endpoint:

- `ws://localhost:4001`

Required query parameters:

- `documentName`: the document/session identifier the client wants to join
- `token`: the API-issued signed session token from the auth flow
- `accessLevel`: `write` or `read` from the API session bootstrap

Optional query parameters:

- `lastKnownSessionId`: the prior collab session id the client is attempting to resume
- `stateVector`: optional reconnect hint representing the browser's latest local sync state

Example:

```text
ws://localhost:4001?documentName=project-kickoff&token=<signed-session-token>&accessLevel=write&lastKnownSessionId=<prior-session-id>&stateVector=<client-state-vector>
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

## Stateless Presence Payload

The collab service now uses Hocuspocus stateless broadcasts for high-level presence snapshots.

Event shape:

```json
{
  "type": "presence.snapshot",
  "documentId": "uuid",
  "generatedAt": "2026-04-02T18:00:00.000Z",
  "collaborators": [
    {
      "sessionId": "socket-id",
      "documentId": "uuid",
      "userId": "google:user_owner",
      "displayName": "Owner Demo",
      "isPresent": true,
      "lastSeenAt": "2026-04-02T18:00:00.000Z",
      "connectionStatus": "active"
    }
  ]
}
```

Behavior:

- a fresh snapshot is broadcast when a collaborator connection is established
- awareness updates refresh `lastSeenAt` and rebroadcast the current snapshot
- disconnect removes the collaborator from the active snapshot
- silent or abandoned sessions are pruned after the collab timeout window and rebroadcast as removed
- a reconnecting client may replace its prior disconnected session when `lastKnownSessionId` matches a recent session for the same user
- reconnect resumptions log the provided `stateVector` hint so the browser's recovery-buffer replay can be correlated with the resumed session

## Stateless Rollback Payload

When the API accepts a document rollback, it also notifies the collab service so active clients can react to the new head revision.

Event shape:

```json
{
  "type": "document.rollback",
  "documentId": "uuid",
  "revisionId": "rev_uuid",
  "rolledBackAt": "2026-04-02T18:05:00.000Z",
  "triggeredByUserId": "google:user_owner"
}
```

Behavior:

- the API posts the rollback event to the collab service after `POST /v1/documents/:documentId/versions/rollback` succeeds
- the collab service rebroadcasts the stateless rollback payload to currently active document connections
- if no active document runtime exists yet, the collab service accepts the event without broadcasting it

## Stateless Writer Slot Payload

The collab service now emits a deterministic writer-slot snapshot for active write-capable sessions.

Event shape:

```json
{
  "type": "writer.slot.snapshot",
  "documentId": "uuid",
  "generatedAt": "2026-04-02T18:05:00.000Z",
  "maxActiveWriters": 2,
  "activeWriterSessionIds": ["socket-1", "socket-2"],
  "queuedWriterSessionIds": ["socket-3"]
}
```

Behavior:

- writer slots are allocated in connection order for `write` sessions
- additional write-capable sessions are queued after the active writer limit is reached
- queued writers are promoted automatically when an active writer disconnects or loses write access

## Stateless Permission Update Payload

The API now posts permission updates into the collab service after invitation acceptance, role changes, or access revocation.

Event shape:

```json
{
  "type": "document.permission.updated",
  "documentId": "uuid",
  "userId": "google:user_editor",
  "role": "commenter",
  "accessLevel": "read",
  "changedAt": "2026-04-02T18:06:00.000Z",
  "triggeredByUserId": "google:user_owner"
}
```

Behavior:

- permission updates are rebroadcast to active document sessions
- write downgrades immediately remove affected sessions from the writer-slot snapshot
- full revocation removes the user from active presence and writer slots

## Current Hooks

- `onConnect`: verifies the `token` query parameter and attaches the authenticated user to collab context
- `connected`: logs successful document connections and reconnect resumptions
- `onAwarenessUpdate`: refreshes presence state and rebroadcasts the stateless snapshot
- `onDisconnect`: logs connection shutdown
- periodic sweep: removes stale presence entries that have not refreshed within the timeout window
- `POST /internal/events/document-rollback`: accepts rollback events from the API and rebroadcasts them to active clients
- `POST /internal/events/document-permission-update`: accepts permission updates from the API and rebroadcasts them to active clients

## Operational Endpoints

The collab service also exposes:

- `GET /health`
- `GET /ready`

## Notes

- the current implementation bootstraps the authenticated handshake and base Hocuspocus runtime only
- the web app can now preflight the join through `POST /v1/documents/:documentId/sessions` before opening the socket
- document load, persistence, and permission update pushes will expand this contract in later collaboration tasks
