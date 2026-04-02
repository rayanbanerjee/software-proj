import type { FastifyInstance } from "fastify";

import { createAiRequestSchema } from "./schema.js";
import { AiService } from "./service.js";

export async function registerAiModule(app: FastifyInstance) {
  const aiService = new AiService();

  app.decorate("aiService", aiService);

  app.post("/documents/:id/ai-requests", async (request, reply) => {
    const params = request.params as { id: string };

    const parseResult = createAiRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: "invalid_request",
        details: parseResult.error.flatten()
      });
    }

    const aiRequest = await aiService.createAiRequest(params.id, parseResult.data);

    return reply.status(201).send({
      requestId: aiRequest.requestId,
      status: aiRequest.status
    });
  });

  app.get("/documents/:id/ai-requests/:requestId", async (request, reply) => {
    const params = request.params as { id: string; requestId: string };

    const aiRequest = await aiService.getAiRequest(params.id, params.requestId);

    if (!aiRequest) {
      return reply.status(404).send({
        error: "ai_request_not_found",
        message: "AI request was not found for this document"
      });
    }

    return reply.send({
      requestId: aiRequest.requestId,
      documentId: aiRequest.documentId,
      operation: aiRequest.operation,
      selection: aiRequest.selection,
      parameters: aiRequest.parameters,
      status: aiRequest.status
    });
  });
}