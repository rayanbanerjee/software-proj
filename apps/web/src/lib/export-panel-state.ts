import type { GetExportJobStatusResponse } from "@repo/shared-types";

import { exportOptions } from "./app-shell";

export type ExportPanelState =
  | {
      entries: Array<{
        format: string;
        label: string;
        summary: string;
      }>;
      job: null;
      mode: "idle";
      summary: string;
    }
  | {
      entries: Array<{
        format: string;
        label: string;
        summary: string;
      }>;
      job: {
        completedAt: string | null;
        downloadUrl: string | null;
        exportJobId: string;
        format: string;
        status: string;
      };
      mode: "job";
      summary: string;
    };

function getFallbackEntries() {
  return exportOptions.map((item) => ({
    format: item.format,
    label: item.label,
    summary: item.summary
  }));
}

export async function getExportPanelState(
  documentId: string,
  options: {
    apiBaseUrl?: string;
    cookieHeader?: string | null;
    exportJobId?: string | null;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<ExportPanelState> {
  const exportJobId = options.exportJobId?.trim();

  if (!exportJobId) {
    return {
      entries: getFallbackEntries(),
      job: null,
      mode: "idle",
      summary: "Choose an export target to queue or review an existing export job."
    };
  }

  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    return {
      entries: getFallbackEntries(),
      job: null,
      mode: "idle",
      summary: "Choose an export target to queue or review an existing export job."
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const statusResponse = await fetchImpl(
      `${apiBaseUrl}/v1/documents/${documentId}/exports/${exportJobId}`,
      {
        cache: "no-store",
        headers: options.cookieHeader
          ? {
              cookie: options.cookieHeader
            }
          : undefined
      }
    );

    if (!statusResponse.ok) {
      throw new Error("Export status fetch failed.");
    }

    const payload = (await statusResponse.json()) as GetExportJobStatusResponse;
    let downloadUrl: string | null = null;

    if (payload.job.status === "succeeded") {
      const downloadResponse = await fetchImpl(
        `${apiBaseUrl}/v1/documents/${documentId}/exports/${exportJobId}/download`,
        {
          cache: "no-store",
          headers: options.cookieHeader
            ? {
                cookie: options.cookieHeader
              }
            : undefined
        }
      );

      if (downloadResponse.ok) {
        const downloadPayload = (await downloadResponse.json()) as { downloadUrl?: string };
        downloadUrl = downloadPayload.downloadUrl ?? null;
      }
    }

    return {
      entries: getFallbackEntries(),
      job: {
        completedAt: payload.job.completedAt,
        downloadUrl,
        exportJobId: payload.job.exportJobId,
        format: payload.job.format,
        status: payload.job.status
      },
      mode: "job",
      summary: `Latest export job ${payload.job.exportJobId} is ${payload.job.status}.`
    };
  } catch {
    return {
      entries: getFallbackEntries(),
      job: null,
      mode: "idle",
      summary: "Choose an export target to queue or review an existing export job."
    };
  }
}
