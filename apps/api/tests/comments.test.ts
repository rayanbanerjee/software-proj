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

describe("comments module", () => {
  it("lists and creates comments for a collaborator with comment access", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      name: "Owner Demo",
      subject: "user_owner"
    });

    const createDocumentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Commentable doc"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;

    const createCommentResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/comments`,
      headers: ownerHeaders,
      payload: {
        body: "First review note."
      }
    });

    expect(createCommentResponse.statusCode).toBe(201);
    expect(createCommentResponse.json()).toMatchObject({
      comment: {
        documentId,
        authorUserId: "google:user_owner",
        authorName: "Owner Demo",
        body: "First review note."
      }
    });

    const listResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/comments`,
      headers: ownerHeaders
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toMatchObject({
      comments: [
        {
          documentId,
          body: "First review note."
        }
      ]
    });

    await app.close();
  });

  it("rejects comment creation for viewers", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });
    const viewerHeaders = createSessionHeaders(app, {
      email: "viewer@example.com",
      subject: "user_viewer"
    });

    const createDocumentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Viewer doc"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;

    app.documentsService.setMembership(documentId, "google:user_viewer", "viewer");

    const response = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/comments`,
      headers: viewerHeaders,
      payload: {
        body: "I should not be allowed to comment."
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: "COMMENTS_FORBIDDEN",
        message: "You do not have permission to comment on this document.",
        statusCode: 403
      }
    });

    await app.close();
  });

  it("persists comments across app restarts when the data dir is reused", async () => {
    const dataDir = applyApiTestEnv().API_DATA_DIR as string;
    process.env = applyApiTestEnv({
      API_DATA_DIR: dataDir
    });

    const firstApp = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(firstApp, {
      email: "owner@example.com",
      name: "Owner Demo",
      subject: "user_owner"
    });
    const createDocumentResponse = await firstApp.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Persistent comments"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;

    await firstApp.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/comments`,
      headers: ownerHeaders,
      payload: {
        body: "Persist me."
      }
    });

    await firstApp.close();

    process.env = applyApiTestEnv({
      API_DATA_DIR: dataDir
    });

    const secondApp = await createApiTestApp();
    const response = await secondApp.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/comments`,
      headers: createSessionHeaders(secondApp, {
        email: "owner@example.com",
        name: "Owner Demo",
        subject: "user_owner"
      })
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      comments: [
        {
          documentId,
          body: "Persist me."
        }
      ]
    });

    await secondApp.close();
  });
});
