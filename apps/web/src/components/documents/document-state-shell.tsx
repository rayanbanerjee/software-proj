import type { DocumentRecord, DocumentScreenState } from "../../lib/app-shell";

interface DocumentStateShellProps {
  document: DocumentRecord;
  view: DocumentScreenState;
}

export function DocumentStateShell({ document, view }: DocumentStateShellProps) {
  if (view === "empty") {
    return (
      <section className="document-state-card">
        <span className="section-chip">WEB-015</span>
        <h2>No section selected</h2>
        <p>
          This empty-state shell reserves space for the editor canvas while later tasks define real
          document blocks and selection behavior.
        </p>
      </section>
    );
  }

  if (view === "error") {
    return (
      <section className="document-state-card document-state-card-error">
        <span className="section-chip">WEB-015</span>
        <h2>Document preview unavailable</h2>
        <p>
          Simulated route-level failure state for connection, permission, or metadata loading
          issues.
        </p>
      </section>
    );
  }

  return (
    <section className="document-canvas-shell">
      <div className="document-canvas-header">
        <div>
          <span className="section-chip">WEB-007</span>
          <h2>{document.title}</h2>
        </div>
        <p>{document.summary}</p>
      </div>
      <div className="document-paragraph-stack">
        {document.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
