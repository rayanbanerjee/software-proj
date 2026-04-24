"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { PendingInvitation } from "@repo/shared-types";
import { type DocumentRecord } from "../../lib/app-shell";
import {
  acceptInvitation,
  archiveWorkspaceDocument,
  createWorkspaceDocument,
  listPendingInvitations,
  rejectInvitation
} from "../../lib/documents";

interface DocumentListShellProps {
  authRequired?: boolean;
  documents: DocumentRecord[];
}

type DocumentListFilter = "all" | "editable" | "shared" | "read-only";

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

function toUsername(value: string) {
  return value.includes("@") ? (value.split("@")[0] ?? value) : value;
}

function toShortDocumentId(value: string) {
  return value.split("-")[0] ?? value;
}

function filterDocuments(documents: DocumentRecord[], activeFilter: DocumentListFilter) {
  switch (activeFilter) {
    case "editable":
      return documents.filter((document) => document.role === "owner" || document.role === "editor");
    case "shared":
      return documents.filter((document) => document.role !== "owner");
    case "read-only":
      return documents.filter((document) => document.role === "commenter" || document.role === "viewer");
    case "all":
    default:
      return documents;
  }
}

export function DocumentListShell({ authRequired = false, documents }: DocumentListShellProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<DocumentListFilter>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invitationErrorMessage, setInvitationErrorMessage] = useState<string | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [pendingInvitationAction, setPendingInvitationAction] = useState<string | null>(null);
  const filteredDocuments = filterDocuments(documents, activeFilter);
  const sections = groupDocuments(filteredDocuments);

  useEffect(() => {
    let isActive = true;

    async function loadInvitations() {
      if (authRequired) {
        setPendingInvitations([]);
        return;
      }

      try {
        const invitations = await listPendingInvitations();

        if (!isActive) {
          return;
        }

        setPendingInvitations(invitations);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setInvitationErrorMessage(error instanceof Error ? error.message : "Failed to load invitations.");
      }
    }

    void loadInvitations();

    return () => {
      isActive = false;
    };
  }, [authRequired]);

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

  async function handleInvitationDecision(token: string, action: "accept" | "reject") {
    if (pendingInvitationAction) {
      return;
    }

    setPendingInvitationAction(token);
    setInvitationErrorMessage(null);

    try {
      if (action === "accept") {
        await acceptInvitation(token);
      } else {
        await rejectInvitation(token);
      }

      setPendingInvitations((current) => current.filter((invitation) => invitation.token !== token));
      router.refresh();
    } catch (error) {
      setInvitationErrorMessage(error instanceof Error ? error.message : `Failed to ${action} invitation.`);
    } finally {
      setPendingInvitationAction(null);
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
          {([
            { key: "all", label: "All documents" },
            { key: "editable", label: "Editable" },
            { key: "shared", label: "Shared" },
            { key: "read-only", label: "Read-only" }
          ] as const).map((filter) => (
            <button
              className={`document-list-filter${activeFilter === filter.key ? " document-list-filter-active" : ""}`}
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              type="button"
            >
              {filter.label}
            </button>
          ))}
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
        </div>
        {errorMessage ? <p className="document-list-error">{errorMessage}</p> : null}
      </section>

      {!authRequired && pendingInvitations.length > 0 ? (
        <section className="blocked-note-card">
          <strong>Pending invitations</strong>
          <p>People have shared documents with this account. Accept to add them to your workspace or reject to dismiss them.</p>
          <div className="sharing-invitation-stack">
            {pendingInvitations.map((entry) => (
              <article className="sharing-invitation-card" key={entry.invitation.id}>
                <div className="sharing-invitation-copy">
                  <strong>Shared document</strong>
                  <p>
                    {toUsername(entry.invitation.inviteeEmail)} was invited as {entry.invitation.role}.
                  </p>
                  <span>Document {toShortDocumentId(entry.invitation.documentId)}</span>
                </div>
                <div className="document-card-actions">
                  <button
                    className="document-list-inline-action"
                    disabled={pendingInvitationAction === entry.token}
                    onClick={() => void handleInvitationDecision(entry.token, "accept")}
                    type="button"
                  >
                    {pendingInvitationAction === entry.token ? "Working..." : "Accept"}
                  </button>
                  <button
                    className="document-list-inline-action"
                    disabled={pendingInvitationAction === entry.token}
                    onClick={() => void handleInvitationDecision(entry.token, "reject")}
                    type="button"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
          {invitationErrorMessage ? <p className="document-list-error">{invitationErrorMessage}</p> : null}
        </section>
      ) : null}

      {filteredDocuments.length === 0 ? (
        <section className="blocked-note-card">
          <strong>{authRequired ? "Sign in required" : documents.length > 0 ? "No documents match this filter" : "No documents yet"}</strong>
          <p>
            {authRequired
              ? "Sign in to load or create documents."
              : documents.length > 0
                ? "Switch to another filter or open a matching document from a different view."
                : "Create a document or accept an invitation to see shared files."}
          </p>
        </section>
      ) : null}

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
