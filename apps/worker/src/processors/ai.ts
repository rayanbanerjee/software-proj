import type { Job } from "bullmq";

import type {
  AiJobPayload,
  AiJobResult,
  StatusWriter
} from "./types";

const noopStatusWriter: StatusWriter<AiJobPayload, AiJobResult> = async () => {
  return;
};

function generateAiProposalText(payload: AiJobPayload) {
  const sourceText = payload.sourceText?.trim() || `Document ${payload.documentId}`;

  switch (payload.operation) {
    case "rewrite":
      return `[REWRITE] ${sourceText}${payload.prompt?.trim() ? ` Prompt: ${payload.prompt.trim()}` : ""}`.trim();
    case "summarize":
      return `[SUMMARY] ${sourceText}`.trim();
    case "translate":
      return `[TRANSLATED TO ${(payload.prompt?.trim() || "English").toUpperCase()}] ${sourceText}`.trim();
    case "restructure":
      return `[RESTRUCTURED] ${sourceText}`.trim();
  }
}

function summarizeAiJob(payload: AiJobPayload) {
  switch (payload.operation) {
    case "rewrite":
      return `Generated a rewrite proposal for ${payload.documentId}.`;
    case "summarize":
      return `Generated a summary proposal for ${payload.documentId}.`;
    case "translate":
      return `Generated a translation proposal for ${payload.documentId}${payload.prompt?.trim() ? ` to ${payload.prompt.trim()}` : ""}.`;
    case "restructure":
      return `Generated a restructure proposal for ${payload.documentId}.`;
  }
}

export async function processAiJob(
  job: Job<AiJobPayload>,
  writeStatus: StatusWriter<AiJobPayload, AiJobResult> = noopStatusWriter
): Promise<AiJobResult> {
  const proposedText = generateAiProposalText(job.data);
  const result: AiJobResult = {
    proposalId: `proposal-${job.data.requestId}`,
    proposedText,
    summary: summarizeAiJob(job.data),
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
