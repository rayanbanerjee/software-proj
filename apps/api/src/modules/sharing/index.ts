import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { DocumentActor } from "../documents/service.js";
import { authenticateRequest, requireCurrentUser } from "../auth/guard.js";
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

export async function registerSharingModule(app: FastifyInstance) {
  app.decorate(
    "sharingService",
    new SharingService(app.documentsService, app.auditService, app.apiEnv.SESSION_SECRET)
  );

  app.post("/v1/documents/:documentId/invitations", { preHandler: authenticateRequest }, async (request, reply) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };
    const body = createInvitationBodySchema.parse(request.body);
    const response = app.sharingService.createInvitation(params.documentId, body.email, body.role, actor);

    return reply.status(201).send(response);
  });

  app.post("/v1/invitations/accept", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActorWithEmail(requireCurrentUser(request));
    const body = acceptInvitationBodySchema.parse(request.body);

    return app.sharingService.acceptInvitation(body.token, actor);
  });

  app.patch("/v1/documents/:documentId/members/:userId", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string; userId: string };
    const body = updateRoleBodySchema.parse(request.body);

    return app.sharingService.updateRole(params.documentId, params.userId, body.role, actor);
  });

  app.delete("/v1/documents/:documentId/members/:userId", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string; userId: string };

    return app.sharingService.revokeAccess(params.documentId, params.userId, actor);
  });
}
