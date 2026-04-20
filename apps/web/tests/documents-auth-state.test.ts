import { describe, expect, it, vi } from "vitest";

import {
  getWorkspaceDocumentRecord,
  getWorkspaceDocumentsState
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
});
