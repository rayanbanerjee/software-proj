import type { CSSProperties } from "react";
import type {
  AiAction,
  AiProposal,
  AiRequestStatus,
  CommentRecord,
  CollaboratorPresenceSummary
} from "@repo/shared-types";

import { getCollaboratorColor } from "../../lib/collab-colors";
import type { VersionHistoryEntry } from "../../lib/version-history";

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
  collaborators: readonly CollaboratorPresenceSummary[];
  comments: readonly CommentRecord[];
  commentsErrorMessage?: string | null;
  isLoadingComments?: boolean;
  mode: "comments" | "changes";
  onAcceptProposal?: () => void;
  onRejectProposal?: () => void;
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
  collaborators,
  comments,
  commentsErrorMessage,
  isLoadingComments = false,
  mode,
  onAcceptProposal,
  onRejectProposal,
  versionHistoryEntries
}: DocumentUtilityPanelProps) {
  if (mode === "changes") {
    const changes = [
      ...collaborators.map((collaborator) => ({
        key: collaborator.sessionId,
        label: collaborator.displayName ?? "Anonymous user",
        summary: collaborator.connectionStatus === "active"
          ? "active in the current collaborative session"
          : collaborator.connectionStatus,
        seed: collaborator.userId || collaborator.sessionId,
        when: "Now"
      })),
      ...versionHistoryEntries.map((entry) => ({
        key: entry.key,
        label: entry.label,
        summary: entry.summary,
        seed: entry.key,
        when: entry.when
      }))
    ];

    return (
      <section className="document-utility-panel" id="changes">
        <div className="document-utility-panel-header">
          <span className="section-chip">Changes</span>
          <div>
            <h3>List of Changes</h3>
            <p>Color-coded revisions and active collaborative activity.</p>
          </div>
        </div>
        <div className="change-list">
          {changes.length === 0 ? (
            <article className="change-list-entry">
              <strong>No live changes yet</strong>
              <p>Turn on blame mode after collaborative edits or revisions exist.</p>
              <span>Waiting for activity</span>
            </article>
          ) : changes.map((change) => {
            const color = getCollaboratorColor(change.seed);

            return (
              <article
                className="change-list-entry"
                key={change.key}
                style={{
                  "--change-fill": color.fill,
                  "--change-ring": color.ring
                } as CSSProperties}
              >
                <span className="change-list-marker" aria-hidden="true" />
                <div>
                  <strong>{change.label}</strong>
                  <p>{change.summary}</p>
                  <span>{change.when}</span>
                </div>
              </article>
            );
          })}
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
              ? "Generating proposal..."
              : aiState.requestStatus === "failed"
                ? aiState.errorMessage ?? "AI request failed."
                : aiState.requestStatus === "succeeded"
                  ? aiState.proposal?.summary ?? "Proposal ready to review."
                  : aiState.requestStatus}
          </span>
          {aiState.proposal ? (
            <>
              <div className="comment-ai-preview">
                <strong>Proposal</strong>
                <p>{aiState.proposal.proposedText}</p>
              </div>
              <div className="comment-ai-actions">
                <button onClick={onRejectProposal} type="button">Dismiss</button>
                <button onClick={onAcceptProposal} type="button">Apply</button>
              </div>
            </>
          ) : null}
        </article>
      ) : null}

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
          <p>Use the message field below the editor to add the first document comment.</p>
        </article>
      ) : null}
    </section>
  );
}
