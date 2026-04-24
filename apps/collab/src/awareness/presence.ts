import type {
  CollaboratorPresenceSummary,
  DocumentRole,
  PresenceSnapshotEvent,
  SessionAccessLevel,
  UserProfile
} from "@repo/shared-types";

type PresenceEntry = CollaboratorPresenceSummary;

type SessionIdentity = {
  accessLevel?: SessionAccessLevel;
  displayName: string | null;
  role?: DocumentRole;
  user: Pick<UserProfile, "id" | "name">;
};

type ResumeResult = {
  current: PresenceEntry;
  resumedFromSessionId: string | null;
};

export const PRESENCE_SWEEP_INTERVAL_MS = 5_000;
export const PRESENCE_STALE_TIMEOUT_MS = 30 * 60_000;

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
      role: identity.role,
      accessLevel: identity.accessLevel,
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

  refreshConnection(documentId: string, sessionId: string, identity: SessionIdentity): PresenceEntry {
    const updated = this.markAwarenessActive(documentId, sessionId);

    if (updated) {
      return updated;
    }

    return this.upsertConnection(documentId, sessionId, identity);
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

  removeConnectionsForUser(documentId: string, userId: string): PresenceEntry[] {
    const sessions = this.documents.get(documentId);

    if (!sessions) {
      return [];
    }

    const removed: PresenceEntry[] = [];

    for (const [sessionId, entry] of sessions.entries()) {
      if (entry.userId !== userId) {
        continue;
      }

      removed.push({
        ...entry,
        isPresent: false,
        lastSeenAt: new Date().toISOString(),
        connectionStatus: "disconnected"
      });
      sessions.delete(sessionId);
    }

    if (sessions.size === 0) {
      this.documents.delete(documentId);
    }

    return removed;
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

    const byUserId = new Map<string, CollaboratorPresenceSummary>();

    for (const entry of sessions.values()) {
      if (!entry.isPresent || entry.connectionStatus !== "active") {
        continue;
      }

      const existing = byUserId.get(entry.userId);

      if (!existing) {
        byUserId.set(entry.userId, entry);
        continue;
      }

      const existingTime = Date.parse(existing.lastSeenAt);
      const nextTime = Date.parse(entry.lastSeenAt);

      if (Number.isNaN(existingTime) || (!Number.isNaN(nextTime) && nextTime >= existingTime)) {
        byUserId.set(entry.userId, entry);
      }
    }

    return Array.from(byUserId.values()).sort((left, right) => left.userId.localeCompare(right.userId));
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
