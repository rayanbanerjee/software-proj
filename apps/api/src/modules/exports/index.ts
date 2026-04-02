import type { FastifyInstance } from "fastify";

import { createExportRequestSchema } from "./schema.js";
import { ExportsService } from "./service.js";

export async function registerExportsModule(app: FastifyInstance) {
  const exportsService = new ExportsService();

  app.decorate("exportsService", exportsService);

  app.post("/documents/:id/exports", async (request, reply) => {
    const params = request.params as { id: string };

    const parseResult = createExportRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "invalid_request",
        details: parseResult.error.flatten()
      });
    }

    const job = await exportsService.createExportJob(params.id, parseResult.data);

    return reply.status(201).send({
      exportId: job.exportId,
      status: job.status
    });
  });

  app.get("/documents/:id/exports/:exportId", async (request, reply) => {
    const params = request.params as { id: string; exportId: string };

    const job = await exportsService.getExportJob(params.id, params.exportId);

    if (!job) {
      return reply.status(404).send({
        error: "export_not_found",
        message: "Export job was not found for this document"
      });
    }

    return reply.send({
      exportId: job.exportId,
      documentId: job.documentId,
      format: job.format,
      status: job.status
    });
  });

  app.get("/documents/:id/exports/:exportId/download", async (request, reply) => {
    const params = request.params as { id: string; exportId: string };

    const job = await exportsService.getExportJob(params.id, params.exportId);

    if (!job) {
      return reply.status(404).send({
        error: "export_not_found",
        message: "Export job was not found for this document"
      });
    }

    if (job.status !== "completed") {
      return reply.status(409).send({
        error: "export_not_ready",
        message: "Export artifact is not ready for download"
      });
    }

    const download = await exportsService.createDownloadLink(params.id, params.exportId);

    if (!download) {
      return reply.status(404).send({
        error: "export_not_found",
        message: "Export job was not found for this document"
      });
    }

    return reply.send(download);
  });
}