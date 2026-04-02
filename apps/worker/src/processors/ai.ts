import type { Job } from "bullmq";

import type {
  AiJobPayload,
  AiJobResult,
  StatusWriter
} from "./types";

const noopStatusWriter: StatusWriter<AiJobPayload, AiJobResult> = async () => {
  return;
};

export async function processAiJob(
  job: Job<AiJobPayload>,
  writeStatus: StatusWriter<AiJobPayload, AiJobResult> = noopStatusWriter
): Promise<AiJobResult> {
  const result: AiJobResult = {
    proposalId: `proposal-${job.data.requestId}`,
    status: "completed",
    processedAt: new Date().toISOString()
  };

  await writeStatus({
    jobId: job.id ?? `ai-${job.data.requestId}`,
    queueName: job.queueName,
    status: "completed",
    requestId: job.data.requestId,
    payload: job.data,
    result
  });

  return result;
}