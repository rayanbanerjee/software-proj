import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import {
  canManageRoleChange,
  canRevokeAccess,
  canShare
} from "@repo/authz";
import type {
  AcceptInvitationResponse,
  CreateInvitationResponse,
  DocumentRole,
  InvitationSummary,
  RevokeDocumentAccessResponse,
  SharedMembership,
  UpdateDocumentRoleResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";
import type { AuditService } from "../audit/service.js";
import type { DocumentActor, DocumentsService } from "../documents/service.js";

type InvitationPayload = {
  email: string;
  expiresAt: string;
  id: string;
  role: DocumentRole;
};

type StoredInvitation = InvitationSummary & {
  tokenHash: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toSharedMembership(userId: string, role: DocumentRole): SharedMembership {
  return {
    userId,
    role
  };
}

export class SharingService {
  readonly moduleName = "sharing";

  private readonly invitations = new Map<string, StoredInvitation>();

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly auditService: AuditService,
    private readonly invitationSecret: string
  ) {}

  private signPayload(payload: InvitationPayload): string {
    const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = createHmac("sha256", this.invitationSecret)
      .update(serialized)
      .digest("base64url");

    return `${serialized}.${signature}`;
  }

  private verifyToken(token: string): InvitationPayload {
    const [serialized, providedSignature] = token.split(".");

    if (!serialized || !providedSignature) {
      throw new AppError("INVITATION_INVALID", 400, "Invitation token is invalid.");
    }

    const expectedSignature = createHmac("sha256", this.invitationSecret)
      .update(serialized)
      .digest("base64url");

    if (providedSignature.length !== expectedSignature.length) {
      throw new AppError("INVITATION_INVALID", 400, "Invitation token is invalid.");
    }

    const signaturesMatch = timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    );

    if (!signaturesMatch) {
      throw new AppError("INVITATION_INVALID", 400, "Invitation token is invalid.");
    }

    return JSON.parse(Buffer.from(serialized, "base64url").toString("utf8")) as InvitationPayload;
  }

  private requireSharingRole(documentId: string, actor: DocumentActor): DocumentRole {
    const actorRole = this.documentsService.getDocumentRole(documentId, actor.userId);

    if (!actorRole || !canShare(actorRole)) {
      throw new AppError("SHARING_FORBIDDEN", 403, "You do not have permission to manage sharing for this document.");
    }

    return actorRole;
  }

  private requireInvitation(id: string): StoredInvitation {
    const invitation = this.invitations.get(id);

    if (!invitation) {
      throw new AppError("INVITATION_NOT_FOUND", 404, "Invitation not found.");
    }

    return invitation;
  }

  createInvitation(
    documentId: string,
    email: string,
    role: DocumentRole,
    actor: DocumentActor
  ): CreateInvitationResponse {
    this.requireSharingRole(documentId, actor);

    if (role === "owner") {
      throw new AppError("INVITATION_INVALID_ROLE", 400, "Invitations cannot grant owner role.");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const invitation: StoredInvitation = {
      id: randomUUID(),
      documentId,
      inviteeEmail: email.trim().toLowerCase(),
      role,
      invitedByUserId: actor.userId,
      createdAt: now.toISOString(),
      expiresAt,
      acceptedAt: null,
      revokedAt: null,
      tokenHash: ""
    };

    const token = this.signPayload({
      id: invitation.id,
      email: invitation.inviteeEmail,
      role,
      expiresAt
    });

    invitation.tokenHash = sha256(token);
    this.invitations.set(invitation.id, invitation);

    this.auditService.recordEvent({
      action: "sharing.invitation.created",
      actorUserId: actor.userId,
      documentId,
      metadata: {
        inviteeEmail: invitation.inviteeEmail,
        role
      }
    });

    return {
      invitation,
      acceptToken: token,
      acceptUrl: `/accept-invitation?token=${token}`
    };
  }

  acceptInvitation(token: string, actor: DocumentActor & { email: string }): AcceptInvitationResponse {
    const payload = this.verifyToken(token);
    const invitation = this.requireInvitation(payload.id);

    if (invitation.tokenHash !== sha256(token)) {
      throw new AppError("INVITATION_INVALID", 400, "Invitation token is invalid.");
    }

    if (invitation.revokedAt) {
      throw new AppError("INVITATION_REVOKED", 410, "Invitation has been revoked.");
    }

    if (invitation.acceptedAt) {
      throw new AppError("INVITATION_ACCEPTED", 409, "Invitation has already been accepted.");
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      throw new AppError("INVITATION_EXPIRED", 410, "Invitation has expired.");
    }

    if (actor.email.trim().toLowerCase() !== invitation.inviteeEmail) {
      throw new AppError("INVITATION_EMAIL_MISMATCH", 403, "Invitation email does not match the current user.");
    }

    const membership = this.documentsService.setMembership(
      invitation.documentId,
      actor.userId,
      invitation.role
    );

    const acceptedAt = new Date().toISOString();
    invitation.acceptedAt = acceptedAt;

    this.auditService.recordEvent({
      action: "sharing.invitation.accepted",
      actorUserId: actor.userId,
      documentId: invitation.documentId,
      targetUserId: actor.userId,
      metadata: {
        role: membership.role,
        invitationId: invitation.id
      }
    });

    return {
      invitation,
      membership: toSharedMembership(membership.userId, membership.role),
      acceptedAt
    };
  }

  updateRole(
    documentId: string,
    targetUserId: string,
    role: DocumentRole,
    actor: DocumentActor
  ): UpdateDocumentRoleResponse {
    const actorRole = this.requireSharingRole(documentId, actor);
    const targetRole = this.documentsService.getDocumentRole(documentId, targetUserId);

    if (!targetRole) {
      throw new AppError("MEMBERSHIP_NOT_FOUND", 404, "Document membership not found.");
    }

    if (!canManageRoleChange(actorRole, targetRole)) {
      throw new AppError("SHARING_FORBIDDEN", 403, "Only owners can change document roles.");
    }

    if (role === "owner") {
      throw new AppError("ROLE_INVALID", 400, "Owner role cannot be assigned through this endpoint.");
    }

    const membership = this.documentsService.setMembership(documentId, targetUserId, role);
    const updatedAt = new Date().toISOString();

    this.auditService.recordEvent({
      action: "sharing.role.updated",
      actorUserId: actor.userId,
      documentId,
      targetUserId,
      metadata: {
        fromRole: targetRole,
        toRole: role
      }
    });

    return {
      documentId,
      membership: toSharedMembership(membership.userId, membership.role),
      updatedAt
    };
  }

  revokeAccess(
    documentId: string,
    targetUserId: string,
    actor: DocumentActor
  ): RevokeDocumentAccessResponse {
    const actorRole = this.requireSharingRole(documentId, actor);
    const targetRole = this.documentsService.getDocumentRole(documentId, targetUserId);

    if (!targetRole) {
      throw new AppError("MEMBERSHIP_NOT_FOUND", 404, "Document membership not found.");
    }

    if (!canRevokeAccess(actorRole, targetRole)) {
      throw new AppError("SHARING_FORBIDDEN", 403, "Only owners can revoke document access.");
    }

    this.documentsService.removeMembership(documentId, targetUserId);
    const revokedAt = new Date().toISOString();

    for (const invitation of this.invitations.values()) {
      if (
        invitation.documentId === documentId
        && invitation.acceptedAt === null
        && invitation.revokedAt === null
      ) {
        invitation.revokedAt = revokedAt;
      }
    }

    this.auditService.recordEvent({
      action: "sharing.access.revoked",
      actorUserId: actor.userId,
      documentId,
      targetUserId,
      metadata: {
        previousRole: targetRole
      }
    });

    return {
      documentId,
      userId: targetUserId,
      revokedAt
    };
  }
}
