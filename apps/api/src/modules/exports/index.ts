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
}