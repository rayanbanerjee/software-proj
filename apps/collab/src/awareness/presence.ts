import type { CollaboratorPresenceSummary, PresenceSnapshotEvent, UserProfile } from "@repo/shared-types";

type PresenceEntry = CollaboratorPresenceSummary;

type SessionIdentity = {
  displayName: string | null;
  user: Pick<UserProfile, "id" | "name">;
};

type ResumeResult = {
  current: PresenceEntry;
  resumedFromSessionId: string | null;
};

export const PRESENCE_SWEEP_INTERVAL_MS = 5_000;
export const PRESENCE_STALE_TIMEOUT_MS = 45_000;

export class PresenceManager {
  private readonly documents = new Map<string, Map<string, PresenceEntry>>();

  private getDocumentSessions(documentId: string): Map<string, PresenceEntry> {
    const existing = this.documents.get(documentId);

    if (existing) {
      return existing;
    }

    const created = new Map<string, PresenceEntry>();
    this.documents.set(documentId, created);
    return created;
  }

  upsertConnection(documentId: string, sessionId: string, identity: SessionIdentity): PresenceEntry {
    const now = new Date().toISOString();
    const sessions = this.getDocumentSessions(documentId);
    const next: PresenceEntry = {
      sessionId,
      documentId,
      userId: identity.user.id,
      displayName: identity.displayName ?? identity.user.name,
      isPresent: true,
      lastSeenAt: now,
      connectionStatus: "active"
    };

    sessions.set(sessionId, next);

    return next;
  }

  resumeConnection(
    documentId: string,
    nextSessionId: string,
    previousSessionId: string | null | undefined,
    identity: SessionIdentity
  ): ResumeResult {
    const sessions = this.getDocumentSessions(documentId);
    const requestedPreviousSessionId = previousSessionId?.trim() || null;

    if (requestedPreviousSessionId) {
      const previous = sessions.get(requestedPreviousSessionId);

      if (previous && previous.userId === identity.user.id) {
        sessions.delete(requestedPreviousSessionId);

        return {
          current: this.upsertConnection(documentId, nextSessionId, identity),
          resumedFromSessionId: requestedPreviousSessionId
        };
      }
    }

    return {
      current: this.upsertConnection(documentId, nextSessionId, identity),
      resumedFromSessionId: null
    };
  }

  markAwarenessActive(documentId: string, sessionId: string): PresenceEntry | null {
    const sessions = this.documents.get(documentId);
    if (!sessions) {
      return null;
    }

    const existing = sessions.get(sessionId);

    if (!existing) {
      return null;
    }

    const updated: PresenceEntry = {
      ...existing,
      isPresent: true,
      lastSeenAt: new Date().toISOString(),
      connectionStatus: "active"
    };

    sessions.set(sessionId, updated);
    return updated;
  }

  removeConnection(documentId: string, sessionId: string): PresenceEntry | null {
    const sessions = this.documents.get(documentId);
    if (!sessions) {
      return null;
    }

    const existing = sessions.get(sessionId);

    if (!existing) {
      return null;
    }

    const updated: PresenceEntry = {
      ...existing,
      isPresent: false,
      lastSeenAt: new Date().toISOString(),
      connectionStatus: "disconnected"
    };

    sessions.set(sessionId, updated);

    return updated;
  }

  pruneStaleConnections(
    now: number,
    staleAfterMs: number
  ): Array<{
    documentId: string;
    removed: PresenceEntry[];
  }> {
    const results: Array<{
      documentId: string;
      removed: PresenceEntry[];
    }> = [];

    for (const [documentId, sessions] of this.documents.entries()) {
      const removed: PresenceEntry[] = [];

      for (const [sessionId, entry] of sessions.entries()) {
        const lastSeen = Date.parse(entry.lastSeenAt);

        if (Number.isNaN(lastSeen) || now - lastSeen < staleAfterMs) {
          continue;
        }

        sessions.delete(sessionId);
        const staleEntry: PresenceEntry = {
          ...entry,
          isPresent: false,
          lastSeenAt: new Date(now).toISOString(),
          connectionStatus: "stale"
        };

        removed.push(staleEntry);
      }

      if (sessions.size === 0) {
        this.documents.delete(documentId);
      }

      if (removed.length > 0) {
        results.push({
          documentId,
          removed
        });
      }
    }

    return results;
  }

  getSnapshot(documentId: string): CollaboratorPresenceSummary[] {
    const sessions = this.documents.get(documentId);

    if (!sessions) {
      return [];
    }

    return Array.from(sessions.values())
      .filter((entry) => entry.isPresent && entry.connectionStatus === "active")
      .sort((left, right) => {
      if (left.userId === right.userId) {
        return left.sessionId.localeCompare(right.sessionId);
      }

      return left.userId.localeCompare(right.userId);
      });
  }

  buildSnapshotEvent(documentId: string): PresenceSnapshotEvent {
    return {
      type: "presence.snapshot",
      documentId,
      generatedAt: new Date().toISOString(),
      collaborators: this.getSnapshot(documentId)
    };
  }
}
