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

export async function processRevisionSummaryJob(
  job: Job<RevisionSummaryJobPayload>,
  writeStatus: StatusWriter<RevisionSummaryJobPayload, RevisionSummaryJobResult> = noopStatusWriter
): Promise<RevisionSummaryJobResult> {
  const result: RevisionSummaryJobResult = {
    summaryId: `summary-${job.data.requestId}`,
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