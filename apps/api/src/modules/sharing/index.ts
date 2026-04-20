import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { DocumentPermissionUpdatedEvent, DocumentRole, SessionAccessLevel } from "@repo/shared-types";

import { protectedRoute, requireCurrentUser } from "../auth/guard.js";
import type { DocumentActor } from "../documents/service.js";
import { SharingService } from "./service.js";

const createInvitationBodySchema = z.object({
  email: z.string().trim().email(),
  role: z.enum(["owner", "editor", "commenter", "viewer"])
});

const acceptInvitationBodySchema = z.object({
  token: z.string().trim().min(1)
});

const updateRoleBodySchema = z.object({
  role: z.enum(["owner", "editor", "commenter", "viewer"])
});

function getActor(currentUser: {
  email: string;
  id: string;
  name: string | null;
}): DocumentActor {
  return {
    userId: currentUser.id,
    name: currentUser.name
  };
}

function getActorWithEmail(currentUser: {
  email: string;
  id: string;
  name: string | null;
}) {
  const actor = getActor(currentUser);
  return {
    ...actor,
    email: currentUser.email
  };
}

function getCollabPermissionEventUrl(collabUrl: string) {
  const url = new URL(collabUrl);

  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "/internal/events/document-permission-update";
  url.search = "";

  return url.toString();
}

function toAccessLevel(role: DocumentRole | null): SessionAccessLevel | "none" {
  if (role === null) {
    return "none";
  }

  return role === "owner" || role === "editor" ? "write" : "read";
}

async function notifyPermissionUpdate(
  app: FastifyInstance,
  event: DocumentPermissionUpdatedEvent
) {
  const endpoint = getCollabPermissionEventUrl(app.apiEnv.COLLAB_INTERNAL_URL ?? app.apiEnv.COLLAB_URL);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      app.appLogger.warn("sharing.permission_event_failed", {
        documentId: event.documentId,
        endpoint,
        statusCode: response.status,
        userId: event.userId
      });
    }
  } catch (error) {
    app.appLogger.warn("sharing.permission_event_failed", {
      documentId: event.documentId,
      endpoint,
      error: error instanceof Error ? error.message : "Unknown fetch failure.",
      userId: event.userId
    });
  }
}

export async function registerSharingModule(app: FastifyInstance) {
  app.decorate(
    "sharingService",
    new SharingService(app.documentsService, app.auditService, app.apiEnv.SESSION_SECRET)
  );

  app.post("/v1/documents/:documentId/invitations", protectedRoute, async (request, reply) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };
    const body = createInvitationBodySchema.parse(request.body);
    const response = app.sharingService.createInvitation(params.documentId, body.email, body.role, actor);

    return reply.status(201).send(response);
  });

  app.post("/v1/invitations/accept", protectedRoute, async (request) => {
    const actor = getActorWithEmail(requireCurrentUser(request));
    const body = acceptInvitationBodySchema.parse(request.body);
    const response = app.sharingService.acceptInvitation(body.token, actor);

    await notifyPermissionUpdate(app, {
      type: "document.permission.updated",
      accessLevel: toAccessLevel(response.membership.role),
      changedAt: response.acceptedAt,
      documentId: response.invitation.documentId,
      role: response.membership.role,
      triggeredByUserId: actor.userId,
      userId: response.membership.userId
    });

    return response;
  });

  app.patch("/v1/documents/:documentId/members/:userId", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string; userId: string };
    const body = updateRoleBodySchema.parse(request.body);
    const response = app.sharingService.updateRole(params.documentId, params.userId, body.role, actor);

    await notifyPermissionUpdate(app, {
      type: "document.permission.updated",
      accessLevel: toAccessLevel(response.membership.role),
      changedAt: response.updatedAt,
      documentId: params.documentId,
      role: response.membership.role,
      triggeredByUserId: actor.userId,
      userId: params.userId
    });

    return response;
  });

  app.delete("/v1/documents/:documentId/members/:userId", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string; userId: string };
    const response = app.sharingService.revokeAccess(params.documentId, params.userId, actor);

    await notifyPermissionUpdate(app, {
      type: "document.permission.updated",
      accessLevel: "none",
      changedAt: response.revokedAt,
      documentId: params.documentId,
      role: null,
      triggeredByUserId: actor.userId,
      userId: params.userId
    });

    return response;
  });
}
