"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { type DocumentRecord } from "../../lib/app-shell";
import { archiveWorkspaceDocument, createWorkspaceDocument } from "../../lib/documents";

interface DocumentListShellProps {
  authRequired?: boolean;
  documents: DocumentRecord[];
}

function groupDocuments(documents: DocumentRecord[]) {
  const myDocuments = documents.filter((document) => document.role === "owner" || document.role === "editor");
  const sharedDocuments = documents.filter((document) => document.role === "commenter" || document.role === "viewer");

  return [
    {
      eyebrow: "Workspace",
      title: "My documents",
      summary: "Server-backed documents you can actively edit or manage from the current workspace.",
      documents: myDocuments
    },
    {
      eyebrow: "Shared",
      title: "Shared with me",
      summary: "Documents available to review, comment on, or reference from other collaborators.",
      documents: sharedDocuments
    }
  ].filter((section) => section.documents.length > 0);
}

export function DocumentListShell({ authRequired = false, documents }: DocumentListShellProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const sections = groupDocuments(documents);

  async function handleCreateDocument() {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const createdDocument = await createWorkspaceDocument(`Untitled document ${documents.length + 1}`);
      router.push(`/documents/${createdDocument.id}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create document.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteDocument(documentId: string) {
    if (deletingDocumentId) {
      return;
    }

    setDeletingDocumentId(documentId);
    setErrorMessage(null);

    try {
      await archiveWorkspaceDocument(documentId);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete document.");
    } finally {
      setDeletingDocumentId(null);
    }
  }

  return (
    <div className="document-list-shell">
      <section className="page-intro-card">
        <span className="workspace-kicker">Documents</span>
        <h2>Document workspace</h2>
        <p>
          Browse live workspace documents, queue quick drafts, and jump into the editor surface without leaving the main workspace.
        </p>
        <div className="document-list-metrics">
          <div>
            <strong>{documents.length}</strong>
            <span>Documents</span>
          </div>
          <div>
            <strong>{sections.length}</strong>
            <span>Groups</span>
          </div>
          <div>
            <strong>{documents.filter((document) => document.role === "owner").length}</strong>
            <span>Owned</span>
          </div>
        </div>
        <div className="document-list-toolbar">
          <span className="document-list-filter document-list-filter-active">All documents</span>
          <span className="document-list-filter">Editable</span>
          <span className="document-list-filter">Shared</span>
          <span className="document-list-filter">Read-only</span>
        </div>
        <div className="page-intro-actions">
          <button
            className="document-list-action"
            disabled={isCreating}
            onClick={handleCreateDocument}
            type="button"
          >
            {isCreating ? "Creating..." : "New document"}
          </button>
          <span className="document-list-action-note">
            {documents.length > 0
              ? "Create and delete actions now use the live documents API."
              : authRequired
                ? "Sign in first so the workspace can load or create real server-backed documents."
                : "No documents are available for this account yet. Create one or accept an invitation from another profile."}
          </span>
        </div>
        {errorMessage ? <p className="document-list-error">{errorMessage}</p> : null}
      </section>

      {documents.length > 0 ? (
        <section className="blocked-note-card">
          <strong>API-backed navigation active</strong>
          <p>
            The list and sidebar now reflect the same document workspace instead of mixing repo-file chrome with document routes.
          </p>
        </section>
      ) : (
        <section className="blocked-note-card">
          <strong>{authRequired ? "Sign in required" : "No documents yet"}</strong>
          <p>
            {authRequired
              ? "The workspace request did not include a valid session. Use the `Sign in` entry in the sidebar or open `/auth` to continue."
              : "This account does not have any server-backed documents yet. Create a document here or accept an invitation from another profile to see shared files."}
          </p>
        </section>
      )}

      <div className="document-section-stack">
        {sections.map((section) => (
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
                  <div className="document-card-stripe" aria-hidden="true" />
                  <h4>{document.title}</h4>
                  <p>{document.summary}</p>
                  <ul className="document-card-meta">
                    <li>{document.updatedLabel}</li>
                    <li>{document.role}</li>
                  </ul>
                  <div className="document-card-footer">
                    <span>{document.updatedLabel}</span>
                    <div className="document-card-actions">
                      {document.role === "owner" ? (
                        <button
                          className="document-list-inline-action"
                          disabled={deletingDocumentId === document.id}
                          onClick={() => void handleDeleteDocument(document.id)}
                          type="button"
                        >
                          {deletingDocumentId === document.id ? "Deleting..." : "Delete"}
                        </button>
                      ) : null}
                      <Link href={`/documents/${document.id}`}>Open document</Link>
                    </div>
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
