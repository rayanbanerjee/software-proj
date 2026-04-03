"use client";

import { HocuspocusProvider } from "@hocuspocus/provider";
import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";

import type {
  CollaboratorPresenceSummary,
  DocumentPermissionUpdatedEvent,
  DocumentRollbackEvent,
  DocumentSessionState,
  JoinDocumentSessionResponse,
  PresenceSnapshotEvent,
  WriterSlotSnapshotEvent
} from "@repo/shared-types";

const SESSION_STORAGE_PREFIX = "collab:last-session:";
const RECONNECT_DELAY_MS = 2_500;

type RealtimeStatus = "connecting" | "connected" | "disconnected" | "error" | "idle";

function isPresenceSnapshotEvent(value: unknown): value is PresenceSnapshotEvent {
  return !!value && typeof value === "object" && (value as PresenceSnapshotEvent).type === "presence.snapshot";
}

function isWriterSlotSnapshotEvent(value: unknown): value is WriterSlotSnapshotEvent {
  return !!value && typeof value === "object" && (value as WriterSlotSnapshotEvent).type === "writer.slot.snapshot";
}

function isDocumentPermissionUpdatedEvent(value: unknown): value is DocumentPermissionUpdatedEvent {
  return !!value && typeof value === "object" && (value as DocumentPermissionUpdatedEvent).type === "document.permission.updated";
}

function isDocumentRollbackEvent(value: unknown): value is DocumentRollbackEvent {
  return !!value && typeof value === "object" && (value as DocumentRollbackEvent).type === "document.rollback";
}

function mapSessionCollaborators(
  session: DocumentSessionState
): CollaboratorPresenceSummary[] {
  return session.collaborators.map((collaborator) => ({
    connectionStatus: collaborator.connectionStatus,
    displayName: collaborator.displayName,
    documentId: collaborator.documentId,
    isPresent: collaborator.isPresent,
    lastSeenAt: collaborator.lastSeenAt,
    sessionId: collaborator.sessionId,
    userId: collaborator.userId
  }));
}

export function useDocumentCollab(documentId: string | null) {
  const [collaborators, setCollaborators] = useState<CollaboratorPresenceSummary[]>([]);
  const [document, setDocument] = useState<Y.Doc | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPermissionEvent, setLastPermissionEvent] = useState<DocumentPermissionUpdatedEvent | null>(null);
  const [lastRollbackEvent, setLastRollbackEvent] = useState<DocumentRollbackEvent | null>(null);
  const [selfSessionId, setSelfSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [writerSlots, setWriterSlots] = useState<WriterSlotSnapshotEvent | null>(null);

  const reconnectTimerRef = useRef<number | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let currentDoc: Y.Doc | null = null;
    let currentProvider: HocuspocusProvider | null = null;

    setCollaborators([]);
    setDocument(null);
    setErrorMessage(null);
    setLastPermissionEvent(null);
    setLastRollbackEvent(null);
    setSelfSessionId(null);
    setStatus("idle");
    setWriterSlots(null);

    if (!documentId) {
      return () => {
        providerRef.current = null;
      };
    }

    const activeDocumentId = documentId;

    async function connect() {
      setStatus((current) => (current === "connected" ? current : "connecting"));
      setErrorMessage(null);

      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
        const lastKnownSessionId = window.localStorage.getItem(`${SESSION_STORAGE_PREFIX}${activeDocumentId}`) ?? undefined;
        const response = await fetch(`${apiBaseUrl}/v1/documents/${activeDocumentId}/sessions`, {
          body: JSON.stringify(
            lastKnownSessionId
              ? {
                  lastKnownSessionId
                }
              : {}
          ),
          credentials: "include",
          headers: {
            "Content-Type": "application/json"
          },
          method: "POST"
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message ?? "Failed to join the collaboration session.");
        }

        const payload = (await response.json()) as JoinDocumentSessionResponse;

        if (isCancelled) {
          return;
        }

        setCollaborators(mapSessionCollaborators(payload.session));
        setSelfSessionId(payload.session.self.sessionId);
        window.localStorage.setItem(`${SESSION_STORAGE_PREFIX}${activeDocumentId}`, payload.session.self.sessionId);

        currentDoc = new Y.Doc();
        setDocument(currentDoc);
        const websocketUrl = new URL(payload.websocketUrl);
        websocketUrl.searchParams.delete("token");

        currentProvider = new HocuspocusProvider({
          document: currentDoc,
          name: activeDocumentId,
          onAuthenticationFailed({ reason }) {
            setStatus("error");
            setErrorMessage(reason);
          },
          onDisconnect() {
            setStatus("disconnected");
          },
          onStateless({ payload: statelessPayload }) {
            let parsed: unknown;

            try {
              parsed = JSON.parse(statelessPayload);
            } catch {
              return;
            }

            if (isPresenceSnapshotEvent(parsed)) {
              setCollaborators(parsed.collaborators);
              return;
            }

            if (isWriterSlotSnapshotEvent(parsed)) {
              setWriterSlots(parsed);
              return;
            }

            if (isDocumentPermissionUpdatedEvent(parsed)) {
              setLastPermissionEvent(parsed);
              return;
            }

            if (isDocumentRollbackEvent(parsed)) {
              setLastRollbackEvent(parsed);
            }
          },
          onStatus({ status: nextStatus }) {
            if (nextStatus === "connected") {
              setStatus("connected");
              setErrorMessage(null);
              return;
            }

            setStatus(nextStatus);
          },
          token: payload.token,
          url: websocketUrl.toString()
        });
        providerRef.current = currentProvider;
        currentProvider.setAwarenessField("displayName", payload.session.self.displayName);
        currentProvider.setAwarenessField("sessionId", payload.session.self.sessionId);
        currentProvider.setAwarenessField("userId", payload.session.self.userId);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Realtime connection failed.");

        reconnectTimerRef.current = window.setTimeout(() => {
          void connect();
        }, RECONNECT_DELAY_MS);
      }
    }

    void connect();

    return () => {
      isCancelled = true;

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      currentProvider?.destroy();
      providerRef.current = null;
      currentDoc?.destroy();
    };
  }, [documentId]);

  return {
    collaborators,
    document,
    errorMessage,
    lastPermissionEvent,
    lastRollbackEvent,
    selfSessionId,
    status,
    writerSlots
  };
}
