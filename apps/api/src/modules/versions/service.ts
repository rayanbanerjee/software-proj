import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

import { canRollback, canView } from "@repo/authz";
import type {
  GetRevisionDetailResponse,
  ListRevisionsResponse,
  RevisionDiffResponse,
  RevisionDetail,
  RevisionSummary,
  RollbackRevisionResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";
import { ensureUser } from "../../common/user-store.js";
import type { DocumentActor, DocumentsService } from "../documents/service.js";

type StoredRevision = RevisionDetail & {
  parentRevisionId: string | null;
  snapshotText: string;
  title: string;
};

type DiffChangeKind = RevisionDiffResponse["changes"][number]["kind"];

function normalizeLines(value: string) {
  const normalized = value.replace(/\r\n/g, "\n");

  if (normalized.length === 0) {
    return [] as string[];
  }

  return normalized.split("\n");
}

function summarizeChangeCount(kind: DiffChangeKind, count: number) {
  const noun = count === 1 ? "line" : "lines";
  return `${count} ${noun} ${kind}`;
}

function buildLineDiffChanges(
  source: string,
  target: string
): RevisionDiffResponse["changes"] {
  const sourceLines = normalizeLines(source);
  const targetLines = normalizeLines(target);
  const maxLength = Math.max(sourceLines.length, targetLines.length);
  const changes: RevisionDiffResponse["changes"] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const sourceLine = sourceLines[index];
    const targetLine = targetLines[index];

    if (sourceLine === targetLine) {
      continue;
    }

    if (sourceLine === undefined) {
      changes.push({
        field: "content",
        kind: "added",
        description: `Line ${index + 1} added: ${targetLine ?? ""}`
      });
      continue;
    }

    if (targetLine === undefined) {
      changes.push({
        field: "content",
        kind: "removed",
        description: `Line ${index + 1} removed: ${sourceLine}`
      });
      continue;
    }

    changes.push({
      field: "content",
      kind: "modified",
      description: `Line ${index + 1} changed from "${sourceLine}" to "${targetLine}"`
    });
  }

  return changes;
}

function summarizeDiff(changes: RevisionDiffResponse["changes"]) {
  if (changes.length === 0) {
    return "No content changes.";
  }

  const counts = changes.reduce<Record<DiffChangeKind, number>>(
    (accumulator, change) => {
      accumulator[change.kind] += 1;
      return accumulator;
    },
    {
      added: 0,
      removed: 0,
      modified: 0
    }
  );
  const parts = (Object.entries(counts) as Array<[DiffChangeKind, number]>)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => summarizeChangeCount(kind, count));

  return parts.join(", ");
}

function formatDiffSummary(
  summary: string,
  fromLabel: string,
  toLabel: string
) {
  const prefix = summary === "No content changes."
    ? "No content changes"
    : summary;

  return `${prefix} between ${fromLabel} and ${toLabel}.`;
}

function toStoredRevision(record: {
  authorUserId: string;
  contentType: string;
  createdAt: Date;
  documentId: string;
  label: string;
  parentRevisionId: string | null;
  revisionId: string;
  snapshotId: string;
  snapshotText: string;
  title: string;
}): StoredRevision {
  return {
    revisionId: record.revisionId,
    documentId: record.documentId,
    label: record.label,
    authorUserId: record.authorUserId,
    createdAt: record.createdAt.toISOString(),
    snapshotId: record.snapshotId,
    contentType: record.contentType,
    parentRevisionId: record.parentRevisionId,
    snapshotText: record.snapshotText,
    title: record.title
  };
}

export class VersionsService {
  readonly moduleName = "versions";

  constructor(
    private readonly prisma: PrismaClient,
    private readonly documentsService: DocumentsService
  ) {}

  private async ensureAccessibleDocument(documentId: string, actor: DocumentActor) {
    const metadata = await this.documentsService.getDocumentMetadata(documentId, actor);
    const role = metadata.document.permissions.role;

    if (!canView(role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    return {
      metadata: metadata.document,
      role
    };
  }

  private async ensureRevisionHistory(documentId: string, actor: DocumentActor): Promise<void> {
    const revisionCount = await this.prisma.revision.count({
      where: {
        documentId
      }
    });

    if (revisionCount > 0) {
      return;
    }

    const {
      metadata
    } = await this.ensureAccessibleDocument(documentId, actor);
    const snapshot = await this.documentsService.getDocumentSnapshot(documentId, actor);

    await ensureUser(this.prisma, {
      email: `${actor.userId}@local.test`,
      id: actor.userId,
      name: actor.name
    });

    await this.prisma.revision.create({
      data: {
        revisionId: `rev_${randomUUID()}`,
        documentId,
        label: `Initial snapshot: ${metadata.title}`,
        authorUserId: actor.userId,
        createdAt: new Date(metadata.updatedAt),
        snapshotId: `snap_${randomUUID()}`,
        contentType: "application/vnd.collab.document+json",
        parentRevisionId: null,
        snapshotText: snapshot.text,
        title: snapshot.title
      }
    });
  }

  private toSummary(revision: StoredRevision): RevisionSummary {
    return {
      revisionId: revision.revisionId,
      documentId: revision.documentId,
      label: revision.label,
      authorUserId: revision.authorUserId,
      createdAt: revision.createdAt
    };
  }

  private async requireRevision(documentId: string, revisionId: string): Promise<StoredRevision> {
    const revision = await this.prisma.revision.findUnique({
      where: {
        revisionId
      }
    });

    if (!revision || revision.documentId !== documentId) {
      throw new AppError("REVISION_NOT_FOUND", 404, "Revision not found.");
    }

    return toStoredRevision(revision);
  }

  async captureRevision(
    documentId: string,
    input: {
      actor?: DocumentActor | null;
      label?: string;
    } = {}
  ) {
    const document = await this.prisma.document.findUnique({
      where: {
        id: documentId
      },
      select: {
        content: true,
        ownerUserId: true,
        richContent: true,
        title: true,
        updatedAt: true
      }
    });

    if (!document) {
      throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
    }

    const latestRevision = await this.prisma.revision.findFirst({
      where: {
        documentId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (
      latestRevision
      && latestRevision.snapshotText === document.content
      && latestRevision.title === document.title
    ) {
      return null;
    }

    const authorUserId = input.actor?.userId ?? document.ownerUserId;
    await ensureUser(this.prisma, {
      email: `${authorUserId}@local.test`,
      id: authorUserId,
      name: input.actor?.name ?? null
    });

    const created = await this.prisma.revision.create({
      data: {
        revisionId: `rev_${randomUUID()}`,
        documentId,
        label: input.label?.trim() || `Edit: ${document.title}`,
        authorUserId,
        createdAt: document.updatedAt,
        snapshotId: `snap_${randomUUID()}`,
        contentType: "application/vnd.collab.document+json",
        parentRevisionId: latestRevision?.revisionId ?? null,
        snapshotText: document.content,
        title: document.title
      }
    });

    return this.toSummary(toStoredRevision(created));
  }

  async listRevisions(documentId: string, actor: DocumentActor): Promise<ListRevisionsResponse> {
    await this.ensureAccessibleDocument(documentId, actor);
    await this.ensureRevisionHistory(documentId, actor);

    const revisions = await this.prisma.revision.findMany({
      where: {
        documentId
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return {
      revisions: revisions.map((revision) => this.toSummary(toStoredRevision(revision)))
    };
  }

  async getRevisionDetail(documentId: string, revisionId: string, actor: DocumentActor): Promise<GetRevisionDetailResponse> {
    await this.ensureAccessibleDocument(documentId, actor);
    await this.ensureRevisionHistory(documentId, actor);

    return {
      revision: await this.requireRevision(documentId, revisionId)
    };
  }

  async getRevisionDiff(
    documentId: string,
    revisionId: string,
    compareToRevisionId: string | null,
    actor: DocumentActor
  ): Promise<RevisionDiffResponse> {
    await this.ensureAccessibleDocument(documentId, actor);
    await this.ensureRevisionHistory(documentId, actor);

    const revision = await this.requireRevision(documentId, revisionId);
    const compareToRevision = compareToRevisionId
      ? await this.requireRevision(documentId, compareToRevisionId)
      : null;
    const currentSnapshot = compareToRevision
      ? null
      : await this.documentsService.getDocumentSnapshot(documentId, actor);
    const targetText = compareToRevision
      ? compareToRevision.snapshotText
      : currentSnapshot?.text ?? "";
    const changes = buildLineDiffChanges(revision.snapshotText, targetText);
    const summary = summarizeDiff(changes);

    return {
      documentId,
      revisionId: revision.revisionId,
      compareToRevisionId: compareToRevision?.revisionId ?? null,
      summary: compareToRevision
        ? formatDiffSummary(summary, revision.label, compareToRevision.label)
        : formatDiffSummary(summary, revision.label, "the current head"),
      changes
    };
  }

  async rollbackRevision(
    documentId: string,
    revisionId: string,
    actor: DocumentActor
  ): Promise<RollbackRevisionResponse> {
    const {
      role
    } = await this.ensureAccessibleDocument(documentId, actor);

    if (!canRollback(role)) {
      throw new AppError("REVISION_FORBIDDEN", 403, "You do not have permission to roll back this document.");
    }

    await this.ensureRevisionHistory(documentId, actor);
    const targetRevision = await this.requireRevision(documentId, revisionId);
    const restoredSnapshot = await this.documentsService.restoreDocumentSnapshot(
      documentId,
      {
        text: targetRevision.snapshotText,
        title: targetRevision.title
      },
      actor
    );

    await ensureUser(this.prisma, {
      email: `${actor.userId}@local.test`,
      id: actor.userId,
      name: actor.name
    });

    const rollbackRevisionId = `rev_${randomUUID()}`;

    await this.prisma.revision.create({
      data: {
        revisionId: rollbackRevisionId,
        documentId,
        label: `Rollback to ${targetRevision.label}`,
        authorUserId: actor.userId,
        createdAt: new Date(restoredSnapshot.updatedAt),
        snapshotId: targetRevision.snapshotId,
        contentType: targetRevision.contentType,
        parentRevisionId: targetRevision.revisionId,
        snapshotText: restoredSnapshot.text,
        title: restoredSnapshot.title
      }
    });

    return {
      revisionId: rollbackRevisionId,
      rolledBackAt: restoredSnapshot.updatedAt
    };
  }
}
