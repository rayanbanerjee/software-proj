import { createHash, randomUUID } from "node:crypto";

import type {
  ExportJobSummary,
  GetExportJobStatusResponse,
  RequestExportJobResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";
import type { DocumentActor, DocumentsService } from "../documents/service.js";
import type { CreateExportRequest } from "./schema.js";

export interface ExportJobRecord {
  completedAt: string | null;
  exportJobId: string;
  documentId: string;
  format: "txt" | "pdf" | "docx";
  requestedAt: string;
  status: "queued" | "running" | "succeeded" | "failed";
}

export interface ExportDownloadLink {
  downloadUrl: string;
  expiresAt: string;
}

export class ExportsService {
  readonly moduleName = "exports";

  private readonly jobs = new Map<string, ExportJobRecord>();

  constructor(private readonly documentsService: DocumentsService) {}

  private ensureAccessibleDocument(documentId: string, actor: DocumentActor) {
    this.documentsService.getDocumentMetadata(documentId, actor);
  }

  private toSummary(job: ExportJobRecord): ExportJobSummary {
    return {
      exportJobId: job.exportJobId,
      documentId: job.documentId,
      format: job.format,
      status: job.status,
      requestedAt: job.requestedAt,
      completedAt: job.completedAt,
      downloadUrl: null
    };
  }

  async createExportJob(
    documentId: string,
    input: CreateExportRequest,
    actor: DocumentActor
  ): Promise<RequestExportJobResponse> {
    this.ensureAccessibleDocument(documentId, actor);
    const exportJobId = `exp_${randomUUID()}`;
    const requestedAt = new Date().toISOString();

    const job: ExportJobRecord = {
      exportJobId,
      documentId,
      format: input.format,
      status: "succeeded",
      requestedAt,
      completedAt: requestedAt
    };

    this.jobs.set(exportJobId, job);

    console.log("enqueue export job", {
      exportJobId,
      documentId,
      format: input.format
    });

    return {
      exportJobId,
      status: job.status,
      requestedAt
    };
  }

  async getExportJob(
    documentId: string,
    exportJobId: string,
    actor: DocumentActor
  ): Promise<GetExportJobStatusResponse> {
    this.ensureAccessibleDocument(documentId, actor);
    const job = this.jobs.get(exportJobId);

    if (!job || job.documentId !== documentId) {
      throw new AppError("EXPORT_NOT_FOUND", 404, "Export job was not found for this document.");
    }

    return {
      job: this.toSummary(job)
    };
  }

  async createDownloadLink(
    documentId: string,
    exportJobId: string,
    actor: DocumentActor
  ): Promise<ExportDownloadLink | null> {
    const {
      job
    } = await this.getExportJob(documentId, exportJobId, actor);

    if (job.status !== "succeeded") {
      return null;
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const token = createHash("sha256")
      .update(`${documentId}:${exportJobId}:${expiresAt}`)
      .digest("hex")
      .slice(0, 24);

    return {
      downloadUrl: `/documents/${documentId}/exports/${exportJobId}/artifact?token=${token}`,
      expiresAt
    };
  }
}
