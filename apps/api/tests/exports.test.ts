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

async function waitForExportJob(
  app: Awaited<ReturnType<typeof createApiTestApp>>,
  documentId: string,
  exportJobId: string,
  headers: Record<string, string>
) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/exports/${exportJobId}`,
      headers
    });

    if (response.json().job.status === "succeeded") {
      return response;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }

  throw new Error("Timed out waiting for export job completion.");
}

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
      status: "queued",
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
    const settledResponse = response.json().job.status === "succeeded"
      ? response
      : await waitForExportJob(app, documentId, exportJobId, ownerHeaders);

    expect(settledResponse.statusCode).toBe(200);
    expect(settledResponse.json()).toMatchObject({
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
    await waitForExportJob(app, documentId, exportJobId, ownerHeaders);

    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/exports/${exportJobId}/download`,
      headers: ownerHeaders
    });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.downloadUrl).toMatch(
      new RegExp(`^/v1/documents/${documentId}/exports/${exportJobId}/artifact\\?expiresAt=.*&token=[a-f0-9]+$`)
    );
    expect(payload).toMatchObject({
      expiresAt: expect.any(String)
    });

    const downloadUrl = new URL(`http://localhost${payload.downloadUrl}`);
    const artifactResponse = await app.inject({
      method: "GET",
      url: `${downloadUrl.pathname}${downloadUrl.search}`,
      headers: ownerHeaders
    });

    expect(artifactResponse.statusCode).toBe(200);
    expect(artifactResponse.headers["content-type"]).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(artifactResponse.rawPayload.subarray(0, 2).toString("utf8")).toBe("PK");

    await app.close();
  });

  it("renders DOCX exports from rich text content", async () => {
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
        title: "Rich export doc"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;

    await app.inject({
      method: "POST",
      url: `/internal/documents/${documentId}/content-sync`,
      headers: {
        "x-api-token": process.env.SESSION_SECRET as string
      },
      payload: {
        richText: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: {
                level: 2
              },
              content: [
                {
                  type: "text",
                  text: "Section heading"
                }
              ]
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  marks: [
                    {
                      type: "bold"
                    }
                  ],
                  text: "Bold text"
                },
                {
                  type: "text",
                  text: " body copy"
                }
              ]
            }
          ]
        },
        text: "Section heading\nBold text body copy"
      }
    });

    const createExportResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/exports`,
      headers: ownerHeaders,
      payload: {
        format: "docx"
      }
    });
    const exportJobId = createExportResponse.json().exportJobId as string;
    await waitForExportJob(app, documentId, exportJobId, ownerHeaders);

    const downloadResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/exports/${exportJobId}/download`,
      headers: ownerHeaders
    });
    const downloadUrl = new URL(`http://localhost${downloadResponse.json().downloadUrl}`);
    const artifactResponse = await app.inject({
      method: "GET",
      url: `${downloadUrl.pathname}${downloadUrl.search}`,
      headers: ownerHeaders
    });

    expect(artifactResponse.statusCode).toBe(200);
    expect(artifactResponse.rawPayload.toString("utf8")).toContain("Section heading");
    expect(artifactResponse.rawPayload.toString("utf8")).toContain("<w:b/>");

    await app.close();
  });

  it("rejects invalid artifact tokens", async () => {
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
        title: "Protected artifact doc"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;

    const createExportResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/exports`,
      headers: ownerHeaders,
      payload: {
        format: "pdf"
      }
    });
    const exportJobId = createExportResponse.json().exportJobId as string;
    await waitForExportJob(app, documentId, exportJobId, ownerHeaders);

    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/exports/${exportJobId}/artifact?expiresAt=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString())}&token=bad-token`,
      headers: ownerHeaders
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "EXPORT_LINK_INVALID",
        message: "Export download token is invalid.",
        statusCode: 401
      }
    });

    await app.close();
  });

  it("allows export access for other users through the default shared editor role", async () => {
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

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      exportJobId: expect.any(String),
      requestedAt: expect.any(String),
      status: "queued"
    });

    await app.close();
  });

  it("persists export jobs and artifacts across app restarts when the data dir is reused", async () => {
    const dataDir = applyApiTestEnv().API_DATA_DIR as string;
    process.env = applyApiTestEnv({
      API_DATA_DIR: dataDir
    });

    const firstApp = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(firstApp, {
      email: "owner@example.com",
      subject: "user_owner"
    });
    const createDocumentResponse = await firstApp.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Persistent export doc"
      }
    });
    const documentId = createDocumentResponse.json().document.id as string;
    const createExportResponse = await firstApp.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/exports`,
      headers: ownerHeaders,
      payload: {
        format: "pdf"
      }
    });
    const exportJobId = createExportResponse.json().exportJobId as string;
    const downloadResponse = await waitForExportJob(firstApp, documentId, exportJobId, ownerHeaders);
    expect(downloadResponse.json().job.status).toBe("succeeded");

    await firstApp.close();

    process.env = applyApiTestEnv({
      API_DATA_DIR: dataDir
    });

    const secondApp = await createApiTestApp();
    const secondHeaders = createSessionHeaders(secondApp, {
      email: "owner@example.com",
      subject: "user_owner"
    });
    const statusResponse = await secondApp.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/exports/${exportJobId}`,
      headers: secondHeaders
    });

    expect(statusResponse.statusCode).toBe(200);
    expect(statusResponse.json()).toMatchObject({
      job: {
        exportJobId,
        status: "succeeded"
      }
    });

    const linkResponse = await secondApp.inject({
      method: "GET",
      url: `/v1/documents/${documentId}/exports/${exportJobId}/download`,
      headers: secondHeaders
    });
    const downloadUrl = new URL(`http://localhost${linkResponse.json().downloadUrl}`);
    const artifactResponse = await secondApp.inject({
      method: "GET",
      url: `${downloadUrl.pathname}${downloadUrl.search}`,
      headers: secondHeaders
    });

    expect(artifactResponse.statusCode).toBe(200);
    expect(artifactResponse.headers["content-type"]).toBe("application/pdf");
    expect(artifactResponse.body).toContain("%PDF-1.4");

    await secondApp.close();
  });
});
