import { describe, expect, it } from "vitest";

import {
  getPresenceEmptyStateCopy,
  getPresenceRoleLabel
} from "../src/components/documents/presence-shell";

describe("presence shell empty-state copy", () => {
  it("shows collaborator copy when the realtime session is connected", () => {
    expect(getPresenceEmptyStateCopy("connected")).toBe("No active collaborators");
  });

  it("shows connecting copy while the realtime session is starting", () => {
    expect(getPresenceEmptyStateCopy("idle")).toBe("Connecting presence...");
    expect(getPresenceEmptyStateCopy("connecting")).toBe("Connecting presence...");
  });

  it("avoids claiming the client is offline for reconnect and error states", () => {
    expect(getPresenceEmptyStateCopy("disconnected")).toBe("Presence unavailable right now");
    expect(getPresenceEmptyStateCopy("error")).toBe("Presence unavailable right now");
  });

  it("labels write-access collaborators as writers even before writer slots settle", () => {
    expect(
      getPresenceRoleLabel(
        {
          accessLevel: "write",
          connectionStatus: "active",
          displayName: "iamqafig",
          documentId: "doc-1",
          isPresent: true,
          lastSeenAt: "2026-04-24T10:00:00.000Z",
          role: "editor",
          sessionId: "session-1",
          userId: "user-1"
        },
        {
          activeWriterSessionIds: [],
          documentId: "doc-1",
          generatedAt: "2026-04-24T10:00:00.000Z",
          maxActiveWriters: 1,
          queuedWriterSessionIds: [],
          type: "writer.slot.snapshot"
        }
      )
    ).toBe("Writer");
  });

  it("still labels read-only collaborators as viewers", () => {
    expect(
      getPresenceRoleLabel(
        {
          accessLevel: "read",
          connectionStatus: "active",
          displayName: "Reader",
          documentId: "doc-1",
          isPresent: true,
          lastSeenAt: "2026-04-24T10:00:00.000Z",
          role: "viewer",
          sessionId: "session-2",
          userId: "user-2"
        },
        null
      )
    ).toBe("Viewer");
  });
});
