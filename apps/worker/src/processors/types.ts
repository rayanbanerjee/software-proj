export type JobStatus = "completed";

export interface StatusWrite<TPayload, TResult> {
  jobId: string;
  queueName: string;
  status: JobStatus;
  requestId: string;
  payload: TPayload;
  result: TResult;
}

export type StatusWriter<TPayload, TResult> = (
  update: StatusWrite<TPayload, TResult>
) => Promise<void>;

export interface AiJobPayload {
  requestId: string;
  documentId: string;
  userId: string;
  operation: "rewrite" | "summarize" | "translate" | "restructure";
  prompt?: string | null;
  sourceText?: string | null;
}

export interface AiJobResult {
  proposalId: string;
  proposedText: string;
  summary: string;
  status: "completed";
  processedAt: string;
}

export interface ExportJobPayload {
  requestId: string;
  documentId: string;
  format: "txt" | "pdf" | "docx";
  requestedBy: string;
  title?: string;
  content?: string;
}

export interface ExportJobResult {
  exportId: string;
  status: "completed";
  artifactKey: string;
  processedAt: string;
}

export interface RevisionSummaryJobPayload {
  requestId: string;
  documentId: string;
  revisionId: string;
  requestedBy: string;
  title?: string | null;
  snapshotText?: string | null;
}

export interface RevisionSummaryJobResult {
  summaryId: string;
  summary: string;
  status: "completed";
  processedAt: string;
}
