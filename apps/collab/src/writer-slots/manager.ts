import type { SessionAccessLevel, WriterSlotSnapshotEvent } from "@repo/shared-types";

type SlotEntry = {
  accessLevel: SessionAccessLevel;
  order: number;
  sessionId: string;
  userId: string;
};

export const MAX_ACTIVE_WRITERS = 2;

export class WriterSlotManager {
  private readonly documents = new Map<string, Map<string, SlotEntry>>();
  private sequence = 0;

  private getDocumentEntries(documentId: string) {
    const existing = this.documents.get(documentId);

    if (existing) {
      return existing;
    }

    const created = new Map<string, SlotEntry>();
    this.documents.set(documentId, created);
    return created;
  }

  registerConnection(
    documentId: string,
    sessionId: string,
    userId: string,
    accessLevel: SessionAccessLevel
  ) {
    const entries = this.getDocumentEntries(documentId);

    entries.set(sessionId, {
      accessLevel,
      order: ++this.sequence,
      sessionId,
      userId
    });
  }

  removeConnection(documentId: string, sessionId: string) {
    const entries = this.documents.get(documentId);

    if (!entries) {
      return;
    }

    entries.delete(sessionId);

    if (entries.size === 0) {
      this.documents.delete(documentId);
    }
  }

  updateUserAccess(
    documentId: string,
    userId: string,
    accessLevel: SessionAccessLevel | "none"
  ) {
    const entries = this.documents.get(documentId);

    if (!entries) {
      return;
    }

    for (const [sessionId, entry] of entries.entries()) {
      if (entry.userId !== userId) {
        continue;
      }

      if (accessLevel === "none") {
        entries.delete(sessionId);
        continue;
      }

      entries.set(sessionId, {
        ...entry,
        accessLevel
      });
    }

    if (entries.size === 0) {
      this.documents.delete(documentId);
    }
  }

  private getOrderedWritableEntries(documentId: string) {
    const entries = this.documents.get(documentId);

    if (!entries) {
      return [];
    }

    return Array.from(entries.values())
      .filter((entry) => entry.accessLevel === "write")
      .sort((left, right) => {
        if (left.order === right.order) {
          return left.sessionId.localeCompare(right.sessionId);
        }

        return left.order - right.order;
      });
  }

  buildSnapshotEvent(documentId: string): WriterSlotSnapshotEvent {
    const writableEntries = this.getOrderedWritableEntries(documentId);
    const active = writableEntries.slice(0, MAX_ACTIVE_WRITERS);
    const queued = writableEntries.slice(MAX_ACTIVE_WRITERS);

    return {
      type: "writer.slot.snapshot",
      documentId,
      generatedAt: new Date().toISOString(),
      maxActiveWriters: MAX_ACTIVE_WRITERS,
      activeWriterSessionIds: active.map((entry) => entry.sessionId),
      queuedWriterSessionIds: queued.map((entry) => entry.sessionId)
    };
  }
}
