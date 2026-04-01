import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { AppError } from "../../common/errors.js";
import { DocumentsService, type DocumentActor } from "./service.js";

const createDocumentBodySchema = z.object({
  title: z.string().trim().min(1)
});

function getActor(app: FastifyInstance, headers: Record<string, string | string[] | undefined>): DocumentActor {
  const userIdHeader = headers["x-user-id"];
  const userNameHeader = headers["x-user-name"];

  const userId = Array.isArray(userIdHeader) ? userIdHeader[0] : userIdHeader;
  const name = Array.isArray(userNameHeader) ? userNameHeader[0] : userNameHeader;

  if (!userId) {
    throw new AppError("UNAUTHORIZED", 401, "Missing x-user-id header.");
  }

  void app;

  return {
    userId,
    name: name ?? null
  };
}

export async function registerDocumentsModule(app: FastifyInstance) {
  app.decorate("documentsService", new DocumentsService());

  app.post("/v1/documents", async (request, reply) => {
    const actor = getActor(app, request.headers);
    const body = createDocumentBodySchema.parse(request.body);
    const response = app.documentsService.createDocument(body.title, actor);

    return reply.status(201).send(response);
  });

  app.get("/v1/documents", async (request) => {
    const actor = getActor(app, request.headers);
    return app.documentsService.listDocuments(actor);
  });
}
