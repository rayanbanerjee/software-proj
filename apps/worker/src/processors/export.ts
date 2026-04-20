import type { Job } from "bullmq";

import { renderDocx } from "../renderers/docx";
import { renderPdf } from "../renderers/pdf";
import { renderPlainText } from "../renderers/plain-text";
import type {
  ExportJobPayload,
  ExportJobResult,
  StatusWriter
} from "./types";

const noopStatusWriter: StatusWriter<ExportJobPayload, ExportJobResult> = async () => {
  return;
};

export async function processExportJob(
  job: Job<ExportJobPayload>,
  writeStatus: StatusWriter<ExportJobPayload, ExportJobResult> = noopStatusWriter
): Promise<ExportJobResult> {
  const content = job.data.content ?? "";
  const title = job.data.title;

  if (job.data.format === "txt") {
    renderPlainText({
      title,
      content
    });
  }

  if (job.data.format === "pdf") {
    renderPdf({
      title,
      content
    });
  }

  if (job.data.format === "docx") {
    renderDocx({
      title,
      content
    });
  }

  const extension = job.data.format;
  const result: ExportJobResult = {
    exportId: `export-${job.data.requestId}`,
    status: "completed",
    artifactKey: `exports/${job.data.documentId}.${extension}`,
    processedAt: new Date().toISOString()
  };

  await writeStatus({
    jobId: job.id ?? `export-${job.data.requestId}`,
    queueName: job.queueName,
    status: "completed",
    requestId: job.data.requestId,
    payload: job.data,
    result
  });

  return result;
}
