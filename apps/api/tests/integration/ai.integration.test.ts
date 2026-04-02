import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { makeAiRequestFixture } from "@repo/test-fixtures";

import {
  applyApiTestEnv,
  createApiTestApp,
  createSessionHeaders
} from "./harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("ai integration flow", () => {
  it("covers submit, status, stale detection, and acceptance failure in one flow", async () => {
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
        title: "AI integration doc"
      }
    });
    const documentId = createResponse.json().document.id as string;
    const aiRequest = makeAiRequestFixture({
      documentId,
      action: "rewrite",
      context: {
        scope: "selection",
        selectedText: "Original integration text.",
        surroundingText: "Extra integration context."
      },
      maskPersonalData: true
    });

    const submitResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/requests`,
      headers: ownerHeaders,
      payload: {
        action: aiRequest.action,
        prompt: aiRequest.prompt,
        context: aiRequest.context,
        maskPersonalData: aiRequest.maskPersonalData
      }
    });

    expect(submitResponse.statusCode).toBe(202);
    const requestId = submitResponse.json().requestId as string;

    app.aiService.markRequestStaleForTest(requestId, {
      sourceText: "Document text changed after the AI request."
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

    const proposalId = statusResponse.json().proposal.proposalId as string;
    const acceptResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/proposals/accept`,
      headers: ownerHeaders,
      payload: {
        proposalId
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
});
