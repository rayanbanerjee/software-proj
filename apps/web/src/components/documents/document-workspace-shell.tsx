"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  AiAction,
  AiProposal,
  AiRequestStatus,
  AiStreamEvent,
  CommentRecord,
  CollaboratorPresenceSummary,
} from "@repo/shared-types";

import type {
  DocumentOverlay,
  DocumentRecord,
  DocumentScreenState,
  SyncConnectionState,
  SyncPermissionState
} from "../../lib/app-shell";
import type { ExportPanelState } from "../../lib/export-panel-state";
import type { VersionHistoryEntry } from "../../lib/version-history";
import { consumeSseBuffer } from "../../lib/ai-stream";
import { BaseEditor } from "../../editor/base-editor";
import {
  createDocumentComment,
  listDocumentComments,
  renameWorkspaceDocument
} from "../../lib/documents";
import { DocumentStateShell } from "./document-state-shell";
import { DocumentUtilityPanel } from "./document-utility-panel";
import { EditorToolbarShell } from "./editor-toolbar-shell";
import { ExportModalShell } from "./export-modal-shell";
import { OfflineStatusBanner } from "./offline-status-banner";
import { PresenceShell } from "./presence-shell";
import { SharingModalShell } from "./sharing-modal-shell";
import { useDocumentCollab } from "./use-document-collab";

interface DocumentWorkspaceShellProps {
  document: DocumentRecord;
  exportPanelState: ExportPanelState;
  overlay: DocumentOverlay;
  permissionState: SyncPermissionState;
  realtimeDocumentId: string | null;
  serverStateVector: string | null;
  showDebugControls?: boolean;
  syncState: SyncConnectionState;
  versionHistoryEntries: readonly VersionHistoryEntry[];
  view: DocumentScreenState;
}

export function DocumentWorkspaceShell({
  document,
  exportPanelState,
  overlay,
  permissionState,
  realtimeDocumentId,
  serverStateVector,
  showDebugControls = false,
  syncState,
  versionHistoryEntries,
  view
}: DocumentWorkspaceShellProps) {
  const [documentTitle, setDocumentTitle] = useState(document.title);
  const [blameMode, setBlameMode] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [commentsErrorMessage, setCommentsErrorMessage] = useState<string | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [renameErrorMessage, setRenameErrorMessage] = useState<string | null>(null);
  const [aiState, setAiState] = useState<null | {
    action: AiAction;
    errorMessage?: string | null;
    proposal: AiProposal | null;
    requestStatus: AiRequestStatus | "idle";
    selection: {
      from: number;
      to: number;
    };
    selectedText: string;
  }>(null);
  const [pendingAiApplication, setPendingAiApplication] = useState<null | {
    proposalId: string;
    selection: {
      from: number;
      to: number;
    };
    text: string;
  }>(null);
  const aiStreamAbortRef = useRef<AbortController | null>(null);
  const collab = useDocumentCollab(realtimeDocumentId);
  const apiDocumentId = realtimeDocumentId ?? null;
  const editorInstanceKey = `${document.id}:${realtimeDocumentId ?? "fallback"}`;
  const panelMode = blameMode ? "changes" : "comments";
  const collaboratorSeeds = useMemo(() => {
    const entries = collab.collaborators.length > 0
      ? collab.collaborators
      : realtimeDocumentId
        ? [{
            userId: realtimeDocumentId,
            sessionId: `${realtimeDocumentId}-local`
          } as CollaboratorPresenceSummary]
        : [];

    return entries.map((collaborator) => collaborator.userId || collaborator.sessionId);
  }, [collab.collaborators, realtimeDocumentId]);

  useEffect(() => {
    setDocumentTitle(document.title);
    setRenameErrorMessage(null);
  }, [document.id, document.title]);

  useEffect(() => {
    return () => {
      aiStreamAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!apiDocumentId) {
      setComments([]);
      setCommentsErrorMessage(null);
      setIsLoadingComments(false);
      return;
    }

    const documentId = apiDocumentId;
    let isActive = true;

    async function loadComments() {
      setIsLoadingComments(true);
      setCommentsErrorMessage(null);

      try {
        const nextComments = await listDocumentComments(documentId);

        if (!isActive) {
          return;
        }

        setComments(nextComments);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setComments([]);
        setCommentsErrorMessage(error instanceof Error ? error.message : "Failed to load comments.");
      } finally {
        if (isActive) {
          setIsLoadingComments(false);
        }
      }
    }

    void loadComments();

    return () => {
      isActive = false;
    };
  }, [apiDocumentId]);

  async function submitAiAction(payload: {
    action: AiAction;
    from: number;
    selectedText: string;
    to: number;
  }) {
    if (!apiDocumentId) {
      setAiState({
        action: payload.action,
        errorMessage: "AI is unavailable until this document is loaded from the server.",
        proposal: null,
        requestStatus: "failed",
        selectedText: payload.selectedText,
        selection: {
          from: payload.from,
          to: payload.to
        }
      });
      return;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    aiStreamAbortRef.current?.abort();
    const abortController = new AbortController();
    aiStreamAbortRef.current = abortController;

    setAiState({
      action: payload.action,
      errorMessage: null,
      proposal: null,
      requestStatus: "running",
      selectedText: payload.selectedText,
      selection: {
        from: payload.from,
        to: payload.to
      }
    });

    try {
      const response = await fetch(`${apiBaseUrl}/v1/documents/${apiDocumentId}/ai/stream`, {
        body: JSON.stringify({
          action: payload.action,
          prompt: payload.action === "translate" ? "English" : null,
          context: {
            scope: "selection",
            selectedText: payload.selectedText,
            surroundingText: null
          },
          maskPersonalData: false
        }),
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        method: "POST",
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error?.message ?? "AI request failed.");
      }

      if (!response.body) {
        throw new Error("AI streaming is unavailable.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const consumed = consumeSseBuffer(buffer);
        buffer = consumed.remainder;

        for (const event of consumed.events) {
          applyAiStreamEvent(event, payload);
        }
      }

      const trailing = decoder.decode();

      if (trailing) {
        buffer += trailing;
      }

      if (buffer.trim()) {
        const consumed = consumeSseBuffer(`${buffer}\n\n`);

        for (const event of consumed.events) {
          applyAiStreamEvent(event, payload);
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setAiState({
        action: payload.action,
        errorMessage: error instanceof Error ? error.message : "AI request failed.",
        proposal: null,
        requestStatus: "failed",
        selectedText: payload.selectedText,
        selection: {
          from: payload.from,
          to: payload.to
        }
      });
    } finally {
      if (aiStreamAbortRef.current === abortController) {
        aiStreamAbortRef.current = null;
      }
    }
  }

  function applyAiStreamEvent(
    event: AiStreamEvent,
    payload: {
      action: AiAction;
      from: number;
      selectedText: string;
      to: number;
    }
  ) {
    if (event.type === "started") {
      setAiState({
        action: payload.action,
        errorMessage: null,
        proposal: null,
        requestStatus: "running",
        selectedText: payload.selectedText,
        selection: {
          from: payload.from,
          to: payload.to
        }
      });
      return;
    }

    if (event.type === "delta") {
      setAiState({
        action: payload.action,
        errorMessage: null,
        proposal: {
          action: payload.action,
          createdAt: new Date().toISOString(),
          documentId: apiDocumentId ?? document.id,
          isStale: false,
          originalText: payload.selectedText,
          proposalId: `streaming-${event.requestId}`,
          proposedText: event.text,
          requestId: event.requestId,
          summary: "Streaming suggestion in progress."
        },
        requestStatus: "running",
        selectedText: payload.selectedText,
        selection: {
          from: payload.from,
          to: payload.to
        }
      });
      return;
    }

    if (event.type === "completed") {
      setAiState({
        action: payload.action,
        errorMessage: null,
        proposal: event.proposal,
        requestStatus: "succeeded",
        selectedText: payload.selectedText,
        selection: {
          from: payload.from,
          to: payload.to
        }
      });
      return;
    }

    setAiState({
      action: payload.action,
      errorMessage: event.errorMessage,
      proposal: null,
      requestStatus: "failed",
      selectedText: payload.selectedText,
      selection: {
        from: payload.from,
        to: payload.to
      }
    });
  }

  async function acceptAiProposal() {
    if (!aiState?.proposal || !apiDocumentId) {
      return;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    const response = await fetch(`${apiBaseUrl}/v1/documents/${apiDocumentId}/ai/proposals/accept`, {
      body: JSON.stringify({
        proposalId: aiState.proposal.proposalId
      }),
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      setAiState({
        ...aiState,
        errorMessage: errorPayload?.error?.message ?? "Failed to apply AI proposal.",
        requestStatus: "failed"
      });
      return;
    }

    setPendingAiApplication(null);
    setAiState(null);
  }

  async function rejectAiProposal() {
    if (!aiState?.proposal) {
      setAiState(null);
      return;
    }

    if (!apiDocumentId) {
      setAiState(null);
      return;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    await fetch(`${apiBaseUrl}/v1/documents/${apiDocumentId}/ai/proposals/reject`, {
      body: JSON.stringify({
        proposalId: aiState.proposal.proposalId
      }),
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    }).catch(() => null);

    setAiState(null);
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!apiDocumentId || isSubmittingComment) {
      return;
    }

    const nextBody = commentDraft.trim();

    if (!nextBody) {
      return;
    }

    setIsSubmittingComment(true);
    setCommentsErrorMessage(null);

    try {
      const comment = await createDocumentComment(apiDocumentId, nextBody);
      setComments((currentComments) => [...currentComments, comment]);
      setCommentDraft("");
    } catch (error) {
      setCommentsErrorMessage(error instanceof Error ? error.message : "Failed to add comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleRenameTitle(nextTitle: string) {
    if (!apiDocumentId || isRenamingTitle) {
      return;
    }

    setIsRenamingTitle(true);
    setRenameErrorMessage(null);

    try {
      const renamedDocument = await renameWorkspaceDocument(apiDocumentId, nextTitle);
      setDocumentTitle(renamedDocument.title);
    } catch (error) {
      setDocumentTitle(document.title);
      setRenameErrorMessage(error instanceof Error ? error.message : "Failed to rename document.");
      throw error;
    } finally {
      setIsRenamingTitle(false);
    }
  }

  return (
    <div className="document-workspace-shell">
      <div className="document-workspace-grid">
        <div className="document-workspace-main document-workspace-main-v2">
          <header className="document-workspace-header">
            <div>
              <span className="workspace-kicker">Document</span>
              <h2>{documentTitle}</h2>
            </div>
            <div className="document-workspace-meta">
              <span>{document.role}</span>
              <span>{document.updatedLabel}</span>
            </div>
          </header>

          <EditorToolbarShell
            blameMode={blameMode}
            documentId={document.id}
            onToggleBlame={() => setBlameMode((current) => !current)}
            overlay={overlay === "ai" ? null : overlay}
            showDebugControls={showDebugControls}
            syncState={syncState}
            view={view}
          />

          <PresenceShell
            collaborators={collab.collaborators}
            connectionStatus={collab.status}
            selfSessionId={collab.selfSessionId}
            writerSlots={collab.writerSlots}
          />

          {syncState !== "online" ? <OfflineStatusBanner permissionState={permissionState} state={syncState} /> : null}
          {collab.errorMessage ? (
            <div className="offline-banner" role="status">
              <strong>Realtime</strong>
              <span>{collab.errorMessage}</span>
            </div>
          ) : null}
          {collab.lastRollbackEvent ? (
            <div className="offline-banner" role="status">
              <strong>Rollback event</strong>
              <span>
                Revision {collab.lastRollbackEvent.revisionId} restored
                {" "}
                {collab.lastRollbackEvent.restoredFromRevisionId}
                {" "}
                and was broadcast to active collaborators.
              </span>
            </div>
          ) : null}
          {renameErrorMessage ? (
            <div className="offline-banner" role="status">
              <strong>Rename</strong>
              <span>{renameErrorMessage}</span>
            </div>
          ) : null}

          {view === "ready" ? (
            <BaseEditor
              accessLevel={permissionState === "revoked" ? "none" : permissionState === "read-only" ? "read" : "write"}
              blameMode={blameMode}
              collaboratorSeeds={collaboratorSeeds}
              collaborationDocument={collab.document}
              collaborationProvider={collab.provider}
              collaborationUser={collab.selfUser}
              documentId={document.id}
              initialTitle={documentTitle}
              isRenamingTitle={isRenamingTitle}
              key={editorInstanceKey}
              onAiActionSelect={submitAiAction}
              onAiApplicationHandled={() => {
                setPendingAiApplication(null);
                setAiState(null);
              }}
              onRenameTitle={handleRenameTitle}
              pendingAiApplication={pendingAiApplication}
              role={document.role}
              serverStateVector={serverStateVector}
              syncState={syncState}
            />
          ) : (
            <DocumentStateShell document={document} view={view} />
          )}

          <form
            className="document-comment-composer"
            onSubmit={(event) => void handleCommentSubmit(event)}
          >
            <input
              disabled={!apiDocumentId || isSubmittingComment}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder={apiDocumentId ? "Add a document comment" : "Comments require a server document"}
              type="text"
              value={commentDraft}
            />
            <button disabled={!apiDocumentId || isSubmittingComment || commentDraft.trim().length === 0} type="submit">
              {isSubmittingComment ? "..." : "Send"}
            </button>
          </form>

          {overlay === "sharing" ? <SharingModalShell /> : null}
          {overlay === "export" ? <ExportModalShell documentId={document.id} panelState={exportPanelState} /> : null}
        </div>

        <aside className="document-workspace-sidebar document-workspace-sidebar-v2">
          <DocumentUtilityPanel
            aiState={aiState}
            collaborators={collab.collaborators}
            comments={comments}
            commentsErrorMessage={commentsErrorMessage}
            isLoadingComments={isLoadingComments}
            mode={panelMode}
            onAcceptProposal={acceptAiProposal}
            onRejectProposal={rejectAiProposal}
            versionHistoryEntries={versionHistoryEntries}
          />
        </aside>
      </div>
    </div>
  );
}
