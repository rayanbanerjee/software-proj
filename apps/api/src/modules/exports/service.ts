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

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function renderPlainTextArtifact(input: {
  title?: string;
  content: string;
}) {
  const title = input.title?.trim();
  const body = input.content.replace(/\r\n/g, "\n").trim();
  const content = title ? `${title}\n\n${body}\n` : `${body}\n`;

  return {
    mimeType: "text/plain; charset=utf-8" as const,
    content: Buffer.from(content, "utf8")
  };
}

function renderPdfArtifact(input: {
  title?: string;
  content: string;
}) {
  const title = input.title?.trim() || "Untitled document";
  const lines = [title, "", ...input.content.replace(/\r\n/g, "\n").split("\n")].map(escapePdfText);
  let yPosition = 780;
  const textCommands = ["BT", "/F1 12 Tf"];

  for (const line of lines) {
    textCommands.push(`1 0 0 1 50 ${yPosition} Tm (${line}) Tj`);
    yPosition -= 18;
  }

  textCommands.push("ET");
  const stream = textCommands.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return {
    mimeType: "application/pdf" as const,
    content: Buffer.from(pdf, "utf8")
  };
}

type ZipEntry = {
  name: string;
  data: Buffer;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeCrcTable() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    table[index] = crc >>> 0;
  }

  return table;
}

const crcTable = makeCrcTable();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const value of buffer) {
    crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const localHeader = Buffer.alloc(30);
    const centralHeader = Buffer.alloc(46);
    const checksum = crc32(entry.data);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, nameBuffer, entry.data);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + entry.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.alloc(22);

  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(offset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
}

function renderDocxArtifact(input: {
  title?: string;
  content: string;
}) {
  const title = input.title?.trim() || "Untitled document";
  const lines = [title, "", ...input.content.replace(/\r\n/g, "\n").split("\n")];
  const paragraphXml = lines
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`)
    .join("");
  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`)
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)
    },
    {
      name: "word/document.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:w10="urn:schemas-microsoft-com:office:word"
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
 xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
  <w:body>
    ${paragraphXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`)
    }
  ];

  return {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const,
    content: buildStoredZip(entries)
  };
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

  private renderArtifact(job: ExportJobRecord, input: { title: string; content: string }) {
    if (job.format === "txt") {
      return renderPlainTextArtifact(input);
    }

    if (job.format === "pdf") {
      return renderPdfArtifact(input);
    }

    return renderDocxArtifact(input);
  }

  private async processJob(exportJobId: string, snapshot: { content: string; title: string }) {
    const job = this.jobs.get(exportJobId);

    if (!job || job.status !== "queued") {
      return;
    }

    job.status = "running";
    this.persistJobs();

    try {
      const rendered = this.renderArtifact(job, snapshot);
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
        content: snapshot.text,
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
