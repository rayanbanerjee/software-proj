import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyApiTestEnv,
  createApiTestApp,
  createSessionHeaders
} from "./integration/harness.js";

const originalEnv = { ...process.env };

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
      status: "succeeded",
      queuedAt: expect.any(String)
    });

    const requestId = submitResponse.json().requestId as string;
    const statusResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/ai/requests/${requestId}`,
      headers: ownerHeaders
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
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

    const statusResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/ai/requests/${requestId}`,
      headers: ownerHeaders
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
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

  it("accepts and rejects proposal decisions through dedicated endpoints", async () => {
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

    const statusResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/ai/requests/${requestId}`,
      headers: ownerHeaders
    });
    const proposalId = statusResponse.json().proposal.proposalId as string;

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

    app.aiService.markRequestStaleForTest(requestId, {
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
      status: "succeeded"
    });

    const requestId = submitResponse.json().requestId as string;
    const statusResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/ai/requests/${requestId}`,
      headers: ownerHeaders
    });

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
    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      status: "succeeded",
      errorMessage: null,
      proposal: {
        proposedText: "OpenRouter proposal text.",
        summary: "OpenRouter summary."
      }
    });

    await app.close();
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
      status: "failed"
    });

    const requestId = submitResponse.json().requestId as string;
    const statusResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/ai/requests/${requestId}`,
      headers: ownerHeaders
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      requestId,
      status: "failed",
      errorMessage: "Invalid OpenRouter key.",
      proposal: null
    });

    await app.close();
  });
});
