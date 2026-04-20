import { describe, expect, it, vi } from "vitest";

import { getExportPanelState } from "../src/lib/export-panel-state";

describe("export panel state", () => {
  it("returns an idle state when no export job is selected", async () => {
    await expect(getExportPanelState("doc-1")).resolves.toMatchObject({
      entries: expect.arrayContaining([
        expect.objectContaining({
          format: "txt",
          label: "Plain text"
        })
      ]),
      mode: "idle",
      job: null
    });
  });

  it("loads job status and download link when an export job is provided", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          job: {
            exportJobId: "exp_1",
            documentId: "doc-1",
            format: "pdf",
            status: "succeeded",
            requestedAt: "2026-04-02T18:00:00.000Z",
            completedAt: "2026-04-02T18:01:00.000Z",
            downloadUrl: null
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          downloadUrl: "/documents/doc-1/exports/exp_1/artifact?token=abc123"
        })
      } as Response);

    await expect(
      getExportPanelState("doc-1", {
        apiBaseUrl: "http://localhost:4000",
        cookieHeader: "collab_session=test-token",
        exportJobId: "exp_1",
        fetchImpl
      })
    ).resolves.toMatchObject({
      mode: "job",
      job: {
        exportJobId: "exp_1",
        format: "pdf",
        status: "succeeded",
        downloadUrl: "/documents/doc-1/exports/exp_1/artifact?token=abc123"
      }
    });
  });

  it("falls back to idle state when the export API request fails", async () => {
    await expect(
      getExportPanelState("doc-1", {
        apiBaseUrl: "http://localhost:4000",
        exportJobId: "exp_missing",
        fetchImpl: vi.fn<typeof fetch>().mockRejectedValue(new Error("offline"))
      })
    ).resolves.toMatchObject({
      mode: "idle",
      job: null
    });
  });
});
