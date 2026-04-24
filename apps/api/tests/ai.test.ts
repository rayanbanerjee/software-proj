import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import type { GetAiRequestStatusResponse } from "@repo/shared-types";

import {
  applyApiTestEnv,
  createApiTestApp,
  createSessionHeaders
} from "./integration/harness.js";
import { OpenRouterProviderClient } from "../src/modules/ai/openrouter-provider.js";

const originalEnv = { ...process.env };

async function waitForAiRequest(
  app: FastifyInstance,
  documentId: string,
  requestId: string,
  headers: Record<string, string>
) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/ai/requests/${requestId}`,
      headers
    });

    if (response.statusCode !== 200) {
      throw new Error(`Unexpected AI status response ${response.statusCode}`);
    }

    const payload = response.json() as GetAiRequestStatusResponse;

    if (payload.status !== "queued" && payload.status !== "running") {
      return payload;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }

  throw new Error(`AI request ${requestId} did not finish in time.`);
}

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("ai module", () => {
  it("submits an AI request and returns status with a proposal", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "AI doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "summarize",
        prompt: "Keep it short",
        context: {
          scope: "selection",
          selectedText: "This document needs a concise summary.",
          surroundingText: "Context around the selected passage."
        },
        maskPersonalData: true
      }
    });

    expect(submitResponse.statusCode).toBe(202);
    expect(submitResponse.json()).toMatchObject({
      requestId: expect.any(String),
      status: "queued",
      queuedAt: expect.any(String)
    });

    const requestId = submitResponse.json().requestId as string;
    const statusPayload = await waitForAiRequest(app, documentId, requestId, ownerHeaders);

    expect(statusPayload).toMatchObject({
      requestId,
      status: "succeeded",
      proposal: {
        requestId,
        documentId,
        action: "summarize",
        isStale: false,
        originalText: "This document needs a concise summary.",
        proposedText: expect.stringContaining("[SUMMARY]"),
        summary: "Mock summarize proposal generated locally for development."
      }
    });

    await app.close();
  });

  it("defaults translation requests to English when no target language is provided", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Translation doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "translate",
        prompt: null,
        context: {
          scope: "selection",
          selectedText: "Bonjour tout le monde.",
          surroundingText: null
        },
        maskPersonalData: false
      }
    });

    expect(submitResponse.statusCode).toBe(202);
    const requestId = submitResponse.json().requestId as string;
    const statusPayload = await waitForAiRequest(app, documentId, requestId, ownerHeaders);

    expect(statusPayload).toMatchObject({
      requestId,
      status: "succeeded",
      proposal: {
        action: "translate",
        proposedText: expect.stringContaining("[TRANSLATED TO ENGLISH]"),
        summary: "Mock translate proposal generated locally for development to English."
      }
    });

    await app.close();
  });

  it("accepts document-wide proposals and applies the generated content", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Decision doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const seedContentResponse = await app.inject({
      method: "PUT",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders,
      payload: {
        text: "Rewrite this document in a simpler tone."
      }
    });

    expect(seedContentResponse.statusCode).toBe(200);

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "rewrite",
        prompt: null,
        context: {
          scope: "document",
          selectedText: null,
          surroundingText: "Rewrite this document in a simpler tone."
        },
        maskPersonalData: false
      }
    });
    const requestId = submitResponse.json().requestId as string;
    const statusPayload = await waitForAiRequest(app, documentId, requestId, ownerHeaders);
    const proposalId = statusPayload.proposal?.proposalId as string;

    const acceptResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/proposals/accept`,
      headers: ownerHeaders,
      payload: {
        proposalId
      }
    });

    expect(acceptResponse.statusCode).toBe(200);
    expect(acceptResponse.json()).toEqual({
      proposalId,
      appliedAt: expect.any(String)
    });

    const contentResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders
    });

    expect(contentResponse.statusCode).toBe(200);
    expect(contentResponse.json()).toMatchObject({
      content: {
        documentId,
        text: "[REWRITE] Rewrite this document in a simpler tone."
      }
    });

    const statusAfterAcceptResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/ai/requests/${requestId}`,
      headers: ownerHeaders
    });

    expect(statusAfterAcceptResponse.statusCode).toBe(200);
    expect(statusAfterAcceptResponse.json()).toMatchObject({
      requestId,
      proposal: null
    });

    await app.close();
  });

  it("rejects proposals without mutating the document", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Rejected decision doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const seedContentResponse = await app.inject({
      method: "PUT",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders,
      payload: {
        text: "Keep this content unchanged."
      }
    });

    expect(seedContentResponse.statusCode).toBe(200);

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "rewrite",
        prompt: null,
        context: {
          scope: "document",
          selectedText: null,
          surroundingText: "Keep this content unchanged."
        },
        maskPersonalData: false
      }
    });
    const requestId = submitResponse.json().requestId as string;
    const statusPayload = await waitForAiRequest(app, documentId, requestId, ownerHeaders);
    const proposalId = statusPayload.proposal?.proposalId as string;

    const rejectResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/proposals/reject`,
      headers: ownerHeaders,
      payload: {
        proposalId
      }
    });

    expect(rejectResponse.statusCode).toBe(200);
    expect(rejectResponse.json()).toEqual({
      proposalId,
      rejectedAt: expect.any(String)
    });

    const contentResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders
    });

    expect(contentResponse.statusCode).toBe(200);
    expect(contentResponse.json()).toMatchObject({
      content: {
        documentId,
        text: "Keep this content unchanged."
      }
    });

    await app.close();
  });

  it("applies selection proposals against the stored document snapshot", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Selection AI doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const seedContentResponse = await app.inject({
      method: "PUT",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders,
      payload: {
        text: "Alpha Beta Gamma"
      }
    });

    expect(seedContentResponse.statusCode).toBe(200);

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "rewrite",
        prompt: null,
        context: {
          scope: "selection",
          selectedText: "Beta",
          surroundingText: "Alpha Beta Gamma"
        },
        maskPersonalData: false
      }
    });
    const requestId = submitResponse.json().requestId as string;
    const statusPayload = await waitForAiRequest(app, documentId, requestId, ownerHeaders);
    const proposalId = statusPayload.proposal?.proposalId as string;

    const acceptResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/proposals/accept`,
      headers: ownerHeaders,
      payload: {
        proposalId
      }
    });

    expect(acceptResponse.statusCode).toBe(200);

    const contentResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders
    });

    expect(contentResponse.statusCode).toBe(200);
    expect(contentResponse.json()).toMatchObject({
      content: {
        documentId,
        text: "Alpha [REWRITE] Beta Gamma"
      }
    });

    await app.close();
  });

  it("marks proposals stale when the source fingerprint changes", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Stale AI doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "summarize",
        prompt: null,
        context: {
          scope: "selection",
          selectedText: "Initial AI text.",
          surroundingText: "Original context."
        },
        maskPersonalData: false
      }
    });
    const requestId = submitResponse.json().requestId as string;
    await waitForAiRequest(app, documentId, requestId, ownerHeaders);

    await app.aiService.markRequestStaleForTest(requestId, {
      sourceText: "Revised document text after edits."
    });

    const statusResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/ai/requests/${requestId}`,
      headers: ownerHeaders
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      requestId,
      status: "stale",
      proposal: {
        isStale: true
      }
    });

    const acceptResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/proposals/accept`,
      headers: ownerHeaders,
      payload: {
        proposalId: statusResponse.json().proposal.proposalId
      }
    });

    expect(acceptResponse.statusCode).toBe(409);
    expect(acceptResponse.json()).toEqual({
      error: {
        code: "AI_PROPOSAL_STALE",
        message: "AI proposal is stale and cannot be applied.",
        statusCode: 409
      }
    });

    await app.close();
  });

  it("validates AI request payload shape and returns not found for missing requests", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Invalid AI doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const invalidResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "expand",
        prompt: null,
        context: {
          scope: "line",
          selectedText: null,
          surroundingText: null
        },
        maskPersonalData: false
      }
    });

    expect(invalidResponse.statusCode).toBe(400);
    expect(invalidResponse.json()).toEqual({
      error: {
        code: "AI_REQUEST_INVALID",
        message: "AI request payload is invalid.",
        statusCode: 400
      }
    });

    const missingResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/ai/requests/air_missing`,
      headers: ownerHeaders
    });

    expect(missingResponse.statusCode).toBe(404);
    expect(missingResponse.json()).toEqual({
      error: {
        code: "AI_REQUEST_NOT_FOUND",
        message: "AI request was not found for this document.",
        statusCode: 404
      }
    });

    await app.close();
  });

  it("uses OpenRouter when configured and parses the provider response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                proposedText: "OpenRouter proposal text.",
                summary: "OpenRouter summary."
              })
            }
          }
        ]
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    process.env = applyApiTestEnv({
      OPENROUTER_API_KEY: "openrouter-test-key",
      OPENROUTER_APP_NAME: "software-proj",
      OPENROUTER_APP_URL: "http://localhost:3000"
    });

    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "OpenRouter doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "rewrite",
        prompt: "Make it more concise",
        context: {
          scope: "selection",
          selectedText: "This paragraph should be rewritten.",
          surroundingText: null
        },
        maskPersonalData: false
      }
    });

    expect(submitResponse.statusCode).toBe(202);
    expect(submitResponse.json()).toMatchObject({
      status: "queued"
    });

    const requestId = submitResponse.json().requestId as string;
    const statusPayload = await waitForAiRequest(app, documentId, requestId, ownerHeaders);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://openrouter.ai/api/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer openrouter-test-key",
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "software-proj"
        })
      })
    );
    expect(statusPayload).toMatchObject({
      status: "succeeded",
      errorMessage: null,
      proposal: {
        proposedText: "OpenRouter proposal text.",
        summary: "OpenRouter summary."
      }
    });

    await app.close();
  });

  it("requires a streaming-capable OpenRouter provider for streamed text", async () => {
    const encoder = new TextEncoder();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n')
          );
          controller.enqueue(
            encoder.encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n')
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenRouterProviderClient({
      apiKey: "openrouter-test-key",
      baseUrl: "https://openrouter.ai/api/v1",
      model: "default-model",
      streamModel: "stream-model"
    });

    const chunks: string[] = [];

    for await (const chunk of provider.streamText({
      action: "rewrite",
      context: {
        scope: "selection",
        selectedText: "hello",
        surroundingText: null
      },
      maskPersonalData: false,
      prompt: null
    })) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hello", " world"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as {
      model?: string;
      provider?: { require_parameters?: boolean };
      stream?: boolean;
    };

    expect(body).toMatchObject({
      model: "stream-model",
      provider: {
        require_parameters: true
      },
      stream: true
    });
  });

  it("stores failed request status when the OpenRouter call fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          message: "Invalid OpenRouter key."
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    process.env = applyApiTestEnv({
      OPENROUTER_API_KEY: "bad-key"
    });

    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Failed OpenRouter doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "summarize",
        prompt: null,
        context: {
          scope: "document",
          selectedText: null,
          surroundingText: "This request should fail."
        },
        maskPersonalData: false
      }
    });

    expect(submitResponse.statusCode).toBe(202);
    expect(submitResponse.json()).toMatchObject({
      status: "queued"
    });

    const requestId = submitResponse.json().requestId as string;
    const statusPayload = await waitForAiRequest(app, documentId, requestId, ownerHeaders);

    expect(statusPayload).toMatchObject({
      requestId,
      status: "failed",
      errorMessage: "Invalid OpenRouter key.",
      proposal: null
    });

    await app.close();
  });

  it("persists queued AI requests across app restarts when the data dir is reused", async () => {
    const dataDir = process.env.API_DATA_DIR as string;
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Persistent AI doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: "summarize",
        prompt: null,
        context: {
          scope: "selection",
          selectedText: "Persist this request across restarts.",
          surroundingText: null
        },
        maskPersonalData: false
      }
    });

    expect(submitResponse.statusCode).toBe(202);
    const requestId = submitResponse.json().requestId as string;

    await app.close();

    process.env = applyApiTestEnv({
      API_DATA_DIR: dataDir
    });

    const restartedApp = await createApiTestApp();
    const restartedHeaders = createSessionHeaders(restartedApp, {
      email: "owner@example.com",
      subject: "user_owner"
    });
    const statusPayload = await waitForAiRequest(restartedApp, documentId, requestId, restartedHeaders);

    expect(statusPayload).toMatchObject({
      requestId,
      status: "succeeded",
      proposal: {
        requestId,
        documentId
      }
    });

    await restartedApp.close();
  });
});
