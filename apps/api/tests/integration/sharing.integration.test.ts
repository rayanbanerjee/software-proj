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

describe("sharing integration flow", () => {
  it("covers view, edit, and share boundaries through the reusable API harness", async () => {
    const app = await createApiTestApp();
    const ownerSessionHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      userId: "owner_user"
    });
    const editorSessionHeaders = createSessionHeaders(app, {
      email: "editor@example.com",
      userId: "editor_user"
    });
    const viewerSessionHeaders = createSessionHeaders(app, {
      email: "viewer@example.com",
      userId: "viewer_user"
    });

    const documentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerSessionHeaders,
      payload: {
        title: "Sharing flow"
      }
    });

    const documentId = documentResponse.json().document.id as string;

    const editorInvite = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/invitations`,
      headers: ownerSessionHeaders,
      payload: {
        invitee: "editor@example.com",
        role: "editor"
      }
    });

    const viewerInvite = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/invitations`,
      headers: ownerSessionHeaders,
      payload: {
        invitee: "viewer@example.com",
        role: "viewer"
      }
    });

    await app.inject({
      method: "POST",
      url: "/v1/invitations/accept",
      headers: editorSessionHeaders,
      payload: {
        token: editorInvite.json().acceptToken
      }
    });

    await app.inject({
      method: "POST",
      url: "/v1/invitations/accept",
      headers: viewerSessionHeaders,
      payload: {
        token: viewerInvite.json().acceptToken
      }
    });

    const editorRename = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}`,
      headers: editorSessionHeaders,
      payload: {
        title: "Editor updated title"
      }
    });

    const viewerRename = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}`,
      headers: viewerSessionHeaders,
      payload: {
        title: "Viewer should fail"
      }
    });

    const editorInviteAttempt = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/invitations`,
      headers: editorSessionHeaders,
      payload: {
        invitee: "third@example.com",
        role: "viewer"
      }
    });

    const viewerMetadata = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: viewerSessionHeaders
    });

    expect(editorRename.statusCode).toBe(200);
    expect(viewerRename.statusCode).toBe(403);
    expect(editorInviteAttempt.statusCode).toBe(403);
    expect(viewerMetadata.statusCode).toBe(200);

    await app.close();
  });
});
