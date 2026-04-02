import type { FastifyInstance } from "fastify";

import { authenticateRequest, requireCurrentUser } from "../auth/guard.js";
import type { DocumentActor } from "../documents/service.js";
import { createExportRequestSchema } from "./schema.js";
import { ExportsService } from "./service.js";

function getActor(user: { id: string; name: string | null }): DocumentActor {
  return {
    userId: user.id,
    name: user.name
  };
}

export async function registerExportsModule(app: FastifyInstance) {
  const exportsService = new ExportsService(app.documentsService);

  app.decorate("exportsService", exportsService);

  app.post("/v1/documents/:documentId/exports", { preHandler: authenticateRequest }, async (request, reply) => {
    const params = request.params as { documentId: string };
    const actor = getActor(requireCurrentUser(request));

    const parseResult = createExportRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "invalid_request",
        details: parseResult.error.flatten()
      });
    }

    const job = await exportsService.createExportJob(params.documentId, parseResult.data, actor);

    return reply.status(201).send(job);
  });

  app.get("/v1/documents/:documentId/exports/:exportJobId", { preHandler: authenticateRequest }, async (request, reply) => {
    const params = request.params as { documentId: string; exportJobId: string };
    const actor = getActor(requireCurrentUser(request));

    try {
      return await exportsService.getExportJob(params.documentId, params.exportJobId, actor);
    } catch (error) {
      if (
        error instanceof Error
        && "code" in error
        && (error as { code?: string }).code === "EXPORT_NOT_FOUND"
      ) {
        return reply.status(404).send({
          error: "export_not_found",
          message: "Export job was not found for this document"
        });
      }

      throw error;
    }
  });

  app.get("/v1/documents/:documentId/exports/:exportJobId/download", { preHandler: authenticateRequest }, async (request, reply) => {
    const params = request.params as { documentId: string; exportJobId: string };
    const actor = getActor(requireCurrentUser(request));

    try {
      const download = await exportsService.createDownloadLink(params.documentId, params.exportJobId, actor);

      if (!download) {
        return reply.status(409).send({
          error: "export_not_ready",
          message: "Export artifact is not ready for download"
        });
      }

      return reply.send(download);
    } catch (error) {
      if (
        error instanceof Error
        && "code" in error
        && (error as { code?: string }).code === "EXPORT_NOT_FOUND"
      ) {
        return reply.status(404).send({
          error: "export_not_found",
          message: "Export job was not found for this document"
        });
      }

      throw error;
    }
  });
}
