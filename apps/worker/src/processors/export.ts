import type { Job } from "bullmq";

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