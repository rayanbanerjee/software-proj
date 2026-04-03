"use client";

import Link from "next/link";

import type {
  DocumentOverlay,
  DocumentScreenState,
  SyncConnectionState
} from "../../lib/app-shell";

function buildDocumentHref(
  documentId: string,
  options: {
    permissionState?: "normal" | "read-only" | "revoked";
    stateVector?: string | null;
    overlay: DocumentOverlay;
    syncState: SyncConnectionState;
    view: DocumentScreenState;
  }
) {
  const params = new URLSearchParams();

  if (options.overlay) {
    params.set("overlay", options.overlay);
  }

  if (options.view !== "ready") {
    params.set("view", options.view);
  }

  if (options.syncState !== "online") {
    params.set("sync", options.syncState);
  }

  if (options.permissionState && options.permissionState !== "normal") {
    params.set("permission", options.permissionState);
  }

  if (options.stateVector) {
    params.set("stateVector", options.stateVector);
  }

  const query = params.toString();
  return query ? `/documents/${documentId}?${query}` : `/documents/${documentId}`;
}

interface EditorToolbarShellProps {
  blameMode: boolean;
  documentId: string;
  overlay: DocumentOverlay;
  onToggleBlame: () => void;
  showDebugControls?: boolean;
  syncState: SyncConnectionState;
  view: DocumentScreenState;
}

export function EditorToolbarShell({
  blameMode,
  documentId,
  overlay,
  onToggleBlame,
  showDebugControls = false,
  syncState,
  view
}: EditorToolbarShellProps) {
  const overlayLinks: { key: Exclude<DocumentOverlay, null>; label: string; icon: string }[] = [
    { key: "sharing", label: "Sharing", icon: "S" },
    { key: "export", label: "Export", icon: "E" }
  ];
  const viewLinks: DocumentScreenState[] = ["ready", "empty", "error"];

  return (
    <section className="editor-toolbar-shell">
      <div className="editor-toolbar-icon-row">
        <span className="editor-toolbar-dot editor-toolbar-dot-blue" />
        <span className="editor-toolbar-dot editor-toolbar-dot-green" />
        <span className="editor-toolbar-dot editor-toolbar-dot-dark" />
      </div>
      <div className="editor-toolbar-group editor-toolbar-group-compact">
        <div className="toolbar-pill-group">
          {overlayLinks.map((item) => {
            const nextOverlay = overlay === item.key ? null : item.key;

            return (
              <Link
                className={`toolbar-link${overlay === item.key ? " toolbar-link-active" : ""}`}
                href={buildDocumentHref(documentId, {
                  overlay: nextOverlay,
                  permissionState: "normal",
                  stateVector: syncState === "online" ? null : "sv-reconnect-demo",
                  syncState,
                  view
                })}
                key={item.key}
                title={item.label}
              >
                {item.icon}
              </Link>
            );
          })}
          <button
            className={`toolbar-link toolbar-link-button${blameMode ? " toolbar-link-active" : ""}`}
            onClick={onToggleBlame}
            title="Blame mode"
            type="button"
          >
            B
          </button>
        </div>
      </div>

      {showDebugControls ? (
        <div className="editor-toolbar-group">
          <span className="section-chip">Workspace state</span>
          <div className="toolbar-pill-group">
            {viewLinks.map((item) => (
              <Link
                className={`toolbar-link${view === item ? " toolbar-link-active" : ""}`}
                href={buildDocumentHref(documentId, {
                  overlay,
                  permissionState: "normal",
                  stateVector: syncState === "online" ? null : "sv-reconnect-demo",
                  syncState,
                  view: item
                })}
                key={item}
              >
                {item}
              </Link>
            ))}
            {(["offline", "reconnecting", "recovered"] as const).map((state) => (
              <Link
                className={`toolbar-link${syncState === state ? " toolbar-link-active" : ""}`}
                href={buildDocumentHref(documentId, {
                  overlay,
                  permissionState: "normal",
                  stateVector: state === "offline" ? "sv-offline-demo" : "sv-reconnect-demo",
                  syncState: syncState === state ? "online" : state,
                  view
                })}
                key={state}
              >
                {state === "offline"
                  ? "Offline"
                  : state === "reconnecting"
                    ? "Reconnecting"
                    : "Recovered"}
              </Link>
            ))}
            {(["read-only", "revoked"] as const).map((permissionState) => (
              <Link
                className="toolbar-link"
                href={buildDocumentHref(documentId, {
                  overlay,
                  permissionState,
                  stateVector: "sv-permission-demo",
                  syncState: permissionState === "revoked" ? "recovered" : "offline",
                  view
                })}
                key={permissionState}
              >
                {permissionState === "read-only" ? "Permission read-only" : "Permission revoked"}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
