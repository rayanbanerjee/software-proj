import Link from "next/link";

import type { DocumentOverlay, DocumentScreenState } from "../../lib/app-shell";

function buildDocumentHref(
  documentId: string,
  options: {
    offline: boolean;
    overlay: DocumentOverlay;
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

  if (options.offline) {
    params.set("offline", "1");
  }

  const query = params.toString();
  return query ? `/documents/${documentId}?${query}` : `/documents/${documentId}`;
}

interface EditorToolbarShellProps {
  documentId: string;
  offline: boolean;
  overlay: DocumentOverlay;
  view: DocumentScreenState;
}

export function EditorToolbarShell({
  documentId,
  offline,
  overlay,
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
                  offline,
                  overlay: nextOverlay,
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
                offline,
                overlay,
                view: item
              })}
              key={item}
            >
              {item}
            </Link>
          ))}
          <Link
            className={`toolbar-link${offline ? " toolbar-link-active" : ""}`}
            href={buildDocumentHref(documentId, {
              offline: !offline,
              overlay,
              view
            })}
          >
            {offline ? "Disable offline banner" : "Enable offline banner"}
          </Link>
        </div>
      </div>
    </section>
  );
}
