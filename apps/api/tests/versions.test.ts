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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 202
    } as Response);
    vi.stubGlobal("fetch", fetchMock);
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
    await app.inject({
      method: "PUT",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders,
      payload: {
        text: "Current draft line"
      }
    });

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
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4001/internal/events/document-rollback",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "document.rollback",
          documentId,
          revisionId: rollbackResponse.json().revisionId,
          restoredFromRevisionId: baselineRevisionId,
          rolledBackAt: rollbackResponse.json().rolledBackAt,
          triggeredByUserId: "google:user_owner"
        })
      })
    );
    const contentResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders
    });
    expect(contentResponse.json()).toEqual({
      content: {
        documentId,
        richText: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: []
            }
          ]
        },
        text: "",
        updatedAt: rollbackResponse.json().rolledBackAt
      }
    });

    await app.close();
  });

  it("returns a real diff for a revision against the current head", async () => {
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
    await app.inject({
      method: "PUT",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders,
      payload: {
        text: "First line\nSecond line"
      }
    });

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
      summary: "2 lines added between Initial snapshot: Diff doc and the current head.",
      changes: [
        {
          field: "content",
          kind: "added",
          description: "Line 1 added: First line"
        },
        {
          field: "content",
          kind: "added",
          description: "Line 2 added: Second line"
        }
      ]
    });

    await app.close();
  });

  it("can diff one stored revision against another stored revision", async () => {
    const app = await createApiTestApp();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 202
    } as Response);
    vi.stubGlobal("fetch", fetchMock);
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Compared diff doc"
      }
    });
    const documentId = createResponse.json().document.id as string;

    const listResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions`,
      headers: ownerHeaders
    });
    const baselineRevisionId = listResponse.json().revisions[0].revisionId as string;
    await app.inject({
      method: "PUT",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders,
      payload: {
        text: "Changed line"
      }
    });
    const rollbackResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/versions/rollback`,
      headers: ownerHeaders,
      payload: {
        revisionId: baselineRevisionId
      }
    });

    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/versions/${baselineRevisionId}/diff?compareToRevisionId=${rollbackResponse.json().revisionId}`,
      headers: ownerHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      documentId,
      revisionId: baselineRevisionId,
      compareToRevisionId: rollbackResponse.json().revisionId,
      summary: "No content changes between Initial snapshot: Compared diff doc and Rollback to Initial snapshot: Compared diff doc.",
      changes: []
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
