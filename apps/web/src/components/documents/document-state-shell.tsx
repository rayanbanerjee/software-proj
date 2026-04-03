import type { DocumentRecord, DocumentScreenState } from "../../lib/app-shell";

interface DocumentStateShellProps {
  document: DocumentRecord;
  view: DocumentScreenState;
}

export function DocumentStateShell({ document, view }: DocumentStateShellProps) {
  if (view === "empty") {
    return (
      <section className="document-state-card">
        <span className="section-chip">Empty file</span>
        <h2>No content yet</h2>
        <p>
          The editor canvas is ready, but this file is currently blank while the richer block workflow is still being layered in.
        </p>
      </section>
    );
  }

  if (view === "error") {
    return (
      <section className="document-state-card document-state-card-error">
        <span className="section-chip">Unavailable</span>
        <h2>Editor preview unavailable</h2>
        <p>
          This shell stands in for permission loss, metadata failures, or connection problems that block the editor surface.
        </p>
      </section>
    );
  }

  return (
    <section className="document-canvas-shell">
      <div className="document-canvas-header">
        <div>
          <span className="section-chip">Preview</span>
          <h2>{document.title}</h2>
        </div>
        <p>{document.summary}</p>
      </div>
      <div className="document-canvas-meta">
        <span className={`document-role-badge document-role-${document.role}`}>
          {document.role}
        </span>
        <span className="document-updated-label">{document.updatedLabel}</span>
        <span className="document-updated-label">{document.collaborators} collaborators</span>
      </div>
      <div className="document-paragraph-stack">
        {document.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
