import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
});
