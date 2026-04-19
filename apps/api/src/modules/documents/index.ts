import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { DocumentsService, type DocumentActor } from "./service.js";
import { authenticateRequest, requireCurrentUser } from "../auth/guard.js";

const createDocumentBodySchema = z.object({
  title: z.string().trim().min(1)
});

const renameDocumentBodySchema = z.object({
  title: z.string().trim().min(1)
});

const createDocumentSessionBodySchema = z.object({
  lastKnownSessionId: z.string().trim().min(1).optional()
});

const updateDocumentContentBodySchema = z.object({
  text: z.string()
});

function getActor(user: { id: string; name: string | null }): DocumentActor {
  return {
    userId: user.id,
    name: user.name
  };
}

export async function registerDocumentsModule(app: FastifyInstance) {
  app.decorate("documentsService", new DocumentsService());

  app.post("/v1/documents", { preHandler: authenticateRequest }, async (request, reply) => {
    const actor = getActor(requireCurrentUser(request));
    const body = createDocumentBodySchema.parse(request.body);
    const response = app.documentsService.createDocument(body.title, actor);

    return reply.status(201).send(response);
  });

  app.get("/v1/documents", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    return app.documentsService.listDocuments(actor);
  });

  app.get("/v1/documents/:documentId", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };

    return app.documentsService.getDocumentMetadata(params.documentId, actor);
  });

  app.post(
    "/v1/documents/:documentId/sessions",
    { preHandler: authenticateRequest },
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string };
      const body = createDocumentSessionBodySchema.parse(request.body ?? {});

      if (!request.authSession) {
        throw new Error("Authenticated request is missing auth session context.");
      }

      return app.documentsService.createDocumentSession(params.documentId, actor, {
        collabBaseUrl: app.apiEnv.COLLAB_URL,
        lastKnownSessionId: body.lastKnownSessionId,
        sessionToken: request.authSession.token
      });
    }
  );

  app.get("/v1/documents/:documentId/content", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };

    return app.documentsService.getDocumentContent(params.documentId, actor);
  });

  app.patch("/v1/documents/:documentId", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };
    const body = renameDocumentBodySchema.parse(request.body);

    return app.documentsService.renameDocument(params.documentId, body.title, actor);
  });

  app.put(
    "/v1/documents/:documentId/content",
    { preHandler: authenticateRequest },
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string };
      const body = updateDocumentContentBodySchema.parse(request.body);

      return app.documentsService.updateDocumentContent(params.documentId, body.text, actor);
    }
  );

  app.delete("/v1/documents/:documentId", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };

    return app.documentsService.archiveDocument(params.documentId, actor);
  });
}
