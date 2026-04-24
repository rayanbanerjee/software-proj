import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { DocumentRollbackEvent } from "@repo/shared-types";

import { VersionsService } from "./service.js";
import { protectedRoute, requireCurrentUser } from "../auth/guard.js";
import type { DocumentActor } from "../documents/service.js";
import { notifyCollabDocumentContentSync } from "../documents/collab-sync.js";

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

function getCollabRollbackEventUrl(collabUrl: string) {
  const url = new URL(collabUrl);

  url.protocol = url.protocol === "wss:" ? "https:" : "http:";
  url.pathname = "/internal/events/document-rollback";
  url.search = "";

  return url.toString();
}

async function notifyRollbackEvent(
  app: FastifyInstance,
  event: DocumentRollbackEvent
) {
  const endpoint = getCollabRollbackEventUrl(app.apiEnv.COLLAB_INTERNAL_URL ?? app.apiEnv.COLLAB_URL);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(event)
    });

    if (!response.ok) {
      app.appLogger.warn("versions.rollback_event_failed", {
        documentId: event.documentId,
        endpoint,
        revisionId: event.revisionId,
        statusCode: response.status
      });
    }
  } catch (error) {
    app.appLogger.warn("versions.rollback_event_failed", {
      documentId: event.documentId,
      endpoint,
      error: error instanceof Error ? error.message : "Unknown fetch failure.",
      revisionId: event.revisionId
    });
  }
}

export async function registerVersionsModule(app: FastifyInstance) {
  app.decorate("versionsService", new VersionsService(app.prisma, app.documentsService));

  app.get(
    "/v1/documents/:documentId/versions",
    protectedRoute,
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string };

      return await app.versionsService.listRevisions(params.documentId, actor);
    }
  );

  app.get(
    "/v1/documents/:documentId/versions/:revisionId",
    protectedRoute,
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string; revisionId: string };

      return await app.versionsService.getRevisionDetail(params.documentId, params.revisionId, actor);
    }
  );

  app.get(
    "/v1/documents/:documentId/versions/:revisionId/diff",
    protectedRoute,
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string; revisionId: string };
      const query = revisionDiffQuerySchema.parse(request.query ?? {});

      return await app.versionsService.getRevisionDiff(
        params.documentId,
        params.revisionId,
        query.compareToRevisionId ?? null,
        actor
      );
    }
  );

  app.post(
    "/v1/documents/:documentId/versions/rollback",
    protectedRoute,
    async (request) => {
      const actor = getActor(requireCurrentUser(request));
      const params = request.params as { documentId: string };
      const body = rollbackRevisionBodySchema.parse(request.body);
      const rollback = await app.versionsService.rollbackRevision(params.documentId, body.revisionId, actor);
      await notifyCollabDocumentContentSync(app, params.documentId, actor);

      await notifyRollbackEvent(app, {
        type: "document.rollback",
        documentId: params.documentId,
        revisionId: rollback.revisionId,
        restoredFromRevisionId: body.revisionId,
        rolledBackAt: rollback.rolledBackAt,
        triggeredByUserId: actor.userId
      });

      return rollback;
    }
  );
}
