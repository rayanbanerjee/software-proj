"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { DocumentRole, DocumentSharingSummary } from "@repo/shared-types";

import {
  createDocumentInvitation,
  getDocumentSharingState,
  updateDocumentMemberRole
} from "../../lib/documents";

interface SharingModalShellProps {
  documentId: string;
  role: DocumentRole;
}

const roleOptions: Exclude<DocumentRole, "owner">[] = ["editor", "commenter", "viewer"];

function toUsername(value: string | null | undefined) {
  if (!value) {
    return "unknown-user";
  }

  if (value.includes("@")) {
    return value.split("@")[0] ?? value;
  }

  if (value.startsWith("jwt:")) {
    return "you";
  }

  return value;
}

export function SharingModalShell({ documentId, role }: SharingModalShellProps) {
  const [invitee, setInvitee] = useState("");
  const [inviteRole, setInviteRole] = useState<Exclude<DocumentRole, "owner">>("editor");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [sharing, setSharing] = useState<DocumentSharingSummary | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadSharingState() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextState = await getDocumentSharingState(documentId);

        if (!isActive) {
          return;
        }

        setSharing(nextState);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSharing(null);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load sharing state.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadSharingState();

    return () => {
      isActive = false;
    };
  }, [documentId]);

  async function handleInviteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (role !== "owner" || isSubmitting) {
      return;
    }

    const nextInvitee = invitee.trim();

    if (!nextInvitee) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await createDocumentInvitation(documentId, nextInvitee, inviteRole);
      const nextState = await getDocumentSharingState(documentId);
      setSharing(nextState);
      setInvitee("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send invitation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleChange(userId: string, nextRole: Exclude<DocumentRole, "owner">) {
    if (role !== "owner" || updatingMemberId) {
      return;
    }

    setUpdatingMemberId(userId);
    setErrorMessage(null);

    try {
      const response = await updateDocumentMemberRole(documentId, userId, nextRole);

      setSharing((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          members: current.members.map((member) =>
            member.userId === userId ? response.membership : member
          )
        };
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update member role.");
    } finally {
      setUpdatingMemberId(null);
    }
  }

  const pendingInvitations = sharing?.invitations.filter((invitation) => invitation.acceptedAt === null) ?? [];

  return (
    <section className="overlay-shell">
      <div className="overlay-shell-header">
        <span className="section-chip">Share</span>
        <h3>Share document</h3>
      </div>

      <p>
        Owners can invite people by username and choose the access level up front. Invited users
        will see the request on their documents page and can accept or reject it.
      </p>

      {role === "owner" ? (
        <form className="sharing-form" onSubmit={(event) => void handleInviteSubmit(event)}>
          <label className="auth-login-field">
            <span>User</span>
            <input
              onChange={(event) => setInvitee(event.target.value)}
              placeholder="username"
              type="text"
              value={invitee}
            />
          </label>
          <label className="auth-login-field">
            <span>Role</span>
            <select
              onChange={(event) => setInviteRole(event.target.value as Exclude<DocumentRole, "owner">)}
              value={inviteRole}
            >
              {roleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="auth-login-actions">
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Sending..." : "+ Add user"}
            </button>
          </div>
        </form>
      ) : (
        <div className="auth-login-status">
          <p>Only the owner can add or remove collaborators for this document.</p>
        </div>
      )}

      {errorMessage ? (
        <div className="auth-login-status auth-login-status-error">
          <p>{errorMessage}</p>
        </div>
      ) : null}

      <div className="overlay-list">
        <article className="overlay-option-card">
          <strong>Members</strong>
          {isLoading ? (
            <p>Loading members...</p>
          ) : sharing?.members.length ? (
            <ul className="sharing-list">
              {sharing.members.map((member) => (
                <li key={member.userId}>
                  <span>{toUsername(member.displayName ?? member.userId)}</span>
                  {role === "owner" && member.role !== "owner" ? (
                    <select
                      aria-label={`Change role for ${toUsername(member.displayName ?? member.userId)}`}
                      className="sharing-role-select"
                      disabled={updatingMemberId === member.userId}
                      onChange={(event) =>
                        void handleRoleChange(
                          member.userId,
                          event.target.value as Exclude<DocumentRole, "owner">
                        )}
                      value={member.role}
                    >
                      {roleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <strong>{member.role}</strong>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No accepted members yet.</p>
          )}
        </article>

        <article className="overlay-option-card">
          <strong>Pending invitations</strong>
          {isLoading ? (
            <p>Loading invitations...</p>
          ) : pendingInvitations.length ? (
            <ul className="sharing-list">
              {pendingInvitations.map((invitation) => (
                <li key={invitation.id}>
                  <span>{toUsername(invitation.inviteeEmail)}</span>
                  <strong>{invitation.role}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>No pending invitations.</p>
          )}
        </article>
      </div>
    </section>
  );
}
