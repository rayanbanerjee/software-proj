import type { AiStreamEvent, RetrieveRagContextRequest } from "@repo/shared-types";
import { canUseAi } from "@repo/authz";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { AppError } from "../../common/errors.js";
import { authenticateRequest, requireCurrentUser } from "../auth/guard.js";
import { listPromptTemplates, retrieveRagContext } from "./rag.js";
import { AiService } from "./service.js";

const streamAiRequestBodySchema = z.object({
  action: z.enum(["rewrite", "summarize", "translate", "restructure"]),
  prompt: z.string().trim().nullable(),
  context: z.object({
    scope: z.enum(["document", "selection"]),
    selectedText: z.string().nullable(),
    surroundingText: z.string().nullable()
  }),
  maskPersonalData: z.boolean().default(false)
});

const retrieveContextBodySchema = z.object({
  query: z.string().trim().default(""),
  topK: z.number().int().positive().max(10).optional()
});

export async function registerAiModule(app: FastifyInstance) {
  app.decorate(
    "aiService",
    new AiService({
      llmApiKey: app.apiEnv.LLM_API_KEY,
      openRouterApiKey: app.apiEnv.OPENROUTER_API_KEY,
      openRouterAppName: app.apiEnv.OPENROUTER_APP_NAME,
      openRouterAppUrl: app.apiEnv.OPENROUTER_APP_URL,
      openRouterBaseUrl: app.apiEnv.OPENROUTER_BASE_URL,
      openRouterModel: app.apiEnv.OPENROUTER_MODEL
    })
  );

  app.get("/v1/ai/prompt-templates", { preHandler: authenticateRequest }, async () => {
    return listPromptTemplates();
  });

  app.post(
    "/v1/ai/context/retrieve",
    { preHandler: authenticateRequest },
    async (request) => {
      const currentUser = requireCurrentUser(request);
      const body = retrieveContextBodySchema.parse(request.body) as RetrieveRagContextRequest;
      const documents = app.documentsService.listDocuments({
        userId: currentUser.id,
        name: currentUser.name
      }).documents;
      const documentContents = documents.map((document) =>
        app.documentsService.getDocumentContent(document.id, {
          userId: currentUser.id,
          name: currentUser.name
        }).content
      );
      const visibleDocumentIds = new Set(documents.map((document) => document.id));
      const auditEvents = app.auditService
        .listEvents()
        .filter((event) => event.documentId === null || visibleDocumentIds.has(event.documentId));

      return retrieveRagContext({
        auditEvents,
        documentContents,
        documents,
        query: body.query,
        topK: body.topK,
        user: currentUser
      });
    }
  );

  app.post(
    "/v1/documents/:documentId/ai/stream",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const currentUser = requireCurrentUser(request);
      const params = request.params as { documentId: string };
      const body = streamAiRequestBodySchema.parse(request.body);
      const role = app.documentsService.getDocumentRole(params.documentId, currentUser.id);

      if (!role || !canUseAi(role)) {
        throw new AppError(
          "DOCUMENT_FORBIDDEN",
          403,
          "You do not have permission to use AI for this document."
        );
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8"
      });

      for await (const event of app.aiService.streamProposal({
        ...body,
        documentId: params.documentId
      })) {
        writeSseEvent(reply, event);
      }

      reply.raw.end();
      return reply;
    }
  );
}

function writeSseEvent(reply: FastifyReply, event: AiStreamEvent) {
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}
