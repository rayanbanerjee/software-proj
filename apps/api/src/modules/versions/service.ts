import { randomUUID } from "node:crypto";

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

export class VersionsService {
  readonly moduleName = "versions";

  private readonly revisionsByDocument = new Map<string, StoredRevision[]>();

  constructor(private readonly documentsService: DocumentsService) {}

  private ensureAccessibleDocument(documentId: string, actor: DocumentActor) {
    const metadata = this.documentsService.getDocumentMetadata(documentId, actor);
    const role = metadata.document.permissions.role;

    if (!canView(role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    return {
      metadata: metadata.document,
      role
    };
  }

  private ensureRevisionHistory(documentId: string, actor: DocumentActor): StoredRevision[] {
    const existing = this.revisionsByDocument.get(documentId);

    if (existing) {
      return existing;
    }

    const {
      metadata
    } = this.ensureAccessibleDocument(documentId, actor);
    const snapshot = this.documentsService.getDocumentSnapshot(documentId, actor);
    const baseline: StoredRevision = {
      revisionId: `rev_${randomUUID()}`,
      documentId,
      label: `Initial snapshot: ${metadata.title}`,
      authorUserId: actor.userId,
      createdAt: metadata.updatedAt,
      snapshotId: `snap_${randomUUID()}`,
      contentType: "application/vnd.collab.document+json",
      parentRevisionId: null,
      snapshotText: snapshot.text,
      title: snapshot.title
    };

    this.revisionsByDocument.set(documentId, [baseline]);

    return this.revisionsByDocument.get(documentId) ?? [baseline];
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

  private requireRevision(documentId: string, revisionId: string): StoredRevision {
    const revisions = this.revisionsByDocument.get(documentId);
    const revision = revisions?.find((entry) => entry.revisionId === revisionId);

    if (!revision) {
      throw new AppError("REVISION_NOT_FOUND", 404, "Revision not found.");
    }

    return revision;
  }

  listRevisions(documentId: string, actor: DocumentActor): ListRevisionsResponse {
    this.ensureAccessibleDocument(documentId, actor);
    const revisions = this.ensureRevisionHistory(documentId, actor)
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((revision) => this.toSummary(revision));

    return {
      revisions
    };
  }

  getRevisionDetail(documentId: string, revisionId: string, actor: DocumentActor): GetRevisionDetailResponse {
    this.ensureAccessibleDocument(documentId, actor);
    this.ensureRevisionHistory(documentId, actor);

    return {
      revision: this.requireRevision(documentId, revisionId)
    };
  }

  getRevisionDiff(
    documentId: string,
    revisionId: string,
    compareToRevisionId: string | null,
    actor: DocumentActor
  ): RevisionDiffResponse {
    this.ensureAccessibleDocument(documentId, actor);
    this.ensureRevisionHistory(documentId, actor);

    const revision = this.requireRevision(documentId, revisionId);
    const compareToRevision = compareToRevisionId
      ? this.requireRevision(documentId, compareToRevisionId)
      : null;
    const currentSnapshot = compareToRevision
      ? null
      : this.documentsService.getDocumentSnapshot(documentId, actor);
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

  rollbackRevision(
    documentId: string,
    revisionId: string,
    actor: DocumentActor
  ): RollbackRevisionResponse {
    const {
      role
    } = this.ensureAccessibleDocument(documentId, actor);

    if (!canRollback(role)) {
      throw new AppError("REVISION_FORBIDDEN", 403, "You do not have permission to roll back this document.");
    }

    const revisions = this.ensureRevisionHistory(documentId, actor);
    const targetRevision = this.requireRevision(documentId, revisionId);
    const restoredSnapshot = this.documentsService.restoreDocumentSnapshot(
      documentId,
      {
        text: targetRevision.snapshotText,
        title: targetRevision.title
      },
      actor
    );
    const rolledBackAt = restoredSnapshot.updatedAt;
    const rollbackRevision: StoredRevision = {
      revisionId: `rev_${randomUUID()}`,
      documentId,
      label: `Rollback to ${targetRevision.label}`,
      authorUserId: actor.userId,
      createdAt: rolledBackAt,
      snapshotId: targetRevision.snapshotId,
      contentType: targetRevision.contentType,
      parentRevisionId: targetRevision.revisionId,
      snapshotText: restoredSnapshot.text,
      title: restoredSnapshot.title
    };

    revisions.push(rollbackRevision);

    return {
      revisionId: rollbackRevision.revisionId,
      rolledBackAt
    };
  }
}
