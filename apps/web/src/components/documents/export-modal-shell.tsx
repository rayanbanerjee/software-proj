"use client";

import { useEffect, useState } from "react";

import type { ExportPanelState } from "../../lib/export-panel-state";

interface ExportModalShellProps {
  documentId: string;
  documentTitle: string;
  panelState: ExportPanelState;
}

type ExportJobState = {
  completedAt: string | null;
  downloadUrl: string | null;
  exportJobId: string;
  format: string;
  status: string;
};

function buildExportFilename(title: string, format: string) {
  const safeTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${safeTitle || "document"}.${format}`;
}

function formatExportStatus(format: string, status: string) {
  if (status === "succeeded") {
    return `${format.toUpperCase()} export ready.`;
  }

  if (status === "failed") {
    return `${format.toUpperCase()} export failed.`;
  }

  return `${format.toUpperCase()} export ${status}.`;
}

export function ExportModalShell({ documentId, documentTitle, panelState }: ExportModalShellProps) {
  const [job, setJob] = useState<ExportJobState | null>(panelState.job);
  const [summary, setSummary] = useState(panelState.summary);
  const [isRequestingFormat, setIsRequestingFormat] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setJob(panelState.job);
    setSummary(panelState.summary);
  }, [panelState.job, panelState.summary]);

  useEffect(() => {
    if (!job || (job.status !== "queued" && job.status !== "running")) {
      return;
    }

    let isActive = true;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
    const activeJob = job;

    async function pollExport() {
      try {
        const statusResponse = await fetch(
          `${apiBaseUrl}/v1/documents/${documentId}/exports/${activeJob.exportJobId}`,
          {
            credentials: "include"
          }
        );

        if (!statusResponse.ok) {
          throw new Error("Failed to refresh export status.");
        }

        const statusPayload = await statusResponse.json() as {
          job: {
            completedAt: string | null;
            exportJobId: string;
            format: string;
            status: string;
          };
        };
        let downloadUrl = activeJob.downloadUrl;

        if (statusPayload.job.status === "succeeded") {
          const downloadResponse = await fetch(
            `${apiBaseUrl}/v1/documents/${documentId}/exports/${activeJob.exportJobId}/download`,
            {
              credentials: "include"
            }
          );

          if (downloadResponse.ok) {
            const downloadPayload = await downloadResponse.json() as { downloadUrl?: string };
            downloadUrl = downloadPayload.downloadUrl ?? null;
          }
        }

        if (!isActive) {
          return;
        }

        setJob({
          completedAt: statusPayload.job.completedAt,
          downloadUrl,
          exportJobId: statusPayload.job.exportJobId,
          format: statusPayload.job.format,
          status: statusPayload.job.status
        });
        setSummary(formatExportStatus(statusPayload.job.format, statusPayload.job.status));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Failed to refresh export status.");
      }
    }

    void pollExport();
    const timer = window.setInterval(() => {
      void pollExport();
    }, 1000);

    return () => {
      isActive = false;
      window.clearInterval(timer);
    };
  }, [documentId, job]);

  async function requestExport(format: string) {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

    setErrorMessage(null);
    setIsRequestingFormat(format);

    try {
      const response = await fetch(`${apiBaseUrl}/v1/documents/${documentId}/exports`, {
        body: JSON.stringify({
          format
        }),
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        method: "POST"
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.error?.message ?? "Failed to queue export.");
      }

      const payload = await response.json() as {
        exportJobId: string;
        status: string;
      };

      setJob({
        completedAt: null,
        downloadUrl: null,
        exportJobId: payload.exportJobId,
        format,
        status: payload.status
      });
      setSummary(formatExportStatus(format, payload.status));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to queue export.");
    } finally {
      setIsRequestingFormat(null);
    }
  }

  async function downloadExport(activeJob: ExportJobState) {
    if (!activeJob.downloadUrl) {
      return;
    }

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

    setErrorMessage(null);
    setIsDownloading(true);

    try {
      const response = await fetch(`${apiBaseUrl}${activeJob.downloadUrl}`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to download export.");
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = buildExportFilename(documentTitle, activeJob.format);
      window.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
      }, 0);
      setSummary(`Downloaded ${buildExportFilename(documentTitle, activeJob.format)}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to download export.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="overlay-shell">
      <div className="overlay-shell-header">
        <span className="section-chip">Export</span>
        <h3>Export file</h3>
      </div>
      <p>{summary}</p>
      {job ? (
        <div className="overlay-caption">
          <strong>Latest export:</strong> {job.format.toUpperCase()} · {job.status}
          {job.downloadUrl ? (
            <>
              {" · "}
              <button
                className="overlay-inline-action"
                disabled={isDownloading}
                onClick={() => void downloadExport(job)}
                type="button"
              >
                {isDownloading ? "Downloading..." : "Download"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="overlay-caption">
          <strong>Export error:</strong> {errorMessage}
        </div>
      ) : null}
      <div className="overlay-list">
        {panelState.entries.map((item) => (
          <article className="overlay-option-card" key={item.format}>
            <strong>{item.label}</strong>
            <p>{item.summary}</p>
            <button
              disabled={isRequestingFormat !== null}
              onClick={() => void requestExport(item.format)}
              type="button"
            >
              {isRequestingFormat === item.format ? "Queueing..." : "Export"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
