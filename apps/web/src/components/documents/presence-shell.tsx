import type { CSSProperties } from "react";
import { getCollaboratorColor } from "../../lib/collab-colors";
import type {
  CollaboratorPresenceSummary,
  WriterSlotSnapshotEvent
} from "@repo/shared-types";

interface PresenceShellProps {
  collaborators?: readonly CollaboratorPresenceSummary[];
  connectionStatus?: "connecting" | "connected" | "disconnected" | "error" | "idle";
  selfSessionId?: string | null;
  writerSlots?: WriterSlotSnapshotEvent | null;
}

export function PresenceShell({
  collaborators,
  connectionStatus = "idle",
  selfSessionId = null,
  writerSlots = null
}: PresenceShellProps) {
  const entries = collaborators ?? [];
  const isMuted = connectionStatus !== "connected";

  return (
    <section className={`presence-shell${isMuted ? " presence-shell-muted" : ""}`} id="participants">
      <div className="presence-strip-header">
        <div className="presence-strip-copy">
          <h3>Presence</h3>
          <p>{entries.length} active</p>
        </div>
        {writerSlots ? (
          <div className="presence-writer-summary">
            {writerSlots.activeWriterSessionIds.length}/{writerSlots.maxActiveWriters} writers
          </div>
        ) : null}
      </div>

      <div className="presence-ring-row">
        {entries.length === 0 ? (
          <span className="presence-empty-copy">
            {connectionStatus === "connected"
              ? "No active collaborators"
              : "Presence unavailable while offline"}
          </span>
        ) : entries.map((collaborator) => {
          const isSelf = selfSessionId === collaborator.sessionId;
          const color = getCollaboratorColor(collaborator.userId || collaborator.sessionId);
          const writerState = writerSlots
            ? writerSlots.activeWriterSessionIds.includes(collaborator.sessionId)
              ? "Writer"
              : writerSlots.queuedWriterSessionIds.includes(collaborator.sessionId)
                ? "Queued"
                : "Viewer"
            : collaborator.connectionStatus;

          return (
          <div className="presence-ring-shell" key={collaborator.sessionId}>
            <div
              className="presence-ring"
              aria-hidden="true"
              style={{
                "--presence-fill": color.fill,
                "--presence-ring": color.ring,
                "--presence-text": color.text
              } as CSSProperties}
            >
              {(collaborator.displayName ?? "Guest")
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((segment) => segment[0]?.toUpperCase() ?? "")
                .join("") || "?"}
            </div>
            <div className="presence-ring-meta">
              <strong>{isSelf ? `${collaborator.displayName ?? "You"} (You)` : collaborator.displayName ?? "Anonymous user"}</strong>
              <p>{writerState}</p>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
