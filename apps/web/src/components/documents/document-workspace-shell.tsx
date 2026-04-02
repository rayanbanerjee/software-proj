import type {
  DocumentOverlay,
  DocumentRecord,
  DocumentScreenState,
  SyncConnectionState,
  SyncPermissionState
} from "../../lib/app-shell";
import { createAiPanelState } from "../../lib/ai-panel-state";
import type { ExportPanelState } from "../../lib/export-panel-state";
import type { VersionHistoryEntry } from "../../lib/version-history";
import { BaseEditor } from "../../editor/base-editor";
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
  exportPanelState: ExportPanelState;
  overlay: DocumentOverlay;
  permissionState: SyncPermissionState;
  serverStateVector: string | null;
  syncState: SyncConnectionState;
  versionHistoryEntries: readonly VersionHistoryEntry[];
  view: DocumentScreenState;
}

export function DocumentWorkspaceShell({
  document,
  exportPanelState,
  overlay,
  permissionState,
  serverStateVector,
  syncState,
  versionHistoryEntries,
  view
}: DocumentWorkspaceShellProps) {
  const aiPanelState = createAiPanelState();

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
        overlay={overlay}
        syncState={syncState}
        view={view}
      />

      {syncState !== "online" ? <OfflineStatusBanner permissionState={permissionState} state={syncState} /> : null}

      <div className="document-workspace-grid">
        <div className="document-workspace-main">
          {view === "ready" ? (
            <BaseEditor
              accessLevel={permissionState === "revoked" ? "none" : permissionState === "read-only" ? "read" : "write"}
              documentId={document.id}
              initialTitle={document.title}
              role={document.role}
              serverStateVector={serverStateVector}
              syncState={syncState}
            />
          ) : (
            <DocumentStateShell document={document} view={view} />
          )}

          {overlay ? (
            <div className="overlay-stack">
              <div className="overlay-caption">
                <strong>Overlay preview active:</strong> {activeOverlayCopy[overlay]}
              </div>
              {overlay === "sharing" ? <SharingModalShell /> : null}
              {overlay === "ai" ? <AiActionMenuShell panelState={aiPanelState} /> : null}
              {overlay === "export" ? <ExportModalShell panelState={exportPanelState} /> : null}
            </div>
          ) : null}
        </div>

        <aside className="document-workspace-sidebar">
          <PresenceShell />
          <VersionHistoryShell entries={versionHistoryEntries} />
        </aside>
      </div>
    </div>
  );
}
