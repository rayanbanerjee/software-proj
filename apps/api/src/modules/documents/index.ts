import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { DocumentsService, type DocumentActor } from "./service.js";
import { notifyCollabDocumentContentSync } from "./collab-sync.js";
import { protectedRoute, requireCurrentUser } from "../auth/guard.js";

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

const internalDocumentContentSyncBodySchema = z.object({
  text: z.string()
});

function getActor(user: { id: string; name: string | null }): DocumentActor {
  return {
    userId: user.id,
    name: user.name
  };
}

export async function registerDocumentsModule(app: FastifyInstance) {
  app.decorate("documentsService", new DocumentsService(app.apiEnv.API_DATA_DIR));

  app.post("/internal/documents/:documentId/content-sync", async (request, reply) => {
    const token = request.headers["x-api-token"];

    if (token !== app.apiEnv.SESSION_SECRET) {
      return reply.status(401).send({
        error: "Invalid internal content sync token."
      });
    }

    const params = request.params as { documentId: string };
    const body = internalDocumentContentSyncBodySchema.parse(request.body);
    const response = app.documentsService.syncDocumentContentFromCollab(params.documentId, body.text);

    return reply.status(202).send({
      content: response.content,
      status: "accepted"
    });
  });

  app.post("/v1/documents", protectedRoute, async (request, reply) => {
    const actor = getActor(requireCurrentUser(request));
    const body = createDocumentBodySchema.parse(request.body);
    const response = app.documentsService.createDocument(body.title, actor);

    return reply.status(201).send(response);
  });

  app.get("/v1/documents", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    return app.documentsService.listDocuments(actor);
  });

  app.get("/v1/documents/:documentId", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };

    return app.documentsService.getDocumentMetadata(params.documentId, actor);
  });

  app.post(
    "/v1/documents/:documentId/sessions",
    protectedRoute,
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string };
      const body = createDocumentSessionBodySchema.parse(request.body ?? {});

      if (!request.authSession) {
        throw new Error("Authenticated request is missing auth session context.");
      }

      await notifyCollabDocumentContentSync(app, params.documentId, actor, {
        initializeIfEmpty: true
      });

      return app.documentsService.createDocumentSession(params.documentId, actor, {
        collabBaseUrl: app.apiEnv.COLLAB_URL,
        lastKnownSessionId: body.lastKnownSessionId,
        sessionToken: request.authSession.token
      });
    }
  );

  app.get("/v1/documents/:documentId/content", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };

    return app.documentsService.getDocumentContent(params.documentId, actor);
  });

  app.patch("/v1/documents/:documentId", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };
    const body = renameDocumentBodySchema.parse(request.body);

    return app.documentsService.renameDocument(params.documentId, body.title, actor);
  });

  app.put(
    "/v1/documents/:documentId/content",
    protectedRoute,
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string };
      const body = updateDocumentContentBodySchema.parse(request.body);

      const response = app.documentsService.updateDocumentContent(params.documentId, body.text, actor);
      await notifyCollabDocumentContentSync(app, params.documentId, actor);

      return response;
    }
  );

  app.delete("/v1/documents/:documentId", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };

    return app.documentsService.archiveDocument(params.documentId, actor);
  });
}
