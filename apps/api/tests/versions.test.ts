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

describe("versions module", () => {
  it("lists a baseline revision for an authorized document", async () => {
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
        title: "Versioned doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions`,
      headers: ownerHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      revisions: [
        {
          documentId,
          authorUserId: "google:user_owner",
          label: "Initial snapshot: Versioned doc"
        }
      ]
    });

    await app.close();
  });

  it("returns revision detail for an authorized request", async () => {
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
        title: "Detail doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const listResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions`,
      headers: ownerHeaders
    });
    const revisionId = listResponse.json().revisions[0].revisionId as string;

    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions/${revisionId}`,
      headers: ownerHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      revision: {
        revisionId,
        documentId,
        contentType: "application/vnd.collab.document+json"
      }
    });

    await app.close();
  });

  it("creates a new head revision on rollback for owners", async () => {
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
        title: "Rollback doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const listResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions`,
      headers: ownerHeaders
    });
    const baselineRevisionId = listResponse.json().revisions[0].revisionId as string;

    const rollbackResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/versions/rollback`,
      headers: ownerHeaders,
      payload: {
        revisionId: baselineRevisionId
      }
    });

    expect(rollbackResponse.statusCode).toBe(200);
    expect(rollbackResponse.json()).toMatchObject({
      revisionId: expect.any(String),
      rolledBackAt: expect.any(String)
    });

    const updatedListResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions`,
      headers: ownerHeaders
    });

    expect(updatedListResponse.json().revisions).toHaveLength(2);
    expect(updatedListResponse.json().revisions[0]).toMatchObject({
      authorUserId: "google:user_owner",
      documentId,
      label: "Rollback to Initial snapshot: Rollback doc"
    });

    await app.close();
  });

  it("returns a validated diff stub for a revision", async () => {
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
        title: "Diff doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const listResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions`,
      headers: ownerHeaders
    });
    const revisionId = listResponse.json().revisions[0].revisionId as string;

    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions/${revisionId}/diff`,
      headers: ownerHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      documentId,
      revisionId,
      compareToRevisionId: null,
      summary: "Stub diff for Initial snapshot: Diff doc against the current head.",
      changes: [
        {
          field: "content",
          kind: "stub",
          description: "Detailed diff generation is not wired yet."
        }
      ]
    });

    await app.close();
  });

  it("rejects rollback for users without rollback permission", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });
    const editorHeaders = createSessionHeaders(app, {
      email: "editor@example.com",
      subject: "user_editor"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Shared rollback doc"
      }
    });
    const documentId = createResponse.json().document.id as string;
    app.documentsService.setMembership(documentId, "google:user_editor", "editor");

    const listResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions`,
      headers: ownerHeaders
    });
    const revisionId = listResponse.json().revisions[0].revisionId as string;

    const response = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/versions/rollback`,
      headers: editorHeaders,
      payload: {
        revisionId
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: "REVISION_FORBIDDEN",
        message: "You do not have permission to roll back this document.",
        statusCode: 403
      }
    });

    await app.close();
  });
});
