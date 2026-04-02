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

describe("sharing module", () => {
  it("creates and accepts an invitation, then allows the invited user to view the document", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 202
    } as Response);
    vi.stubGlobal("fetch", fetchMock);
    const app = await createApiTestApp();
    const ownerSessionHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "owner_user"
    });
    const viewerSessionHeaders = createSessionHeaders(app, {
      email: "viewer@example.com",
      subject: "viewer_user"
    });

    const createDocumentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerSessionHeaders,
      payload: {
        title: "Shared spec"
      }
    });

    const documentId = createDocumentResponse.json().document.id as string;

    const inviteResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/invitations`,
      headers: {
        ...ownerSessionHeaders,
        "x-user-id": "google:owner_user"
      },
      payload: {
        email: "viewer@example.com",
        role: "viewer"
      }
    });

    expect(inviteResponse.statusCode).toBe(201);
    expect(inviteResponse.json()).toMatchObject({
      invitation: {
        documentId,
        inviteeEmail: "viewer@example.com",
        role: "viewer"
      }
    });

    const acceptToken = inviteResponse.json().acceptToken as string;

    const acceptResponse = await app.inject({
      method: "POST",
      url: "/v1/invitations/accept",
      headers: {
        ...viewerSessionHeaders,
        "x-user-id": "google:viewer_user",
        "x-user-email": "viewer@example.com"
      },
      payload: {
        token: acceptToken
      }
    });

    expect(acceptResponse.statusCode).toBe(200);
    expect(acceptResponse.json()).toMatchObject({
      membership: {
        userId: "google:viewer_user",
        role: "viewer"
      }
    });

    const metadataResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: viewerSessionHeaders
    });

    expect(metadataResponse.statusCode).toBe(200);
    expect(metadataResponse.json()).toMatchObject({
      document: {
        id: documentId,
        permissions: {
          role: "viewer",
          canView: true,
          canEdit: false
        }
      }
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4001/internal/events/document-permission-update",
      expect.objectContaining({
        method: "POST"
      })
    );

    await app.close();
  });

  it("enforces owner-only role updates and revocation", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 202
    } as Response);
    vi.stubGlobal("fetch", fetchMock);
    const app = await createApiTestApp();
    const ownerSessionHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      subject: "owner_user"
    });
    const editorSessionHeaders = createSessionHeaders(app, {
      email: "editor@example.com",
      subject: "editor_user"
    });

    const createDocumentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerSessionHeaders,
      payload: {
        title: "Role changes"
      }
    });

    const documentId = createDocumentResponse.json().document.id as string;

    const inviteResponse = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/invitations`,
      headers: {
        ...ownerSessionHeaders,
        "x-user-id": "google:owner_user"
      },
      payload: {
        email: "editor@example.com",
        role: "editor"
      }
    });

    const acceptToken = inviteResponse.json().acceptToken as string;

    await app.inject({
      method: "POST",
      url: "/v1/invitations/accept",
      headers: {
        ...editorSessionHeaders,
        "x-user-id": "google:editor_user",
        "x-user-email": "editor@example.com"
      },
      payload: {
        token: acceptToken
      }
    });

    const forbiddenUpdate = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}/members/google:owner_user`,
      headers: {
        ...editorSessionHeaders,
        "x-user-id": "google:editor_user"
      },
      payload: {
        role: "viewer"
      }
    });

    expect(forbiddenUpdate.statusCode).toBe(403);
    expect(forbiddenUpdate.json()).toEqual({
      error: {
        code: "SHARING_FORBIDDEN",
        message: "You do not have permission to manage sharing for this document.",
        statusCode: 403
      }
    });

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}/members/google:editor_user`,
      headers: {
        ...ownerSessionHeaders,
        "x-user-id": "google:owner_user"
      },
      payload: {
        role: "commenter"
      }
    });

    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json()).toMatchObject({
      membership: {
        userId: "google:editor_user",
        role: "commenter"
      }
    });

    const renameResponse = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}`,
      headers: editorSessionHeaders,
      payload: {
        title: "Should be blocked"
      }
    });

    expect(renameResponse.statusCode).toBe(403);

    const revokeResponse = await app.inject({
      method: "DELETE",
      url: `/v1/documents/${documentId}/members/google:editor_user`,
      headers: {
        ...ownerSessionHeaders,
        "x-user-id": "google:owner_user"
      }
    });

    expect(revokeResponse.statusCode).toBe(200);
    expect(revokeResponse.json()).toMatchObject({
      documentId,
      userId: "google:editor_user"
    });

    const metadataResponse = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: editorSessionHeaders
    });

    expect(metadataResponse.statusCode).toBe(403);
    expect(app.auditService.listEvents().map((event) => event.action)).toEqual([
      "sharing.invitation.created",
      "sharing.invitation.accepted",
      "sharing.role.updated",
      "sharing.access.revoked"
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    await app.close();
  });
});
