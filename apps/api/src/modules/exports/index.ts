import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { protectedRoute, requireCurrentUser } from "../auth/guard.js";
import type { DocumentActor } from "../documents/service.js";
import { createExportRequestSchema } from "./schema.js";
import { ExportsService } from "./service.js";

const artifactQuerySchema = z.object({
  expiresAt: z.string().trim().min(1),
  token: z.string().trim().min(1)
});

function getActor(user: { id: string; name: string | null }): DocumentActor {
  return {
    userId: user.id,
    name: user.name
  };
}

export async function registerExportsModule(app: FastifyInstance) {
  const exportsService = new ExportsService(app.documentsService, {
    dataDir: app.apiEnv.API_DATA_DIR,
    bucketName: app.apiEnv.OBJECT_STORAGE_BUCKET,
    sessionSecret: app.apiEnv.SESSION_SECRET
  });

  app.decorate("exportsService", exportsService);

  app.post("/v1/documents/:documentId/exports", protectedRoute, async (request, reply) => {
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

  app.get("/v1/documents/:documentId/exports/:exportJobId", protectedRoute, async (request, reply) => {
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

  app.get("/v1/documents/:documentId/exports/:exportJobId/download", protectedRoute, async (request, reply) => {
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

  app.get("/v1/documents/:documentId/exports/:exportJobId/artifact", protectedRoute, async (request, reply) => {
    const params = request.params as { documentId: string; exportJobId: string };
    const actor = getActor(requireCurrentUser(request));
    const query = artifactQuerySchema.parse(request.query ?? {});

    try {
      const artifact = await exportsService.resolveArtifact(params.documentId, params.exportJobId, actor, query);

      reply.header("content-disposition", `attachment; filename="${artifact.fileName}"`);
      reply.header("content-length", String(artifact.size));
      reply.header("content-type", artifact.mimeType);

      return reply.send(exportsService.createArtifactStream(artifact.filePath));
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

      if (
        error instanceof Error
        && "code" in error
        && (error as { code?: string }).code === "EXPORT_LINK_INVALID"
      ) {
        return reply.status(401).send({
          error: {
            code: "EXPORT_LINK_INVALID",
            message: "Export download token is invalid.",
            statusCode: 401
          }
        });
      }

      if (
        error instanceof Error
        && "code" in error
        && (error as { code?: string }).code === "EXPORT_NOT_READY"
      ) {
        return reply.status(409).send({
          error: "export_not_ready",
          message: "Export artifact is not ready for download"
        });
      }

      throw error;
    }
  });
}
