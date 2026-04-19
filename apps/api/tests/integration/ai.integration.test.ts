import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { GetAiRequestStatusResponse } from "@repo/shared-types";

import { makeAiRequestFixture } from "@repo/test-fixtures";

import {
  applyApiTestEnv,
  createApiTestApp,
  createSessionHeaders
} from "./harness.js";

const originalEnv = { ...process.env };

async function waitForAiRequest(
  app: Awaited<ReturnType<typeof createApiTestApp>>,
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
    const seedContentResponse = await app.inject({
      method: "PUT",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders,
      payload: {
        text: "Original integration text."
      }
    });

    expect(seedContentResponse.statusCode).toBe(200);
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
    await waitForAiRequest(app, documentId, requestId, ownerHeaders);

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
