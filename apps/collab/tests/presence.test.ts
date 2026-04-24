import { describe, expect, it } from "vitest";

import { PresenceManager } from "../src/awareness/presence.js";

describe("presence manager", () => {
  it("tracks active collaborators and emits snapshot payloads", () => {
    const presence = new PresenceManager();

    presence.upsertConnection("doc-1", "socket-1", {
      accessLevel: "write",
      displayName: "Owner Demo",
      role: "owner",
      user: {
        id: "google:user_owner",
        name: "Owner Demo"
      }
    });

    const snapshot = presence.buildSnapshotEvent("doc-1");

    expect(snapshot.type).toBe("presence.snapshot");
    expect(snapshot.documentId).toBe("doc-1");
    expect(snapshot.collaborators).toEqual([
      expect.objectContaining({
        connectionStatus: "active",
        displayName: "Owner Demo",
        documentId: "doc-1",
        accessLevel: "write",
        isPresent: true,
        role: "owner",
        sessionId: "socket-1",
        userId: "google:user_owner"
      })
    ]);
  });

  it("refreshes timestamps on awareness updates and drops disconnected sessions", () => {
    const presence = new PresenceManager();

    presence.upsertConnection("doc-1", "socket-1", {
      displayName: "Owner Demo",
      user: {
        id: "google:user_owner",
        name: "Owner Demo"
      }
    });

    const updated = presence.markAwarenessActive("doc-1", "socket-1");
    const removed = presence.removeConnection("doc-1", "socket-1");

    expect(updated).toEqual(
      expect.objectContaining({
        connectionStatus: "active",
        isPresent: true,
        sessionId: "socket-1"
      })
    );
    expect(removed).toEqual(
      expect.objectContaining({
        connectionStatus: "disconnected",
        isPresent: false,
        sessionId: "socket-1"
      })
    );
    expect(presence.getSnapshot("doc-1")).toEqual([]);
  });

  it("allows a reconnecting session to replace its previous disconnected session id", () => {
    const presence = new PresenceManager();

    presence.upsertConnection("doc-1", "socket-1", {
      displayName: "Owner Demo",
      user: {
        id: "google:user_owner",
        name: "Owner Demo"
      }
    });
    presence.removeConnection("doc-1", "socket-1");

    const resumed = presence.resumeConnection(
      "doc-1",
      "socket-2",
      "socket-1",
      {
        displayName: "Owner Demo",
        user: {
          id: "google:user_owner",
          name: "Owner Demo"
        }
      }
    );

    expect(resumed.resumedFromSessionId).toBe("socket-1");
    expect(presence.getSnapshot("doc-1")).toEqual([
      expect.objectContaining({
        sessionId: "socket-2",
        userId: "google:user_owner",
        connectionStatus: "active",
        isPresent: true
      })
    ]);
  });

  it("collapses duplicate active sessions for the same user into one collaborator summary", () => {
    const presence = new PresenceManager();

    presence.upsertConnection("doc-1", "socket-1", {
      displayName: "Owner Demo",
      user: {
        id: "google:user_owner",
        name: "Owner Demo"
      }
    });
    presence.upsertConnection("doc-1", "socket-2", {
      displayName: "Owner Demo",
      user: {
        id: "google:user_owner",
        name: "Owner Demo"
      }
    });

    expect(presence.getSnapshot("doc-1")).toHaveLength(1);
    expect(presence.getSnapshot("doc-1")[0]).toMatchObject({
      userId: "google:user_owner",
      isPresent: true,
      connectionStatus: "active"
    });
  });

  it("prunes stale sessions after the timeout window", () => {
    const presence = new PresenceManager();

    presence.upsertConnection("doc-1", "socket-1", {
      displayName: "Owner Demo",
      user: {
        id: "google:user_owner",
        name: "Owner Demo"
      }
    });

    const [snapshot] = presence.getSnapshot("doc-1");
    const staleAt = Date.parse(snapshot.lastSeenAt) + 60_000;
    const pruned = presence.pruneStaleConnections(staleAt, 45_000);

    expect(pruned).toEqual([
      {
        documentId: "doc-1",
        removed: [
          expect.objectContaining({
            connectionStatus: "stale",
            isPresent: false,
            sessionId: "socket-1"
          })
        ]
      }
    ]);
    expect(presence.getSnapshot("doc-1")).toEqual([]);
  });

  it("can refresh a pruned connection from the live websocket context", () => {
    const presence = new PresenceManager();

    presence.upsertConnection("doc-1", "socket-1", {
      accessLevel: "write",
      displayName: "Editor Demo",
      role: "editor",
      user: {
        id: "google:user_editor",
        name: "Editor Demo"
      }
    });

    const [snapshot] = presence.getSnapshot("doc-1");
    presence.pruneStaleConnections(Date.parse(snapshot.lastSeenAt) + 60_000, 45_000);
    expect(presence.getSnapshot("doc-1")).toEqual([]);

    presence.refreshConnection("doc-1", "socket-1", {
      accessLevel: "write",
      displayName: "Editor Demo",
      role: "editor",
      user: {
        id: "google:user_editor",
        name: "Editor Demo"
      }
    });

    expect(presence.getSnapshot("doc-1")).toEqual([
      expect.objectContaining({
        accessLevel: "write",
        connectionStatus: "active",
        role: "editor",
        sessionId: "socket-1",
        userId: "google:user_editor"
      })
    ]);
  });
});
