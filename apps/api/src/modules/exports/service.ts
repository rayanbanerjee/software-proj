import { randomUUID } from "node:crypto";

import type { CreateExportRequest } from "./schema.js";

export interface ExportJobRecord {
  exportId: string;
  documentId: string;
  format: "txt" | "pdf" | "docx";
  status: "pending" | "completed" | "failed";
}

export class ExportsService {
  readonly moduleName = "exports";

  private readonly jobs = new Map<string, ExportJobRecord>();

  async createExportJob(
    documentId: string,
    input: CreateExportRequest
  ): Promise<ExportJobRecord> {
    const exportId = `exp_${randomUUID()}`;

    const job: ExportJobRecord = {
      exportId,
      documentId,
      format: input.format,
      status: "pending"
    };

    this.jobs.set(exportId, job);

    console.log("enqueue export job", {
      exportId,
      documentId,
      format: input.format
    });

    return job;
  }

  async getExportJob(
    documentId: string,
    exportId: string
  ): Promise<ExportJobRecord | null> {
    const job = this.jobs.get(exportId);

    if (!job) {
      return null;
    }

    if (job.documentId !== documentId) {
      return null;
    }

    return job;
  }
}