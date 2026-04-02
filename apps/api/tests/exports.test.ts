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

describe("exports module", () => {
  it("creates an export job for an authorized document", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createDocumentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Exportable doc"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;

    const response = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/exports`,
      headers: ownerHeaders,
      payload: {
        format: "pdf"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      exportJobId: expect.stringMatching(/^exp_/),
      status: "succeeded",
      requestedAt: expect.any(String)
    });

    await app.close();
  });

  it("returns export job status for an authorized requester", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createDocumentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Status doc"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;

    const createExportResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/exports`,
      headers: ownerHeaders,
      payload: {
        format: "txt"
      }
    });
    const exportJobId = createExportResponse.json().exportJobId as string;

    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/exports/${exportJobId}`,
      headers: ownerHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      job: {
        exportJobId,
        documentId,
        format: "txt",
        status: "succeeded"
      }
    });

    await app.close();
  });

  it("returns a download link for a completed export", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });

    const createDocumentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Download doc"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;

    const createExportResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/exports`,
      headers: ownerHeaders,
      payload: {
        format: "docx"
      }
    });
    const exportJobId = createExportResponse.json().exportJobId as string;

    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/exports/${exportJobId}/download`,
      headers: ownerHeaders
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.downloadUrl).toMatch(
      new RegExp(`^/documents/${documentId}/exports/${exportJobId}/artifact\\?token=[a-f0-9]+$`)
    );
    expect(payload).toMatchObject({
      expiresAt: expect.any(String)
    });

    await app.close();
  });

  it("rejects export access for users without document access", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });
    const otherHeaders = createSessionHeaders(app, {
      email: "other@example.com",
      subject: "user_other"
    });

    const createDocumentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Private export doc"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;

    const response = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/exports`,
      headers: otherHeaders,
      payload: {
        format: "pdf"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      error: {
        code: "DOCUMENT_FORBIDDEN",
        message: "You do not have access to this document.",
        statusCode: 403
      }
    });

    await app.close();
  });
});
