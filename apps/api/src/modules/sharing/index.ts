import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { AppError } from "../../common/errors.js";
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

function getActor(headers: Record<string, string | string[] | undefined>): DocumentActor {
  const userIdHeader = headers["x-user-id"];
  const userNameHeader = headers["x-user-name"];

  const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
  const name = Array.isArray(userNameHeader) ? userNameHeader[0] : userNameHeader;

  if (!userId) {
    throw new AppError("UNAUTHORIZED", 401, "Missing x-user-id header.");
  }

  return {
    userId,
    name: name ?? null
  };
}

function getActorWithEmail(headers: Record<string, string | string[] | undefined>) {
  const actor = getActor(headers);
  const emailHeader = headers["x-user-email"];
  const email = Array.isArray(emailHeader) ? emailHeader[0] : emailHeader;

  if (!email) {
    throw new AppError("UNAUTHORIZED", 401, "Missing x-user-email header.");
  }

  return {
    ...actor,
    email
  };
}

export async function registerSharingModule(app: FastifyInstance) {
  app.decorate(
    "sharingService",
    new SharingService(app.documentsService, app.auditService, app.apiEnv.SESSION_SECRET)
  );

  app.post("/v1/documents/:documentId/invitations", async (request, reply) => {
    const actor = getActor(request.headers);
    const params = request.params as { documentId: string };
    const body = createInvitationBodySchema.parse(request.body);
    const response = app.sharingService.createInvitation(params.documentId, body.email, body.role, actor);

    return reply.status(201).send(response);
  });

  app.post("/v1/invitations/accept", async (request) => {
    const actor = getActorWithEmail(request.headers);
    const body = acceptInvitationBodySchema.parse(request.body);

    return app.sharingService.acceptInvitation(body.token, actor);
  });

  app.patch("/v1/documents/:documentId/members/:userId", async (request) => {
    const actor = getActor(request.headers);
    const params = request.params as { documentId: string; userId: string };
    const body = updateRoleBodySchema.parse(request.body);

    return app.sharingService.updateRole(params.documentId, params.userId, body.role, actor);
  });

  app.delete("/v1/documents/:documentId/members/:userId", async (request) => {
    const actor = getActor(request.headers);
    const params = request.params as { documentId: string; userId: string };

    return app.sharingService.revokeAccess(params.documentId, params.userId, actor);
  });
}
