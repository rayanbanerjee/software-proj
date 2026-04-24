import type { AiStreamEvent, RetrieveRagContextRequest } from "@repo/shared-types";
import { canUseAi } from "@repo/authz";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";

import { AppError } from "../../common/errors.js";
import { protectedRoute, requireCurrentUser } from "../auth/guard.js";
import type { DocumentActor } from "../documents/service.js";
import { notifyCollabDocumentContentSync } from "../documents/collab-sync.js";
import { NotConfiguredProviderClient } from "./not-configured-provider.js";
import { OpenRouterProviderClient } from "./openrouter-provider.js";
import { listPromptTemplates, retrieveRagContext } from "./rag.js";
import { submitAiRequestSchema } from "./schema.js";
import { AiService } from "./service.js";
import { StubStreamingProvider } from "./stub-streaming-provider.js";

const proposalDecisionSchema = z.object({
  proposalId: z.string().trim().min(1),
  editedText: z.string().optional(),
  reason: z.string().trim().min(1).optional()
});

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

function getActor(user: { id: string; name: string | null }): DocumentActor {
  return {
    userId: user.id,
    name: user.name
  };
}

function parseProviderList(value: string | undefined) {
  return value
    ?.split(",")
    .map((provider) => provider.trim())
    .filter((provider) => provider.length > 0);
}

export async function registerAiModule(app: FastifyInstance) {
  const provider = app.apiEnv.OPENROUTER_API_KEY
    ? new OpenRouterProviderClient({
        apiKey: app.apiEnv.OPENROUTER_API_KEY,
        allowFallbacks: app.apiEnv.OPENROUTER_ALLOW_FALLBACKS,
        appName: app.apiEnv.OPENROUTER_APP_NAME,
        appUrl: app.apiEnv.OPENROUTER_APP_URL,
        baseUrl: app.apiEnv.OPENROUTER_BASE_URL,
        model: app.apiEnv.OPENROUTER_MODEL,
        providers: parseProviderList(app.apiEnv.OPENROUTER_PROVIDERS),
        streamModel: app.apiEnv.OPENROUTER_STREAM_MODEL
      })
    : app.apiEnv.NODE_ENV === "test"
      ? new StubStreamingProvider()
      : new NotConfiguredProviderClient();

  app.decorate("aiService", new AiService(app.prisma, app.documentsService, provider));

  app.get("/v1/ai/prompt-templates", protectedRoute, async () => {
    return listPromptTemplates();
  });

  app.post("/v1/ai/context/retrieve", protectedRoute, async (request) => {
    const currentUser = requireCurrentUser(request);
    const body = retrieveContextBodySchema.parse(request.body) as RetrieveRagContextRequest;
    const actor = getActor(currentUser);
    const documents = (await app.documentsService.listDocuments(actor)).documents;
    const documentContents = await Promise.all(
      documents.map(async (document) =>
        (await app.documentsService.getDocumentContent(document.id, actor)).content
      )
    );
    const visibleDocumentIds = new Set(documents.map((document) => document.id));
    const auditEvents = (await app.auditService
      .listEvents())
      .filter((event) => event.documentId === null || visibleDocumentIds.has(event.documentId));

    return retrieveRagContext({
      auditEvents,
      documentContents,
      documents,
      query: body.query,
      topK: body.topK,
      user: currentUser
    });
  });

  app.post("/v1/documents/:documentId/ai/requests", protectedRoute, async (request, reply) => {
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

  app.get("/v1/documents/:documentId/ai/requests/:requestId", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string; requestId: string };

    return await app.aiService.getRequestStatus(params.documentId, params.requestId, actor);
  });

  app.post("/v1/documents/:documentId/ai/proposals/accept", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };
    const body = proposalDecisionSchema.parse(request.body);

    const response = await app.aiService.acceptProposal(
      params.documentId,
      body.proposalId,
      actor,
      body.editedText
    );
    await notifyCollabDocumentContentSync(app, params.documentId, actor);

    return response;
  });

  app.post("/v1/documents/:documentId/ai/proposals/reject", protectedRoute, async (request) => {
    const actor = getActor(requireCurrentUser(request));
    const params = request.params as { documentId: string };
    const body = proposalDecisionSchema.parse(request.body);

    return await app.aiService.rejectProposal(params.documentId, body.proposalId, actor);
  });

  app.post(
    "/v1/documents/:documentId/ai/stream",
    protectedRoute,
    async (request, reply) => {
      const currentUser = requireCurrentUser(request);
      const params = request.params as { documentId: string };
      const body = streamAiRequestBodySchema.parse(request.body);
      const role = await app.documentsService.getDocumentRole(params.documentId, currentUser.id);

      if (!role || !canUseAi(role)) {
        throw new AppError(
          "DOCUMENT_FORBIDDEN",
          403,
          "You do not have permission to use AI for this document."
        );
      }

      reply.hijack();
      reply.raw.writeHead(200, {
        "access-control-allow-credentials": "true",
        "access-control-allow-origin": app.apiEnv.WEB_ORIGIN,
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "content-type": "text/event-stream; charset=utf-8",
        vary: "Origin"
      });
      reply.raw.flushHeaders();

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
  const raw = reply.raw as typeof reply.raw & { flush?: () => void };
  raw.flush?.();
}
