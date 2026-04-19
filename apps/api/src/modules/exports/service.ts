import { createHash, createHmac, randomUUID } from "node:crypto";

import type {
  ExportFormat,
  ExportJobSummary,
  GetExportJobStatusResponse,
  RequestExportJobResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";
import {
  createFileReadStream,
  ensureDirectory,
  readFileStats,
  readJsonFile,
  resolveDataPath,
  writeBufferFile,
  writeJsonFile
} from "../../common/file-store.js";
import type { DocumentActor, DocumentsService } from "../documents/service.js";
import { renderArtifact } from "./renderers.js";
import type { CreateExportRequest } from "./schema.js";

type ExportJobMimeType =
  | "text/plain; charset=utf-8"
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface ExportJobRecord {
  artifactKey: string | null;
  completedAt: string | null;
  documentId: string;
  errorMessage: string | null;
  exportJobId: string;
  format: ExportFormat;
  mimeType: ExportJobMimeType | null;
  requestedAt: string;
  status: "queued" | "running" | "succeeded" | "failed";
}

export interface ExportDownloadLink {
  downloadUrl: string;
  expiresAt: string;
}

interface ResolvedArtifact {
  fileName: string;
  filePath: string;
  mimeType: ExportJobMimeType;
  size: number;
}

export class ExportsService {
  readonly moduleName = "exports";

  private readonly jobs = new Map<string, ExportJobRecord>();
  private readonly artifactsDir: string;
  private readonly jobsPath: string;

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly config: {
      dataDir: string;
      bucketName: string;
      sessionSecret: string;
    }
  ) {
    this.jobsPath = resolveDataPath(config.dataDir, "exports", "jobs.json");
    this.artifactsDir = resolveDataPath(config.dataDir, "object-storage", config.bucketName);

    const storedJobs = readJsonFile<ExportJobRecord[]>(this.jobsPath, []);

    for (const job of storedJobs) {
      this.jobs.set(job.exportJobId, job);
    }

    ensureDirectory(this.artifactsDir);
  }

  private persistJobs() {
    writeJsonFile(this.jobsPath, Array.from(this.jobs.values()));
  }

  private ensureAccessibleDocument(documentId: string, actor: DocumentActor) {
    this.documentsService.getDocumentMetadata(documentId, actor);
  }

  private requireJob(documentId: string, exportJobId: string) {
    const job = this.jobs.get(exportJobId);

    if (!job || job.documentId !== documentId) {
      throw new AppError("EXPORT_NOT_FOUND", 404, "Export job was not found for this document.");
    }

    return job;
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

  private buildArtifactKey(documentId: string, exportJobId: string, format: ExportFormat) {
    return `exports/${documentId}/${exportJobId}.${format}`;
  }

  private getArtifactPath(artifactKey: string) {
    return resolveDataPath(this.artifactsDir, artifactKey);
  }

  private async processJob(
    exportJobId: string,
    snapshot: {
      richContent: Parameters<typeof renderArtifact>[1]["richContent"];
      text: string;
      title: string;
    }
  ) {
    const job = this.jobs.get(exportJobId);

    if (!job || job.status !== "queued") {
      return;
    }

    job.status = "running";
    this.persistJobs();

    try {
      const rendered = renderArtifact(job.format, {
        richContent: snapshot.richContent,
        text: snapshot.text,
        title: snapshot.title
      });
      const artifactKey = this.buildArtifactKey(job.documentId, job.exportJobId, job.format);
      const artifactPath = this.getArtifactPath(artifactKey);

      writeBufferFile(artifactPath, rendered.content);

      job.artifactKey = artifactKey;
      job.completedAt = new Date().toISOString();
      job.errorMessage = null;
      job.mimeType = rendered.mimeType;
      job.status = "succeeded";
      this.persistJobs();
    } catch (error) {
      job.completedAt = new Date().toISOString();
      job.errorMessage = error instanceof Error ? error.message : "Export processing failed.";
      job.status = "failed";
      this.persistJobs();
    }
  }

  private signArtifactToken(parts: {
    documentId: string;
    exportJobId: string;
    expiresAt: string;
  }) {
    return createHmac("sha256", this.config.sessionSecret)
      .update(`${parts.documentId}:${parts.exportJobId}:${parts.expiresAt}`)
      .digest("hex");
  }

  async createExportJob(
    documentId: string,
    input: CreateExportRequest,
    actor: DocumentActor
  ): Promise<RequestExportJobResponse> {
    this.ensureAccessibleDocument(documentId, actor);
    const snapshot = this.documentsService.getDocumentSnapshot(documentId, actor);
    const exportJobId = `exp_${randomUUID()}`;
    const requestedAt = new Date().toISOString();
    const job: ExportJobRecord = {
      artifactKey: null,
      completedAt: null,
      documentId,
      errorMessage: null,
      exportJobId,
      format: input.format,
      mimeType: null,
      requestedAt,
      status: "queued"
    };

    this.jobs.set(exportJobId, job);
    this.persistJobs();

    queueMicrotask(() => {
      void this.processJob(exportJobId, {
        richContent: snapshot.richContent,
        text: snapshot.text,
        title: snapshot.title
      });
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
    const job = this.requireJob(documentId, exportJobId);

    return {
      job: this.toSummary(job)
    };
  }

  async createDownloadLink(
    documentId: string,
    exportJobId: string,
    actor: DocumentActor
  ): Promise<ExportDownloadLink | null> {
    await this.getExportJob(documentId, exportJobId, actor);
    const job = this.requireJob(documentId, exportJobId);

    if (job.status !== "succeeded") {
      return null;
    }

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const token = this.signArtifactToken({
      documentId,
      exportJobId,
      expiresAt
    });

    return {
      downloadUrl: `/v1/documents/${documentId}/exports/${exportJobId}/artifact?expiresAt=${encodeURIComponent(expiresAt)}&token=${token}`,
      expiresAt
    };
  }

  async resolveArtifact(
    documentId: string,
    exportJobId: string,
    actor: DocumentActor,
    input: {
      expiresAt: string;
      token: string;
    }
  ): Promise<ResolvedArtifact> {
    await this.getExportJob(documentId, exportJobId, actor);
    const job = this.requireJob(documentId, exportJobId);

    if (job.status !== "succeeded" || !job.artifactKey || !job.mimeType) {
      throw new AppError("EXPORT_NOT_READY", 409, "Export artifact is not ready for download.");
    }

    if (!input.expiresAt || Number.isNaN(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= Date.now()) {
      throw new AppError("EXPORT_LINK_INVALID", 401, "Export download token is invalid.");
    }

    const expectedToken = this.signArtifactToken({
      documentId,
      exportJobId,
      expiresAt: input.expiresAt
    });

    if (input.token !== expectedToken) {
      throw new AppError("EXPORT_LINK_INVALID", 401, "Export download token is invalid.");
    }

    const filePath = this.getArtifactPath(job.artifactKey);
    const fileStats = readFileStats(filePath);

    return {
      fileName: createHash("sha1").update(job.exportJobId).digest("hex").slice(0, 12) + `.${job.format}`,
      filePath,
      mimeType: job.mimeType,
      size: fileStats.size
    };
  }

  createArtifactStream(filePath: string) {
    return createFileReadStream(filePath);
  }
}
