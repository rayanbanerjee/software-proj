import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { VersionsService } from "./service.js";
import { authenticateRequest, requireCurrentUser } from "../auth/guard.js";
import type { DocumentActor } from "../documents/service.js";

const rollbackRevisionBodySchema = z.object({
  revisionId: z.string().trim().min(1)
});

const revisionDiffQuerySchema = z.object({
  compareToRevisionId: z.string().trim().min(1).optional()
});

function getActor(user: { id: string; name: string | null }): DocumentActor {
  return {
    userId: user.id,
    name: user.name
  };
}

export async function registerVersionsModule(app: FastifyInstance) {
  app.decorate("versionsService", new VersionsService(app.documentsService));

  app.get(
    "/v1/documents/:documentId/versions",
    { preHandler: authenticateRequest },
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string };

      return app.versionsService.listRevisions(params.documentId, actor);
    }
  );

  app.get(
    "/v1/documents/:documentId/versions/:revisionId",
    { preHandler: authenticateRequest },
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string; revisionId: string };

      return app.versionsService.getRevisionDetail(params.documentId, params.revisionId, actor);
    }
  );

  app.get(
    "/v1/documents/:documentId/versions/:revisionId/diff",
    { preHandler: authenticateRequest },
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string; revisionId: string };
      const query = revisionDiffQuerySchema.parse(request.query ?? {});

      return app.versionsService.getRevisionDiff(
        params.documentId,
        params.revisionId,
        query.compareToRevisionId ?? null,
        actor
      );
    }
  );

  app.post(
    "/v1/documents/:documentId/versions/rollback",
    { preHandler: authenticateRequest },
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string };
      const body = rollbackRevisionBodySchema.parse(request.body);

      return app.versionsService.rollbackRevision(params.documentId, body.revisionId, actor);
    }
  );
}
