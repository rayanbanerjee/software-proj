import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

describe("documents integration flow", () => {
  it("covers create, list, metadata, rename, and archive in one reusable harness", async () => {
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
        title: "Integration flow"
      }
    });

    const documentId = createResponse.json().document.id as string;

    const listResponse = await app.inject({
      method: "GET",
      url: "/v1/documents",
      headers: ownerHeaders
    });

    const metadataResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders
    });

    const renameResponse = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders,
      payload: {
        title: "Integration renamed"
      }
    });

    const archiveResponse = await app.inject({
      method: "DELETE",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders
    });

    expect(createResponse.statusCode).toBe(201);
    expect(listResponse.statusCode).toBe(200);
    expect(metadataResponse.statusCode).toBe(200);
    expect(renameResponse.statusCode).toBe(200);
    expect(archiveResponse.statusCode).toBe(200);

    await app.close();
  });
});
