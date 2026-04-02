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
};

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
    const baseline: StoredRevision = {
      revisionId: `rev_${randomUUID()}`,
      documentId,
      label: `Initial snapshot: ${metadata.title}`,
      authorUserId: actor.userId,
      createdAt: metadata.updatedAt,
      snapshotId: `snap_${randomUUID()}`,
      contentType: "application/vnd.collab.document+json",
      parentRevisionId: null
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

    return {
      documentId,
      revisionId: revision.revisionId,
      compareToRevisionId: compareToRevision?.revisionId ?? null,
      summary: compareToRevision
        ? `Stub diff between ${revision.label} and ${compareToRevision.label}.`
        : `Stub diff for ${revision.label} against the current head.`,
      changes: [
        {
          field: "content",
          kind: "stub",
          description: compareToRevision
            ? "Detailed diff generation is not wired yet, but the comparison target is validated."
            : "Detailed diff generation is not wired yet."
        }
      ]
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
    const rolledBackAt = new Date().toISOString();
    const rollbackRevision: StoredRevision = {
      revisionId: `rev_${randomUUID()}`,
      documentId,
      label: `Rollback to ${targetRevision.label}`,
      authorUserId: actor.userId,
      createdAt: rolledBackAt,
      snapshotId: targetRevision.snapshotId,
      contentType: targetRevision.contentType,
      parentRevisionId: targetRevision.revisionId
    };

    revisions.push(rollbackRevision);

    return {
      revisionId: rollbackRevision.revisionId,
      rolledBackAt
    };
  }
}
