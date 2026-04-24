import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type {
  AiAction,
  AiProposal,
  AiRequestStatus,
  CommentRecord
} from "@repo/shared-types";

import { getCollaboratorColor } from "../../lib/collab-colors";
import { getVersionHistoryEntries, type VersionHistoryEntry } from "../../lib/version-history";
import { getRevisionDetail } from "../../lib/versions";

interface DocumentUtilityPanelProps {
  aiState:
    | {
        action: AiAction;
        errorMessage?: string | null;
        proposal?: AiProposal | null;
        requestStatus: AiRequestStatus | "idle";
        selectedText: string;
      }
    | null;
  comments: readonly CommentRecord[];
  commentComposer?: ReactNode;
  commentsErrorMessage?: string | null;
  documentId?: string | null;
  isLoadingComments?: boolean;
  mode: "comments" | "changes";
  onAcceptProposal?: () => void;
  onAcceptEditedProposal?: (editedText: string) => void;
  onExitBlame?: () => void;
  onRejectProposal?: () => void;
  onRevisionComparisonChange?: (comparison: {
    errorMessage?: string | null;
    isLoading: boolean;
    label: string;
    revisionId: string | null;
    snapshotText?: string | null;
    title?: string | null;
  } | null) => void;
  versionHistoryEntries: readonly VersionHistoryEntry[];
}

function getActionLabel(action: AiAction) {
  switch (action) {
    case "rewrite":
      return "Rewrite";
    case "summarize":
      return "Summarize";
    case "translate":
      return "Translate to English";
    case "restructure":
      return "Tone adjustment";
  }
}

export function DocumentUtilityPanel({
  aiState,
  comments,
  commentComposer = null,
  commentsErrorMessage,
  documentId = null,
  isLoadingComments = false,
  mode,
  onAcceptProposal,
  onAcceptEditedProposal,
  onExitBlame,
  onRejectProposal,
  onRevisionComparisonChange,
  versionHistoryEntries
}: DocumentUtilityPanelProps) {
  const [editedProposalText, setEditedProposalText] = useState("");
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [revisionEntries, setRevisionEntries] = useState<readonly VersionHistoryEntry[]>(versionHistoryEntries);
  const [revisionError, setRevisionError] = useState<string | null>(null);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const [isLoadingRevision, setIsLoadingRevision] = useState(false);

  useEffect(() => {
    setRevisionEntries(versionHistoryEntries);
  }, [versionHistoryEntries]);

  useEffect(() => {
    setIsEditingProposal(false);
    setEditedProposalText(aiState?.proposal?.proposedText ?? "");
  }, [aiState?.proposal?.proposalId, aiState?.proposal?.proposedText]);

  useEffect(() => {
    if (mode !== "changes" || !documentId) {
      return;
    }

    let isActive = true;
    setIsRefreshingHistory(true);

    void getVersionHistoryEntries(documentId)
      .then((entries) => {
        if (!isActive) {
          return;
        }

        setRevisionEntries(entries);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setRevisionEntries(versionHistoryEntries);
      })
      .finally(() => {
        if (isActive) {
          setIsRefreshingHistory(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [documentId, mode, versionHistoryEntries]);

  useEffect(() => {
    if (revisionEntries.length === 0) {
      setSelectedRevisionId(null);
      return;
    }

    setSelectedRevisionId((current) =>
      current && revisionEntries.some((entry) => entry.key === current)
        ? current
        : revisionEntries[0]?.key ?? null
    );
  }, [revisionEntries]);

  useEffect(() => {
    if (mode !== "changes" || !documentId || !selectedRevisionId) {
      setRevisionError(null);
      onRevisionComparisonChange?.(null);
      return;
    }

    let isActive = true;
    const selectedEntry = revisionEntries.find((entry) => entry.key === selectedRevisionId) ?? null;

    setIsLoadingRevision(true);
    setRevisionError(null);
    onRevisionComparisonChange?.({
      isLoading: true,
      label: selectedEntry?.label ?? "Selected revision",
      revisionId: selectedRevisionId,
      snapshotText: null,
      title: selectedEntry?.label ?? null
    });

    void getRevisionDetail(documentId, selectedRevisionId)
      .then((detail) => {
        if (!isActive) {
          return;
        }

        onRevisionComparisonChange?.({
          isLoading: false,
          label: selectedEntry?.label ?? detail.label,
          revisionId: detail.revisionId,
          snapshotText: detail.snapshotText ?? null,
          title: detail.title ?? selectedEntry?.label ?? null
        });
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        const errorMessage = error instanceof Error ? error.message : "Failed to load revision preview.";

        setRevisionError(errorMessage);
        onRevisionComparisonChange?.({
          errorMessage,
          isLoading: false,
          label: selectedEntry?.label ?? "Selected revision",
          revisionId: selectedRevisionId,
          snapshotText: null,
          title: selectedEntry?.label ?? null
        });
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingRevision(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [documentId, mode, revisionEntries, selectedRevisionId]);

  if (mode === "changes") {
    return (
      <section className="document-utility-panel" id="changes">
        <div className="document-utility-panel-header">
          <span className="section-chip">Changes</span>
          <div className="document-utility-panel-header-row">
            <div>
              <h3>List of Changes</h3>
              <p>
                Select a revision to compare it with the current document.
                {isRefreshingHistory ? " Refreshing history..." : ""}
              </p>
            </div>
            {onExitBlame ? (
              <button className="document-utility-panel-back" onClick={onExitBlame} type="button">
                Back to writing
              </button>
            ) : null}
          </div>
        </div>
        <div className="change-history-layout">
          <div className="change-list">
          {revisionEntries.length === 0 ? (
            <article className="change-list-entry">
              <strong>No live changes yet</strong>
              <p>Turn on blame mode after collaborative edits or revisions exist.</p>
              <span>Waiting for activity</span>
            </article>
          ) : revisionEntries.map((entry) => {
            const color = getCollaboratorColor(entry.key);

            return (
              <article
                className={`change-list-entry${selectedRevisionId === entry.key ? " change-list-entry-active" : ""}`}
                key={entry.key}
                onClick={() => setSelectedRevisionId(entry.key)}
                onFocus={() => setSelectedRevisionId(entry.key)}
                tabIndex={0}
                style={{
                  "--change-fill": color.fill,
                  "--change-ring": color.ring
                } as CSSProperties}
              >
                <span className="change-list-marker" aria-hidden="true" />
                <div>
                  <strong>{entry.label}</strong>
                  <p>{entry.changeDescription}</p>
                  <span>{entry.authorLabel} · {entry.when}</span>
                </div>
              </article>
            );
          })}
          </div>
          {isLoadingRevision || revisionError ? (
            <article className="comment-empty-state">
              <strong>{isLoadingRevision ? "Loading revision" : "Revision unavailable"}</strong>
              <p>{revisionError ?? "Preparing the main workspace comparison."}</p>
            </article>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="document-utility-panel" id="comments">
      <div className="document-utility-panel-header">
        <span className="section-chip">Comments</span>
        <div>
          <h3>Comments</h3>
          <p>Comments and AI follow-up now share the same live review panel.</p>
        </div>
      </div>

      {aiState ? (
        <article className="comment-empty-state comment-empty-state-accent">
          <strong>{getActionLabel(aiState.action)}</strong>
          <p>{aiState.selectedText}</p>
          <span className="comment-ai-status">
            {aiState.requestStatus === "running" || aiState.requestStatus === "queued"
              ? aiState.proposal?.proposedText
                ? "Streaming proposal..."
                : "Generating proposal..."
              : aiState.requestStatus === "failed"
                ? aiState.errorMessage ?? "AI request failed."
                : aiState.requestStatus === "succeeded"
                  ? aiState.proposal?.summary ?? "Proposal ready to review."
                  : aiState.requestStatus}
          </span>
          {aiState.proposal ? (
            <>
              <div className="comment-ai-preview">
                <strong>{isEditingProposal ? "Edit proposal" : "Proposal"}</strong>
                {isEditingProposal ? (
                  <textarea
                    className="comment-ai-edit-input"
                    onChange={(event) => setEditedProposalText(event.target.value)}
                    value={editedProposalText}
                  />
                ) : (
                  <p>{aiState.proposal.proposedText}</p>
                )}
              </div>
              {aiState.requestStatus === "succeeded" ? (
                <div className="comment-ai-actions">
                  {isEditingProposal ? (
                    <>
                      <button
                        onClick={() => {
                          setIsEditingProposal(false);
                          setEditedProposalText(aiState.proposal?.proposedText ?? "");
                        }}
                        type="button"
                      >
                        Cancel edit
                      </button>
                      <button
                        disabled={editedProposalText.trim().length === 0}
                        onClick={() => onAcceptEditedProposal?.(editedProposalText)}
                        type="button"
                      >
                        Apply edited version
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={onRejectProposal} type="button">Dismiss</button>
                      <button onClick={() => setIsEditingProposal(true)} type="button">Edit before accepting</button>
                      <button onClick={onAcceptProposal} type="button">Apply</button>
                    </>
                  )}
                </div>
              ) : null}
            </>
          ) : null}
        </article>
      ) : null}

      {commentComposer}

      {isLoadingComments ? (
        <article className="comment-empty-state">
          <strong>Loading comments</strong>
          <p>Pulling the latest discussion for this document.</p>
        </article>
      ) : null}

      {commentsErrorMessage ? (
        <article className="comment-empty-state comment-empty-state-accent">
          <strong>Comments unavailable</strong>
          <p>{commentsErrorMessage}</p>
        </article>
      ) : null}

      {comments.length > 0 ? (
        <div className="comment-thread-list">
          {comments.map((comment) => (
            <article className="comment-thread-entry" key={comment.id}>
              <div className="comment-thread-header">
                <strong>{comment.authorName ?? "Anonymous user"}</strong>
                <span>{new Date(comment.createdAt).toLocaleString()}</span>
              </div>
              <p>{comment.body}</p>
            </article>
          ))}
        </div>
      ) : !isLoadingComments && !commentsErrorMessage ? (
        <article className="comment-empty-state">
          <strong>No comments yet</strong>
          <p>Add the first comment from the message field above.</p>
        </article>
      ) : null}
    </section>
  );
}
