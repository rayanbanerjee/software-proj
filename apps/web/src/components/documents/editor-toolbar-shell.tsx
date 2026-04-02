import Link from "next/link";

import type {
  DocumentOverlay,
  DocumentScreenState,
  SyncConnectionState
} from "../../lib/app-shell";

function buildDocumentHref(
  documentId: string,
  options: {
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

  const query = params.toString();
  return query ? `/documents/${documentId}?${query}` : `/documents/${documentId}`;
}

interface EditorToolbarShellProps {
  documentId: string;
  overlay: DocumentOverlay;
  syncState: SyncConnectionState;
  view: DocumentScreenState;
}

export function EditorToolbarShell({
  documentId,
  overlay,
  syncState,
  view
}: EditorToolbarShellProps) {
  const overlayLinks: { key: Exclude<DocumentOverlay, null>; label: string }[] = [
    { key: "sharing", label: "Sharing" },
    { key: "ai", label: "AI" },
    { key: "export", label: "Export" }
  ];
  const viewLinks: DocumentScreenState[] = ["ready", "empty", "error"];

  return (
    <section className="editor-toolbar-shell">
      <div className="editor-toolbar-group">
        <span className="section-chip">WEB-008</span>
        <div className="toolbar-pill-group">
          {overlayLinks.map((item) => {
            const nextOverlay = overlay === item.key ? null : item.key;

            return (
              <Link
                className={`toolbar-link${overlay === item.key ? " toolbar-link-active" : ""}`}
                href={buildDocumentHref(documentId, {
                  overlay: nextOverlay,
                  syncState,
                  view
                })}
                key={item.key}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="editor-toolbar-group">
        <span className="section-chip">Screen states</span>
        <div className="toolbar-pill-group">
          {viewLinks.map((item) => (
            <Link
              className={`toolbar-link${view === item ? " toolbar-link-active" : ""}`}
              href={buildDocumentHref(documentId, {
                overlay,
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
        </div>
      </div>
    </section>
  );
}
