# Spec: Document Session Lifecycle

## Status

Draft

## Goal

Define the expected lifecycle for opening a document, joining a collaboration session, maintaining presence, and handling disconnect or reconnect transitions.

## Scope

- browser-to-API join preparation
- browser-to-collab authenticated connection setup
- initial session state shape and lifecycle transitions
- disconnect, reconnect, and session replacement expectations

## Non-Goals

- wire-level Yjs sync encoding details
- long-term snapshot persistence format
- editor-specific offline buffering internals

## Interfaces

- `GET /v1/documents/:documentId`: verifies the user can access the document metadata before session join
- `JoinDocumentSessionRequest`: client request contract for entering a live collaboration session
- `JoinDocumentSessionResponse`: session bootstrap payload returned before or alongside WebSocket connection details
- collab WebSocket handshake: `ws://localhost:4001?documentName=<documentId>&token=<signed-session-token>`

## Data Model

- `DocumentSessionState`
  - `documentId`
  - `joinedAt`
  - `resumedFromSessionId`
  - `self`
  - `collaborators`
- `CollaboratorSessionSummary`
  - `sessionId`
  - `documentId`
  - `userId`
  - `displayName`
  - `role`
  - `accessLevel`
  - `isPresent`
  - `lastSeenAt`
  - `connectionStatus`
- `DocumentSessionHeartbeat`
  - `sessionId`
  - `sentAt`

## Lifecycle

### 1. Open Document

1. The browser loads the editor route for a specific document.
2. The browser fetches document metadata from the API.
3. The API enforces the authenticated session and confirms that the user can view the document.
4. The UI uses the metadata response to determine whether the user is an owner, editor, commenter, or viewer before any real-time session is attempted.

### 2. Prepare Session Join

1. The client determines the target `documentId`.
2. The client obtains or reuses the signed API session token established by the auth callback.
3. The client prepares `JoinDocumentSessionRequest`, optionally including `lastKnownSessionId` when reconnecting.
4. The client derives the collab WebSocket URL and passes the signed session token as the `token` query parameter.

### 3. Connect To Collaboration Service

1. The client opens the WebSocket connection to the collaboration service.
2. The collab service verifies the signed session token during `onConnect`.
3. If the token is missing, malformed, expired, or has an invalid signature, the connection is rejected.
4. If the token is valid, the collab service attaches the authenticated user context to the connection and marks the connection as eligible to join the document.

### 4. Establish Live Session State

1. The collab service associates the authenticated user with the requested document.
2. The service creates a new `sessionId` or marks the connection as a resumption of a recent prior session.
3. The joining client receives `DocumentSessionState` that identifies:
   - the current session
   - the user’s effective access level
   - the currently active collaborators already present in the document
4. The collab service begins forwarding Yjs sync and awareness messages for the document.

### 5. Active Session

1. The client exchanges Yjs sync frames to reach a consistent document state.
2. The client sends or responds to awareness updates to reflect presence.
3. The server maintains `lastSeenAt` and `connectionStatus` for active collaborators.
4. Presence summaries remain eventually consistent rather than strongly transactional.

### 6. Disconnect

1. A connection may end explicitly, through network loss, or through token/session invalidation.
2. The collab service marks the session as disconnected or stale.
3. The disconnected collaborator should no longer appear as actively present once the server’s timeout or cleanup path runs.

### 7. Reconnect

1. The client may reconnect using a fresh WebSocket plus the current signed session token.
2. The client may provide `lastKnownSessionId` so the server can mark the new session as a resumption attempt.
3. If resumption succeeds, `resumedFromSessionId` is set in the returned session state.
4. If resumption is not possible, the server creates a new session and the client performs a normal state resync.

## Failure Cases

- document metadata access is denied before collab join
- session token is missing or invalid during WebSocket connect
- reconnect occurs after the prior session has already been fully cleaned up
- permission changes during an active session downgrade access and require the connection to be limited or closed

## Open Questions

- should the API expose an explicit preflight join endpoint before the client opens the collab WebSocket
- how long should stale disconnected sessions remain resumable
- should collab token transport stay query-parameter based or move to a different handshake field later
