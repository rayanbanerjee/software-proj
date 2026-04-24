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

function parseSseEvents(body: string) {
  return body
    .split("\n\n")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => chunk.replace(/^data:\s*/, ""))
    .map((chunk) => JSON.parse(chunk) as Record<string, unknown>);
}

describe("AI streaming endpoint", () => {
  it("streams proposal events for an authenticated owner", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      userId: "jwt:user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "AI stream doc"
      }
    });

    const documentId = createResponse.json().document.id as string;

    const response = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/stream`,
      headers: ownerHeaders,
      payload: {
        action: "summarize",
        prompt: "Keep it short.",
        context: {
          scope: "selection",
          selectedText: "This paragraph needs a shorter summary for the release note.",
          surroundingText: null
        },
        maskPersonalData: false
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");

    const events = parseSseEvents(response.body);

    expect(events[0]).toMatchObject({
      type: "started",
      status: "running"
    });
    expect(events.some((event) => event.type === "delta")).toBe(true);
    expect(events.at(-1)).toMatchObject({
      type: "completed",
      status: "succeeded",
      proposal: {
        action: "summarize",
        documentId,
        requestId: expect.any(String)
      }
    });

    await app.close();
  });

  it("rejects viewers who attempt to invoke AI", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      userId: "jwt:user_owner"
    });
    const viewerHeaders = createSessionHeaders(app, {
      email: "viewer@example.com",
      userId: "jwt:user_viewer"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Permissions doc"
      }
    });

    const documentId = createResponse.json().document.id as string;
    await app.documentsService.setMembership(documentId, "jwt:user_viewer", "viewer");

    const response = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/stream`,
      headers: viewerHeaders,
      payload: {
        action: "rewrite",
        prompt: null,
        context: {
          scope: "selection",
          selectedText: "Rewrite this sentence.",
          surroundingText: null
        },
        maskPersonalData: false
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: "DOCUMENT_FORBIDDEN",
        message: "You do not have permission to use AI for this document.",
        statusCode: 403
      }
    });

    await app.close();
  });

  it("falls back to non-streamed generation when provider streaming fails", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      userId: "jwt:user_owner"
    });

    const aiService = app.aiService as any;

    aiService.provider = {
      async generate(input: { sourceText: string }) {
        return {
          proposedText: `[FALLBACK] ${input.sourceText}`,
          summary: "Fallback generation succeeded."
        };
      },
      async *streamText() {
        throw new Error("Streaming not supported for this model.");
      }
    };

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "AI fallback doc"
      }
    });

    const documentId = createResponse.json().document.id as string;

    const response = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/ai/stream`,
      headers: ownerHeaders,
      payload: {
        action: "rewrite",
        prompt: null,
        context: {
          scope: "selection",
          selectedText: "hello world",
          surroundingText: null
        },
        maskPersonalData: false
      }
    });

    expect(response.statusCode).toBe(200);
    const events = parseSseEvents(response.body);

    expect(events[0]).toMatchObject({
      type: "started",
      status: "running"
    });
    expect(events.at(-1)).toMatchObject({
      type: "completed",
      status: "succeeded",
      proposal: {
        action: "rewrite",
        documentId,
        proposedText: "[FALLBACK] hello world",
        summary: "Fallback generation succeeded."
      }
    });
    expect(events.some((event) => event.type === "error")).toBe(false);

    await app.close();
  });
});
