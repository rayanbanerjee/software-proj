import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

function applyTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.PORT = "4000";
  process.env.DATABASE_URL =
    "postgres://postgres:postgres@localhost:5432/collab_editor";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.GOOGLE_CLIENT_ID = "test-google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.OBJECT_STORAGE_ENDPOINT = "http://localhost:9000";
  process.env.OBJECT_STORAGE_BUCKET = "collab-editor";
}

describe("AI request integration", () => {
  let app: Awaited<ReturnType<typeof createApp>>["app"];

  beforeAll(async () => {
    applyTestEnv();
    const created = await createApp({ logger: false });
    app = created.app;
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("creates an AI request and returns pending status", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/documents/doc1/ai-requests",
      payload: {
        operation: "summarize",
        selection: {
          start: 10,
          end: 120
        },
        parameters: {
          tone: "concise"
        }
      }
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body.requestId).toMatch(/^ai_/);
    expect(body.status).toBe("pending");
  });

  it("returns AI request status for an existing request", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/documents/doc2/ai-requests",
      payload: {
        operation: "rewrite",
        selection: {
          start: 0,
          end: 42
        },
        parameters: {
          style: "formal"
        }
      }
    });

    const created = createResponse.json();

    const statusResponse = await app.inject({
      method: "GET",
      url: `/documents/doc2/ai-requests/${created.requestId}`
    });

    expect(statusResponse.statusCode).toBe(200);

    const body = statusResponse.json();

    expect(body.requestId).toBe(created.requestId);
    expect(body.documentId).toBe("doc2");
    expect(body.operation).toBe("rewrite");
    expect(body.selection).toEqual({
      start: 0,
      end: 42
    });
    expect(body.parameters).toEqual({
      style: "formal"
    });
    expect(body.status).toBe("pending");
  });

  it("rejects an invalid AI request body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/documents/doc3/ai-requests",
      payload: {
        operation: "not-a-real-operation",
        selection: {
          start: 0,
          end: 10
        }
      }
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();

    expect(body.error).toBe("invalid_request");
  });

  it("returns 404 for a missing AI request", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/documents/doc4/ai-requests/ai_missing"
    });

    expect(response.statusCode).toBe(404);

    const body = response.json();

    expect(body.error).toBe("ai_request_not_found");
  });
});