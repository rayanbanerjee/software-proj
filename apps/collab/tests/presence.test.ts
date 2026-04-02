import { describe, expect, it } from "vitest";

import { PresenceManager } from "../src/awareness/presence.js";

describe("presence manager", () => {
  it("tracks active collaborators and emits snapshot payloads", () => {
    const presence = new PresenceManager();

    presence.upsertConnection("doc-1", "socket-1", {
      displayName: "Owner Demo",
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
        isPresent: true,
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
});
