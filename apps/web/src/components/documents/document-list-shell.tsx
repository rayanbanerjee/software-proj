"use client";

import { startTransition, useState } from "react";
import Link from "next/link";

import { createDraftDocumentRecord, documentListSections, type DocumentRecord } from "../../lib/app-shell";

export function DocumentListShell() {
  const [drafts, setDrafts] = useState<DocumentRecord[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  function handleCreateDocument() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);

    startTransition(() => {
      const nextSequence = drafts.length + 1;

      setDrafts((currentDrafts) => [
        createDraftDocumentRecord(nextSequence),
        ...currentDrafts
      ]);
      setIsCreating(false);
    });
  }

  return (
    <div className="document-list-shell">
      <section className="page-intro-card">
        <span className="workspace-kicker">WEB-005</span>
        <h2>Document list scaffold</h2>
        <p>
          This shell previews the list route, sorting cards, metadata chips, and launch links into
          the editor scaffold without depending on live backend data.
        </p>
        <div className="page-intro-actions">
          <button
            className="document-list-action"
            disabled={isCreating}
            onClick={handleCreateDocument}
            type="button"
          >
            {isCreating ? "Creating draft..." : "New document"}
          </button>
          <span className="document-list-action-note">
            Uses a local shell draft for now. Later work will switch this to the real create API.
          </span>
        </div>
      </section>

      <section className="blocked-note-card">
        <strong>Stub now active</strong>
        <p>
          `WEB-006` now creates a local draft card so the list page has a concrete launch action
          while the full persisted create flow is refined.
        </p>
      </section>

      {drafts.length > 0 ? (
        <section className="document-section-card document-draft-section">
          <div className="document-section-header">
            <div>
              <span className="section-chip">Drafts</span>
              <h3>New shell drafts</h3>
            </div>
            <p>These appear immediately from the stub flow so the list page can exercise creation UX.</p>
          </div>

          <div className="document-card-grid">
            {drafts.map((document) => (
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
                  <span>{document.collaborators} collaborator</span>
                  <Link href={`/documents/${document.id}`}>Open scaffold</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

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
