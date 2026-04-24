import { describe, expect, it, vi } from "vitest";

import {
  getWorkspaceDocumentRecord,
  getWorkspaceDocumentsState,
  updateDocumentMemberRole
} from "../src/lib/documents";

describe("workspace document auth state", () => {
  it("marks the document list as auth-required on a 401 response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401
    });

    await expect(
      getWorkspaceDocumentsState({
        fetchImpl: fetchImpl as typeof fetch
      })
    ).resolves.toEqual({
      authRequired: true,
      documents: []
    });
  });

  it("does not treat an empty successful document list as an auth failure", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documents: []
      })
    });

    await expect(
      getWorkspaceDocumentsState({
        fetchImpl: fetchImpl as typeof fetch
      })
    ).resolves.toEqual({
      authRequired: false,
      documents: []
    });
  });

  it("marks document fetches as auth-required on a 401 response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401
    });

    const result = await getWorkspaceDocumentRecord("doc-1", {
      fetchImpl: fetchImpl as typeof fetch
    });

    expect(result.authRequired).toBe(true);
    expect(result.isMissing).toBe(true);
    expect(result.document.id).toBe("doc-1");
  });

  it("updates a document member role through the sharing API", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        documentId: "doc-1",
        membership: {
          displayName: "Reader",
          role: "commenter",
          userId: "user-1"
        },
        updatedAt: "2026-04-24T10:00:00.000Z"
      })
    });

    const response = await updateDocumentMemberRole("doc-1", "user-1", "commenter", {
      apiBaseUrl: "http://api.test",
      fetchImpl: fetchImpl as typeof fetch
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/v1/documents/doc-1/members/user-1",
      expect.objectContaining({
        body: JSON.stringify({
          role: "commenter"
        }),
        credentials: "include",
        method: "PATCH"
      })
    );
    expect(response.membership.role).toBe("commenter");
  });
});
