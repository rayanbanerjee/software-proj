import Link from "next/link";

import { documentListSections } from "../../lib/app-shell";

export function DocumentListShell() {
  return (
    <div className="document-list-shell">
      <section className="page-intro-card">
        <span className="workspace-kicker">WEB-005</span>
        <h2>Document list scaffold</h2>
        <p>
          This shell previews the list route, sorting cards, metadata chips, and launch links into
          the editor scaffold without depending on live backend data.
        </p>
      </section>

      <section className="blocked-note-card">
        <strong>Blocked follow-up</strong>
        <p>
          `WEB-006` is intentionally not implemented here because `DOCSVC-001` is still marked
          `Backlog` in the canonical task source.
        </p>
      </section>

      <div className="document-section-stack">
        {documentListSections.map((section) => (
          <section className="document-section-card" key={section.title}>
            <div className="document-section-header">
              <div>
                <span className="section-chip">{section.eyebrow}</span>
                <h3>{section.title}</h3>
              </div>
              <p>{section.summary}</p>
            </div>

            <div className="document-card-grid">
              {section.documents.map((document) => (
                <article className="document-list-card" key={document.id}>
                  <div className="document-card-topline">
                    <span className={`document-role-badge document-role-${document.role}`}>
                      {document.role}
                    </span>
                    <span className="document-updated-label">{document.updatedLabel}</span>
                  </div>
                  <h4>{document.title}</h4>
                  <p>{document.summary}</p>
                  <div className="document-card-footer">
                    <span>{document.collaborators} collaborators</span>
                    <Link href={`/documents/${document.id}`}>Open scaffold</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
