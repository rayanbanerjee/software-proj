import { createHmac, randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

import { canExport } from "@repo/authz";
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
  resolveDataPath,
  writeBufferFile
} from "../../common/file-store.js";
import type { DocumentActor, DocumentsService } from "../documents/service.js";
import { renderArtifact } from "./renderers.js";
import type { CreateExportRequest } from "./schema.js";

type ExportJobMimeType =
  | "text/plain; charset=utf-8"
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

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

function isIgnorablePrismaLifecycleError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Engine is not yet connected")
    || error.message.includes("Response from the Engine was empty");
}

function toSafeExportFileName(title: string, format: string) {
  const baseName = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${baseName || "document"}.${format}`;
}

function toExportJobSummary(job: {
  completedAt: Date | null;
  documentId: string;
  exportJobId: string;
  format: string;
  requestedAt: Date;
  status: string;
}): ExportJobSummary {
  return {
    exportJobId: job.exportJobId,
    documentId: job.documentId,
    format: job.format as ExportFormat,
    status: job.status as ExportJobSummary["status"],
    requestedAt: job.requestedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    downloadUrl: null
  };
}

export class ExportsService {
  readonly moduleName = "exports";

  private readonly artifactsDir: string;
  private readonly inFlightJobIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly documentsService: DocumentsService,
    private readonly config: {
      dataDir: string;
      bucketName: string;
      sessionSecret: string;
    }
  ) {
    this.artifactsDir = resolveDataPath(config.dataDir, "object-storage", config.bucketName);
    ensureDirectory(this.artifactsDir);
    void this.resumePendingJobs();
  }

  private async resumePendingJobs() {
    const jobs = await this.prisma.exportJob.findMany({
      where: {
        status: {
          in: ["queued", "running"]
        }
      },
      select: {
        exportJobId: true
      }
    });

    for (const job of jobs) {
      this.scheduleJobProcessing(job.exportJobId);
    }
  }

  private async ensureExportableDocument(documentId: string, actor: DocumentActor) {
    const metadata = await this.documentsService.getDocumentMetadata(documentId, actor);

    if (!canExport(metadata.document.permissions.role)) {
      throw new AppError("EXPORT_FORBIDDEN", 403, "You do not have permission to export this document.");
    }

    return metadata.document;
  }

  private async requireJob(documentId: string, exportJobId: string) {
    const job = await this.prisma.exportJob.findUnique({
      where: {
        exportJobId
      }
    });

    if (!job || job.documentId !== documentId) {
      throw new AppError("EXPORT_NOT_FOUND", 404, "Export job was not found for this document.");
    }

    return job;
  }

  private buildArtifactKey(documentId: string, exportJobId: string, format: ExportFormat) {
    return `exports/${documentId}/${exportJobId}.${format}`;
  }

  private getArtifactPath(artifactKey: string) {
    return resolveDataPath(this.artifactsDir, artifactKey);
  }

  private scheduleJobProcessing(exportJobId: string) {
    if (this.inFlightJobIds.has(exportJobId)) {
      return;
    }

    this.inFlightJobIds.add(exportJobId);
    queueMicrotask(() => {
      void this.processJob(exportJobId)
        .catch((error) => {
          if (!isIgnorablePrismaLifecycleError(error)) {
            throw error;
          }
        })
        .finally(() => {
          this.inFlightJobIds.delete(exportJobId);
        });
    });
  }

  private async processJob(exportJobId: string) {
    const job = await this.prisma.exportJob.findUnique({
      where: {
        exportJobId
      }
    });

    if (!job || (job.status !== "queued" && job.status !== "running")) {
      return;
    }

    await this.prisma.exportJob.update({
      where: {
        exportJobId
      },
      data: {
        status: "running"
      }
    });

    try {
      const snapshot = await this.documentsService.getDocumentSnapshot(job.documentId, {
        userId: job.requestedByUserId,
        name: null
      });
      const rendered = renderArtifact(job.format as ExportFormat, {
        richContent: snapshot.richContent,
        text: snapshot.text,
        title: snapshot.title
      });
      const artifactKey = this.buildArtifactKey(job.documentId, job.exportJobId, job.format as ExportFormat);
      const artifactPath = this.getArtifactPath(artifactKey);

      writeBufferFile(artifactPath, rendered.content);

      await this.prisma.exportJob.update({
        where: {
          exportJobId
        },
        data: {
          artifactKey,
          completedAt: new Date(),
          errorMessage: null,
          mimeType: rendered.mimeType,
          status: "succeeded"
        }
      });
    } catch (error) {
      await this.prisma.exportJob.update({
        where: {
          exportJobId
        },
        data: {
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Export processing failed.",
          status: "failed"
        }
      });
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
    await this.ensureExportableDocument(documentId, actor);
    const exportJobId = `exp_${randomUUID()}`;
    const requestedAt = new Date();

    await this.prisma.exportJob.create({
      data: {
        exportJobId,
        documentId,
        requestedByUserId: actor.userId,
        format: input.format,
        status: "queued",
        requestedAt
      }
    });

    this.scheduleJobProcessing(exportJobId);

    return {
      exportJobId,
      status: "queued",
      requestedAt: requestedAt.toISOString()
    };
  }

  async getExportJob(
    documentId: string,
    exportJobId: string,
    actor: DocumentActor
  ): Promise<GetExportJobStatusResponse> {
    await this.ensureExportableDocument(documentId, actor);
    const job = await this.requireJob(documentId, exportJobId);

    return {
      job: toExportJobSummary(job)
    };
  }

  async createDownloadLink(
    documentId: string,
    exportJobId: string,
    actor: DocumentActor
  ): Promise<ExportDownloadLink | null> {
    await this.getExportJob(documentId, exportJobId, actor);
    const job = await this.requireJob(documentId, exportJobId);

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
    const document = await this.ensureExportableDocument(documentId, actor);
    const job = await this.requireJob(documentId, exportJobId);

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
      fileName: toSafeExportFileName(document.title, job.format),
      filePath,
      mimeType: job.mimeType as ExportJobMimeType,
      size: fileStats.size
    };
  }

  createArtifactStream(filePath: string) {
    return createFileReadStream(filePath);
  }
}
