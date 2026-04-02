import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { AppError } from "../../common/errors.js";
import { authenticateRequest, requireCurrentUser } from "../auth/guard.js";
import type { DocumentActor } from "../documents/service.js";
import { MockProviderClient } from "./mock-provider-client.js";
import { submitAiRequestSchema } from "./schema.js";
import { AiService } from "./service.js";

const proposalDecisionSchema = z.object({
  proposalId: z.string().trim().min(1),
  reason: z.string().trim().min(1).optional()
});

function getActor(user: { id: string; name: string | null }): DocumentActor {
  return {
    userId: user.id,
    name: user.name
  };
}

export async function registerAiModule(app: FastifyInstance) {
  app.decorate("aiService", new AiService(app.documentsService, new MockProviderClient()));

  app.post("/v1/documents/:documentId/ai/requests", { preHandler: authenticateRequest }, async (request, reply) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };
    const parsed = submitAiRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new AppError("AI_REQUEST_INVALID", 400, "AI request payload is invalid.");
    }

    const body = parsed.data;
    const response = await app.aiService.submitRequest(params.documentId, body, actor);

    return reply.status(202).send(response);
  });

  app.get("/v1/documents/:documentId/ai/requests/:requestId", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string; requestId: string };

    return app.aiService.getRequestStatus(params.documentId, params.requestId, actor);
  });

  app.post("/v1/documents/:documentId/ai/proposals/accept", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };
    const body = proposalDecisionSchema.parse(request.body);

    return app.aiService.acceptProposal(params.documentId, body.proposalId, actor);
  });

  app.post("/v1/documents/:documentId/ai/proposals/reject", { preHandler: authenticateRequest }, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };
    const body = proposalDecisionSchema.parse(request.body);

    return app.aiService.rejectProposal(params.documentId, body.proposalId, actor);
  });
}
