import { describe, expect, it, vi } from "vitest";

import {
  getFallbackVersionHistoryEntries,
  getVersionHistoryEntries,
  mapRevisionSummaryToHistoryEntry
} from "../src/lib/version-history";

describe("version history data hook", () => {
  it("maps a revision summary into a UI-friendly history entry", () => {
    expect(
      mapRevisionSummaryToHistoryEntry(
        {
          revisionId: "rev_12345678abcdef",
          documentId: "doc-1",
          label: "Initial snapshot: Kickoff",
          authorUserId: "google:user_owner",
          createdAt: "2026-04-02T10:00:00.000Z"
        },
        new Date("2026-04-02T10:05:00.000Z")
      )
    ).toEqual({
      key: "rev_12345678abcdef",
      label: "Initial snapshot: Kickoff",
      summary: "Revision rev_12345 captured by google:user_owner.",
      when: "5 minutes ago"
    });
  });

  it("returns fetched revision history when the API responds successfully", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        revisions: [
          {
            revisionId: "rev_abcdefgh123456",
            documentId: "doc-1",
            label: "Rollback to Initial snapshot: Kickoff",
            authorUserId: "google:user_owner",
            createdAt: "2026-04-02T10:00:00.000Z"
          }
        ]
      })
    } as Response);

    await expect(
      getVersionHistoryEntries("doc-1", {
        apiBaseUrl: "http://localhost:4000",
        cookieHeader: "collab_session=test-token",
        fetchImpl,
        now: new Date("2026-04-02T12:00:00.000Z")
      })
    ).resolves.toEqual([
      {
        key: "rev_abcdefgh123456",
        label: "Rollback to Initial snapshot: Kickoff",
        summary: "Revision rev_abcde captured by google:user_owner.",
        when: "2 hours ago"
      }
    ]);

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:4000/v1/documents/doc-1/versions",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          cookie: "collab_session=test-token"
        }
      })
    );
  });

  it("falls back to static shell history when the API request fails", async () => {
    const fallback = getFallbackVersionHistoryEntries();

    await expect(
      getVersionHistoryEntries("doc-1", {
        apiBaseUrl: "http://localhost:4000",
        fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"))
      })
    ).resolves.toEqual(fallback);
  });
});
