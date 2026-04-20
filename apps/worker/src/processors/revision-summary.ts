import type { Job } from "bullmq";

import type {
  RevisionSummaryJobPayload,
  RevisionSummaryJobResult,
  StatusWriter
} from "./types";

const noopStatusWriter: StatusWriter<
  RevisionSummaryJobPayload,
  RevisionSummaryJobResult
> = async () => {
  return;
};

function buildRevisionSummary(payload: RevisionSummaryJobPayload) {
  const title = payload.title?.trim() || "Untitled revision";
  const snapshotText = payload.snapshotText?.replace(/\s+/g, " ").trim() || "";
  const excerpt = snapshotText ? ` ${snapshotText.slice(0, 80)}${snapshotText.length > 80 ? "..." : ""}` : "";

  return `${title} recorded for ${payload.documentId} by ${payload.requestedBy}.${excerpt}`.trim();
}

export async function processRevisionSummaryJob(
  job: Job<RevisionSummaryJobPayload>,
  writeStatus: StatusWriter<RevisionSummaryJobPayload, RevisionSummaryJobResult> = noopStatusWriter
): Promise<RevisionSummaryJobResult> {
  const result: RevisionSummaryJobResult = {
    summaryId: `summary-${job.data.requestId}`,
    summary: buildRevisionSummary(job.data),
    status: "completed",
    processedAt: new Date().toISOString()
  };

  await writeStatus({
    jobId: job.id ?? `revision-${job.data.requestId}`,
    queueName: job.queueName,
    status: "completed",
    requestId: job.data.requestId,
    payload: job.data,
    result
  });

  return result;
}
