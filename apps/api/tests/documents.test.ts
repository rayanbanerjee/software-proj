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

describe("documents module", () => {
  it("creates a document and returns owner permissions", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: createSessionHeaders(app, {
        email: "owner@example.com",
        name: "Owner Demo",
        subject: "user_owner"
      }),
      payload: {
        title: "Project kickoff"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      document: {
        title: "Project kickoff",
        archivedAt: null,
        permissions: {
          role: "owner",
          canEdit: true,
          canShare: true
        }
      }
    });

    await app.close();
  });

  it("lists only documents the current user can view", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });
    const viewerHeaders = createSessionHeaders(app, {
      email: "viewer@example.com",
      subject: "user_viewer"
    });

    await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Visible to owner"
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/documents",
      headers: ownerHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      documents: [
        {
          title: "Visible to owner",
          role: "owner"
        }
      ]
    });

    const otherUserResponse = await app.inject({
      method: "GET",
      url: "/v1/documents",
      headers: viewerHeaders
    });

    expect(otherUserResponse.statusCode).toBe(200);
    expect(otherUserResponse.json()).toEqual({
      documents: []
    });

    await app.close();
  });

  it("returns document metadata for an authorized user", async () => {
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
        title: "Metadata document"
      }
    });

    const documentId = createResponse.json().document.id as string;

    const response = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      document: {
        id: documentId,
        title: "Metadata document",
        permissions: {
          role: "owner"
        }
      }
    });

    await app.close();
  });

  it("renames a document for a user with edit access", async () => {
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
        title: "Original title"
      }
    });

    const documentId = createResponse.json().document.id as string;

    const response = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders,
      payload: {
        title: "Renamed title"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      document: {
        id: documentId,
        title: "Renamed title"
      }
    });

    const metadataResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders
    });

    expect(metadataResponse.json()).toMatchObject({
      document: {
        title: "Renamed title"
      }
    });

    await app.close();
  });

  it("rejects metadata and rename access for other users", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });
    const otherHeaders = createSessionHeaders(app, {
      email: "other@example.com",
      subject: "user_other"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Private doc"
      }
    });

    const documentId = createResponse.json().document.id as string;

    const metadataResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: otherHeaders
    });

    expect(metadataResponse.statusCode).toBe(403);
    expect(metadataResponse.json()).toEqual({
      error: {
        code: "DOCUMENT_FORBIDDEN",
        message: "You do not have access to this document.",
        statusCode: 403
      }
    });

    const renameResponse = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}`,
      headers: otherHeaders,
      payload: {
        title: "Should fail"
      }
    });

    expect(renameResponse.statusCode).toBe(403);
    expect(renameResponse.json()).toEqual({
      error: {
        code: "DOCUMENT_FORBIDDEN",
        message: "You do not have permission to rename this document.",
        statusCode: 403
      }
    });

    await app.close();
  });

  it("archives a document for an owner and removes it from listings", async () => {
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
        title: "Archive me"
      }
    });

    const documentId = createResponse.json().document.id as string;

    const archiveResponse = await app.inject({
      method: "DELETE",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders
    });

    expect(archiveResponse.statusCode).toBe(200);
    expect(archiveResponse.json()).toMatchObject({
      documentId
    });

    const listResponse = await app.inject({
      method: "GET",
      url: "/v1/documents",
      headers: ownerHeaders
    });

    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json()).toEqual({
      documents: []
    });

    const metadataResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders
    });

    expect(metadataResponse.statusCode).toBe(200);
    expect(metadataResponse.json()).toMatchObject({
      document: {
        archivedAt: expect.any(String)
      }
    });

    await app.close();
  });

  it("rejects archive requests from non-owners", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "user_owner"
    });
    const otherHeaders = createSessionHeaders(app, {
      email: "other@example.com",
      subject: "user_other"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Owner only archive"
      }
    });

    const documentId = createResponse.json().document.id as string;

    const archiveResponse = await app.inject({
      method: "DELETE",
      url: `/v1/documents/${documentId}`,
      headers: otherHeaders
    });

    expect(archiveResponse.statusCode).toBe(403);
    expect(archiveResponse.json()).toEqual({
      error: {
        code: "DOCUMENT_FORBIDDEN",
        message: "Only owners can archive this document.",
        statusCode: 403
      }
    });

    await app.close();
  });

  it("rejects document routes without an authenticated session", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/documents"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
        statusCode: 401
      }
    });

    await app.close();
  });

  it("covers the create read update archive flow end to end", async () => {
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
        title: "CRUD flow"
      }
    });

    const documentId = createResponse.json().document.id as string;

    const readResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders
    });

    const renameResponse = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders,
      payload: {
        title: "CRUD flow renamed"
      }
    });

    const archiveResponse = await app.inject({
      method: "DELETE",
      url: `/v1/documents/${documentId}`,
      headers: ownerHeaders
    });

    expect(createResponse.statusCode).toBe(201);
    expect(readResponse.statusCode).toBe(200);
    expect(renameResponse.statusCode).toBe(200);
    expect(archiveResponse.statusCode).toBe(200);

    await app.close();
  });
});
