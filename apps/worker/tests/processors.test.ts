import { describe, expect, it } from "vitest";
import type { Job } from "bullmq";

import { processAiJob } from "../src/processors/ai";
import { processExportJob } from "../src/processors/export";
import { processRevisionSummaryJob } from "../src/processors/revision-summary";
import type {
  AiJobPayload,
  ExportJobPayload,
  RevisionSummaryJobPayload
} from "../src/processors/types";

function makeJob<T>(queueName: string, data: T, id = "job-1"): Job<T> {
  return {
    id,
    name: queueName,
    queueName,
    data
  } as Job<T>;
}

describe("worker processors", () => {
  it("processAiJob returns a generated proposal result and writes status", async () => {
    const writes: unknown[] = [];
    const job = makeJob<AiJobPayload>("ai-jobs", {
      requestId: "ai-123",
      documentId: "doc-1",
      userId: "user-1",
      operation: "summarize",
      sourceText: "This is the source text to summarize."
    });

    const result = await processAiJob(job, async (update) => {
      writes.push(update);
    });

    expect(result.status).toBe("completed");
    expect(result.proposalId).toBe("proposal-ai-123");
    expect(result.proposedText).toBe("[SUMMARY] This is the source text to summarize.");
    expect(result.summary).toBe("Generated a summary proposal for doc-1.");
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      queueName: "ai-jobs",
      requestId: "ai-123",
      status: "completed"
    });
  });

  it("processExportJob returns an artifact result and writes status", async () => {
    const writes: unknown[] = [];
    const job = makeJob<ExportJobPayload>("export-jobs", {
        requestId: "exp-123",
        documentId: "doc-2",
        format: "pdf",
        requestedBy: "user-2",
        title: "Export title",
        content: "Sample content"
    });

    const result = await processExportJob(job, async (update) => {
      writes.push(update);
    });

    expect(result.status).toBe("completed");
    expect(result.exportId).toBe("export-exp-123");
    expect(result.artifactKey).toBe("exports/doc-2.pdf");
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      queueName: "export-jobs",
      requestId: "exp-123",
      status: "completed"
    });
  });

  it("processRevisionSummaryJob returns a revision summary result and writes status", async () => {
    const writes: unknown[] = [];
    const job = makeJob<RevisionSummaryJobPayload>("revision-jobs", {
      requestId: "rev-123",
      documentId: "doc-3",
      revisionId: "r-7",
      requestedBy: "user-3",
      title: "Checkpoint A12",
      snapshotText: "Expanded the launch plan and clarified rollout dependencies."
    });

    const result = await processRevisionSummaryJob(job, async (update) => {
      writes.push(update);
    });

    expect(result.status).toBe("completed");
    expect(result.summaryId).toBe("summary-rev-123");
    expect(result.summary).toContain("Checkpoint A12 recorded for doc-3 by user-3.");
    expect(result.summary).toContain("Expanded the launch plan and clarified rollout dependencies.");
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      queueName: "revision-jobs",
      requestId: "rev-123",
      status: "completed"
    });
  });
});
