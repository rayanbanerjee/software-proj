import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

import {
  canManageRoleChange,
  canRevokeAccess,
  canShare,
  canView
} from "@repo/authz";
import type {
  AcceptInvitationResponse,
  CreateInvitationResponse,
  DocumentSharingSummary,
  DocumentRole,
  InvitationSummary,
  ListPendingInvitationsResponse,
  RejectInvitationResponse,
  RevokeDocumentAccessResponse,
  SharedMembership,
  UpdateDocumentRoleResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";
import { ensureUser } from "../../common/user-store.js";
import type { AuditService } from "../audit/service.js";
import type { DocumentActor, DocumentsService } from "../documents/service.js";

type InvitationPayload = {
  email: string;
  expiresAt: string;
  id: string;
  role: DocumentRole;
};

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toSharedMembership(input: {
  displayName?: string | null;
  role: DocumentRole;
  userId: string;
}): SharedMembership {
  return {
    displayName: input.displayName ?? null,
    userId: input.userId,
    role: input.role
  };
}

function toDocumentRole(value: string): DocumentRole {
  if (value === "owner" || value === "editor" || value === "commenter" || value === "viewer") {
    return value;
  }

  throw new Error(`Unsupported document role: ${value}`);
}

function toInvitationSummary(input: {
  acceptedAt: Date | null;
  createdAt: Date;
  documentId: string;
  expiresAt: Date;
  id: string;
  invitedByUserId: string;
  inviteeEmail: string;
  revokedAt: Date | null;
  role: string;
}): InvitationSummary {
  return {
    id: input.id,
    documentId: input.documentId,
    inviteeEmail: input.inviteeEmail,
    role: toDocumentRole(input.role),
    invitedByUserId: input.invitedByUserId,
    createdAt: input.createdAt.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    acceptedAt: input.acceptedAt?.toISOString() ?? null,
    revokedAt: input.revokedAt?.toISOString() ?? null
  };
}

export class SharingService {
  readonly moduleName = "sharing";

  constructor(
    private readonly prisma: PrismaClient,
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

    if (!timingSafeEqual(Buffer.from(providedSignature), Buffer.from(expectedSignature))) {
      throw new AppError("INVITATION_INVALID", 400, "Invitation token is invalid.");
    }

    return JSON.parse(Buffer.from(serialized, "base64url").toString("utf8")) as InvitationPayload;
  }

  private async requireSharingRole(documentId: string, actor: DocumentActor): Promise<DocumentRole> {
    const actorRole = await this.documentsService.getDocumentRole(documentId, actor.userId);

    if (!actorRole || !canShare(actorRole)) {
      throw new AppError("SHARING_FORBIDDEN", 403, "You do not have permission to manage sharing for this document.");
    }

    return actorRole;
  }

  private async requireVisibleDocumentRole(documentId: string, actor: DocumentActor): Promise<DocumentRole> {
    const actorRole = await this.documentsService.getDocumentRole(documentId, actor.userId);

    if (!actorRole || !canView(actorRole)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    return actorRole;
  }

  private async requireInvitation(id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: {
        id
      }
    });

    if (!invitation) {
      throw new AppError("INVITATION_NOT_FOUND", 404, "Invitation not found.");
    }

    return invitation;
  }

  async createInvitation(
    documentId: string,
    email: string,
    role: DocumentRole,
    actor: DocumentActor
  ): Promise<CreateInvitationResponse> {
    await this.requireSharingRole(documentId, actor);

    if (role === "owner") {
      throw new AppError("INVITATION_INVALID_ROLE", 400, "Invitations cannot grant owner role.");
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const id = randomUUID();
    const inviteeEmail = email.trim().toLowerCase();
    const token = this.signPayload({
      id,
      email: inviteeEmail,
      role,
      expiresAt: expiresAt.toISOString()
    });

    const invitation = await this.prisma.invitation.create({
      data: {
        id,
        documentId,
        invitedByUserId: actor.userId,
        inviteeEmail,
        role,
        acceptToken: token,
        tokenHash: sha256(token),
        expiresAt
      }
    });

    await this.auditService.recordEvent({
      action: "sharing.invitation.created",
      actorUserId: actor.userId,
      documentId,
      metadata: {
        inviteeEmail,
        role
      }
    });

    return {
      invitation: toInvitationSummary(invitation),
      acceptToken: token,
      acceptUrl: `/accept-invitation?token=${token}`
    };
  }

  async acceptInvitation(token: string, actor: DocumentActor & { email: string }): Promise<AcceptInvitationResponse> {
    const payload = this.verifyToken(token);
    const invitation = await this.requireInvitation(payload.id);

    if (invitation.tokenHash !== sha256(token)) {
      throw new AppError("INVITATION_INVALID", 400, "Invitation token is invalid.");
    }

    if (invitation.revokedAt) {
      throw new AppError("INVITATION_REVOKED", 410, "Invitation has been revoked.");
    }

    if (invitation.acceptedAt) {
      throw new AppError("INVITATION_ACCEPTED", 409, "Invitation has already been accepted.");
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new AppError("INVITATION_EXPIRED", 410, "Invitation has expired.");
    }

    if (actor.email.trim().toLowerCase() !== invitation.inviteeEmail) {
      throw new AppError("INVITATION_EMAIL_MISMATCH", 403, "Invitation email does not match the current user.");
    }

    await ensureUser(this.prisma, {
      email: actor.email,
      id: actor.userId,
      name: actor.name
    });

    const membership = await this.documentsService.setMembership(
      invitation.documentId,
      actor.userId,
      toDocumentRole(invitation.role),
      {
        displayName: actor.name
      }
    );

    const acceptedAt = new Date();
    const updatedInvitation = await this.prisma.invitation.update({
      where: {
        id: invitation.id
      },
      data: {
        acceptedAt
      }
    });

    await this.auditService.recordEvent({
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
      invitation: toInvitationSummary(updatedInvitation),
      membership: toSharedMembership(membership),
      acceptedAt: acceptedAt.toISOString()
    };
  }

  async rejectInvitation(token: string, actor: DocumentActor & { email: string }): Promise<RejectInvitationResponse> {
    const payload = this.verifyToken(token);
    const invitation = await this.requireInvitation(payload.id);

    if (invitation.tokenHash !== sha256(token)) {
      throw new AppError("INVITATION_INVALID", 400, "Invitation token is invalid.");
    }

    if (invitation.revokedAt) {
      throw new AppError("INVITATION_REVOKED", 410, "Invitation has already been rejected.");
    }

    if (invitation.acceptedAt) {
      throw new AppError("INVITATION_ACCEPTED", 409, "Invitation has already been accepted.");
    }

    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new AppError("INVITATION_EXPIRED", 410, "Invitation has expired.");
    }

    if (actor.email.trim().toLowerCase() !== invitation.inviteeEmail) {
      throw new AppError("INVITATION_EMAIL_MISMATCH", 403, "Invitation email does not match the current user.");
    }

    const rejectedAt = new Date();
    const updatedInvitation = await this.prisma.invitation.update({
      where: {
        id: invitation.id
      },
      data: {
        revokedAt: rejectedAt
      }
    });

    await this.auditService.recordEvent({
      action: "sharing.invitation.rejected",
      actorUserId: actor.userId,
      documentId: invitation.documentId,
      targetUserId: actor.userId,
      metadata: {
        invitationId: invitation.id,
        role: invitation.role
      }
    });

    return {
      invitation: toInvitationSummary(updatedInvitation),
      rejectedAt: rejectedAt.toISOString()
    };
  }

  async listDocumentSharing(documentId: string, actor: DocumentActor): Promise<DocumentSharingSummary> {
    await this.requireVisibleDocumentRole(documentId, actor);
    const [members, invitations] = await Promise.all([
      this.documentsService.listMemberships(documentId),
      this.prisma.invitation.findMany({
        where: {
          documentId,
          revokedAt: null
        },
        orderBy: {
          createdAt: "desc"
        }
      })
    ]);

    return {
      documentId,
      members,
      invitations: invitations.map((invitation) => toInvitationSummary(invitation))
    };
  }

  async listPendingInvitations(actor: { email: string }): Promise<ListPendingInvitationsResponse> {
    const invitations = await this.prisma.invitation.findMany({
      where: {
        inviteeEmail: actor.email.trim().toLowerCase(),
        acceptedAt: null,
        revokedAt: null,
        expiresAt: {
          gte: new Date()
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return {
      invitations: invitations.map((invitation) => ({
        invitation: toInvitationSummary(invitation),
        token: invitation.acceptToken
      }))
    };
  }

  async updateRole(
    documentId: string,
    targetUserId: string,
    role: DocumentRole,
    actor: DocumentActor
  ): Promise<UpdateDocumentRoleResponse> {
    const actorRole = await this.requireSharingRole(documentId, actor);
    const targetRole = await this.documentsService.getDocumentRole(documentId, targetUserId);

    if (!targetRole) {
      throw new AppError("MEMBERSHIP_NOT_FOUND", 404, "Document membership not found.");
    }

    if (!canManageRoleChange(actorRole, targetRole)) {
      throw new AppError("SHARING_FORBIDDEN", 403, "Only owners can change document roles.");
    }

    if (role === "owner") {
      throw new AppError("ROLE_INVALID", 400, "Owner role cannot be assigned through this endpoint.");
    }

    const membership = await this.documentsService.setMembership(documentId, targetUserId, role);
    const updatedAt = new Date().toISOString();

    await this.auditService.recordEvent({
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
      membership: toSharedMembership(membership),
      updatedAt
    };
  }

  async revokeAccess(
    documentId: string,
    targetUserId: string,
    actor: DocumentActor
  ): Promise<RevokeDocumentAccessResponse> {
    const actorRole = await this.requireSharingRole(documentId, actor);
    const targetRole = await this.documentsService.getDocumentRole(documentId, targetUserId);

    if (!targetRole) {
      throw new AppError("MEMBERSHIP_NOT_FOUND", 404, "Document membership not found.");
    }

    if (!canRevokeAccess(actorRole, targetRole)) {
      throw new AppError("SHARING_FORBIDDEN", 403, "Only owners can revoke document access.");
    }

    await this.documentsService.removeMembership(documentId, targetUserId);
    const revokedAt = new Date();

    await this.prisma.invitation.updateMany({
      where: {
        documentId,
        acceptedAt: null,
        revokedAt: null
      },
      data: {
        revokedAt
      }
    });

    await this.auditService.recordEvent({
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
      revokedAt: revokedAt.toISOString()
    };
  }
}
