import type { DocumentOverlay, DocumentRecord, DocumentScreenState } from "../../lib/app-shell";
import { activeOverlayCopy } from "../../lib/app-shell";
import { AiActionMenuShell } from "./ai-action-menu-shell";
import { DocumentStateShell } from "./document-state-shell";
import { EditorToolbarShell } from "./editor-toolbar-shell";
import { ExportModalShell } from "./export-modal-shell";
import { OfflineStatusBanner } from "./offline-status-banner";
import { PresenceShell } from "./presence-shell";
import { SharingModalShell } from "./sharing-modal-shell";
import { VersionHistoryShell } from "./version-history-shell";

interface DocumentWorkspaceShellProps {
  document: DocumentRecord;
  offline: boolean;
  overlay: DocumentOverlay;
  view: DocumentScreenState;
}

export function DocumentWorkspaceShell({
  document,
  offline,
  overlay,
  view
}: DocumentWorkspaceShellProps) {
  return (
    <div className="document-workspace-shell">
      <section className="page-intro-card">
        <span className="workspace-kicker">WEB-007</span>
        <h2>Document editor route scaffold</h2>
        <p>
          This route composes the toolbar, collaborator presence, history rail, overlays, and
          state variants that later editor tasks can wire into real data and controls.
        </p>
      </section>

      <EditorToolbarShell
        documentId={document.id}
        offline={offline}
        overlay={overlay}
        view={view}
      />

      {offline ? <OfflineStatusBanner /> : null}

      <div className="document-workspace-grid">
        <div className="document-workspace-main">
          <DocumentStateShell document={document} view={view} />

          {overlay ? (
            <div className="overlay-stack">
              <div className="overlay-caption">
                <strong>Overlay preview active:</strong> {activeOverlayCopy[overlay]}
              </div>
              {overlay === "sharing" ? <SharingModalShell /> : null}
              {overlay === "ai" ? <AiActionMenuShell /> : null}
              {overlay === "export" ? <ExportModalShell /> : null}
            </div>
          ) : null}
        </div>

        <aside className="document-workspace-sidebar">
          <PresenceShell />
          <VersionHistoryShell />
        </aside>
      </div>
    </div>
  );
}
