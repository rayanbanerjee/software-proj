import { describe, expect, it } from "vitest";

import { MAX_ACTIVE_WRITERS, WriterSlotManager } from "../src/writer-slots/manager.js";

describe("writer slot manager", () => {
  it("allocates writer slots deterministically and queues overflow writers", () => {
    const manager = new WriterSlotManager();

    manager.registerConnection("doc-1", "socket-1", "user-1", "write");
    manager.registerConnection("doc-1", "socket-2", "user-2", "write");
    manager.registerConnection("doc-1", "socket-3", "user-3", "write");

    expect(manager.buildSnapshotEvent("doc-1")).toEqual({
      type: "writer.slot.snapshot",
      documentId: "doc-1",
      generatedAt: expect.any(String),
      maxActiveWriters: MAX_ACTIVE_WRITERS,
      activeWriterSessionIds: ["socket-1", "socket-2"],
      queuedWriterSessionIds: ["socket-3"]
    });
  });

  it("promotes queued writers after an active writer disconnects and removes write access on downgrade", () => {
    const manager = new WriterSlotManager();

    manager.registerConnection("doc-1", "socket-1", "user-1", "write");
    manager.registerConnection("doc-1", "socket-2", "user-2", "write");
    manager.registerConnection("doc-1", "socket-3", "user-3", "write");
    manager.removeConnection("doc-1", "socket-1");

    expect(manager.buildSnapshotEvent("doc-1")).toMatchObject({
      activeWriterSessionIds: ["socket-2", "socket-3"],
      queuedWriterSessionIds: []
    });

    manager.updateUserAccess("doc-1", "user-2", "read");

    expect(manager.buildSnapshotEvent("doc-1")).toMatchObject({
      activeWriterSessionIds: ["socket-3"],
      queuedWriterSessionIds: []
    });
  });
});
