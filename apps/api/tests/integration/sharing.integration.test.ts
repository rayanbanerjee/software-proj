import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyApiTestEnv, createApiTestApp } from "./harness.js";

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

    const documentResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: {
        "x-user-id": "owner_user"
      },
      payload: {
        title: "Sharing flow"
      }
    });

    const documentId = documentResponse.json().document.id as string;

    const editorInvite = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/invitations`,
      headers: {
        "x-user-id": "owner_user"
      },
      payload: {
        email: "editor@example.com",
        role: "editor"
      }
    });

    const viewerInvite = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/invitations`,
      headers: {
        "x-user-id": "owner_user"
      },
      payload: {
        email: "viewer@example.com",
        role: "viewer"
      }
    });

    await app.inject({
      method: "POST",
      url: "/v1/invitations/accept",
      headers: {
        "x-user-id": "editor_user",
        "x-user-email": "editor@example.com"
      },
      payload: {
        token: editorInvite.json().acceptToken
      }
    });

    await app.inject({
      method: "POST",
      url: "/v1/invitations/accept",
      headers: {
        "x-user-id": "viewer_user",
        "x-user-email": "viewer@example.com"
      },
      payload: {
        token: viewerInvite.json().acceptToken
      }
    });

    const editorRename = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}`,
      headers: {
        "x-user-id": "editor_user"
      },
      payload: {
        title: "Editor updated title"
      }
    });

    const viewerRename = await app.inject({
      method: "PATCH",
      url: `/v1/documents/${documentId}`,
      headers: {
        "x-user-id": "viewer_user"
      },
      payload: {
        title: "Viewer should fail"
      }
    });

    const editorInviteAttempt = await app.inject({
      method: "POST",
      url: `/v1/documents/${documentId}/invitations`,
      headers: {
        "x-user-id": "editor_user"
      },
      payload: {
        email: "third@example.com",
        role: "viewer"
      }
    });

    const viewerMetadata = await app.inject({
      method: "GET",
      url: `/v1/documents/${documentId}`,
      headers: {
        "x-user-id": "viewer_user"
      }
    });

    expect(editorRename.statusCode).toBe(200);
    expect(viewerRename.statusCode).toBe(403);
    expect(editorInviteAttempt.statusCode).toBe(403);
    expect(viewerMetadata.statusCode).toBe(200);

    await app.close();
  });
});
