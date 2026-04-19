import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { protectedRoute, requireCurrentUser } from "../auth/guard.js";
import { CommentsService } from "./service.js";

const createCommentBodySchema = z.object({
  body: z.string().trim().min(1)
});

function getActor(user: { id: string; name: string | null }) {
  return {
    userId: user.id,
    name: user.name
  };
}

export async function registerCommentsModule(app: FastifyInstance) {
  app.decorate("commentsService", new CommentsService(app.apiEnv.API_DATA_DIR));

  app.get("/v1/documents/:documentId/comments", protectedRoute, async (request) => {
    const params = request.params as { documentId: string };
    const actor = getActor(requireCurrentUser(request));
    const metadata = app.documentsService.getDocumentMetadata(params.documentId, actor);

    if (!metadata.document.permissions.canView) {
      throw new Error("Document metadata did not enforce view permissions.");
    }

    return app.commentsService.listComments(params.documentId);
  });

  app.post("/v1/documents/:documentId/comments", protectedRoute, async (request, reply) => {
    const params = request.params as { documentId: string };
    const actor = getActor(requireCurrentUser(request));
    const body = createCommentBodySchema.parse(request.body);
    const metadata = app.documentsService.getDocumentMetadata(params.documentId, actor);
    const response = app.commentsService.createComment(
      params.documentId,
      actor,
      metadata.document.permissions.role,
      body.body
    );

    return reply.status(201).send(response);
  });
}
