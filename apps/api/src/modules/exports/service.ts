import { randomUUID } from "node:crypto";

import type { CreateExportRequest } from "./schema.js";

export interface ExportJobResponse {
  exportId: string;
  status: "pending";
  documentId: string;
  format: "txt" | "pdf" | "docx";
}

export class ExportsService {
  readonly moduleName = "exports";

  async createExportJob(
    documentId: string,
    input: CreateExportRequest
  ): Promise<ExportJobResponse> {
    const exportId = `exp_${randomUUID()}`;

    console.log("enqueue export job", {
      exportId,
      documentId,
      format: input.format
    });

    return {
      exportId,
      status: "pending",
      documentId,
      format: input.format
    };
  }
}