import { randomUUID } from "node:crypto";

import type {
  ArchiveDocumentResponse,
  CreateDocumentResponse,
  GetDocumentMetadataResponse,
  DocumentMetadata,
  DocumentPermissionSummary,
  DocumentRole,
  DocumentSummary,
  ListDocumentsResponse,
  RenameDocumentResponse
} from "@repo/shared-types";
import { AppError } from "../../common/errors.js";

type StoredMembership = {
  role: DocumentRole;
  userId: string;
};

type StoredDocument = {
  archivedAt: string | null;
  createdAt: string;
  id: string;
  memberships: StoredMembership[];
  title: string;
  updatedAt: string;
};

export type DocumentActor = {
  name: string | null;
  userId: string;
};

const rolePermissions: Record<DocumentRole, Omit<DocumentPermissionSummary, "role">> = {
  owner: {
    canView: true,
    canComment: true,
    canEdit: true,
    canShare: true,
    canExport: true,
    canUseAi: true,
    canRollback: true
  },
  editor: {
    canView: true,
    canComment: true,
    canEdit: true,
    canShare: false,
    canExport: true,
    canUseAi: true,
    canRollback: false
  },
  commenter: {
    canView: true,
    canComment: true,
    canEdit: false,
    canShare: false,
    canExport: true,
    canUseAi: false,
    canRollback: false
  },
  viewer: {
    canView: true,
    canComment: false,
    canEdit: false,
    canShare: false,
    canExport: false,
    canUseAi: false,
    canRollback: false
  }
};

function toPermissionSummary(role: DocumentRole): DocumentPermissionSummary {
  return {
    role,
    ...rolePermissions[role]
  };
}

function toDocumentMetadata(document: StoredDocument, role: DocumentRole): DocumentMetadata {
  return {
    id: document.id,
    title: document.title,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    archivedAt: document.archivedAt,
    permissions: toPermissionSummary(role)
  };
}

function toDocumentSummary(document: StoredDocument, role: DocumentRole): DocumentSummary {
  return {
    id: document.id,
    title: document.title,
    role,
    updatedAt: document.updatedAt
  };
}

export class DocumentsService {
  private readonly documents = new Map<string, StoredDocument>();

  private getMembership(document: StoredDocument, userId: string): StoredMembership | undefined {
    return document.memberships.find((entry) => entry.userId === userId);
  }

  createDocument(title: string, actor: DocumentActor): CreateDocumentResponse {
    const now = new Date().toISOString();
    const document: StoredDocument = {
      id: randomUUID(),
      title,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      memberships: [
        {
          userId: actor.userId,
          role: "owner"
        }
      ]
    };

    this.documents.set(document.id, document);

    return {
      document: toDocumentMetadata(document, "owner")
    };
  }

  listDocuments(actor: DocumentActor): ListDocumentsResponse {
    const documents = Array.from(this.documents.values())
      .map((document) => {
        const membership = this.getMembership(
          document,
          actor.userId
        );

        if (!membership || !rolePermissions[membership.role].canView) {
          return null;
        }

        if (document.archivedAt) {
          return null;
        }

        return toDocumentSummary(document, membership.role);
      })
      .filter((document): document is DocumentSummary => document !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return { documents };
  }

  getDocumentMetadata(documentId: string, actor: DocumentActor): GetDocumentMetadataResponse {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
    }

    const membership = this.getMembership(document, actor.userId);

    if (!membership || !rolePermissions[membership.role].canView) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    return {
      document: toDocumentMetadata(document, membership.role)
    };
  }

  renameDocument(
    documentId: string,
    title: string,
    actor: DocumentActor
  ): RenameDocumentResponse {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
    }

    const membership = this.getMembership(document, actor.userId);

    if (!membership || !rolePermissions[membership.role].canEdit) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have permission to rename this document.");
    }

    document.title = title;
    document.updatedAt = new Date().toISOString();

    return {
      document: toDocumentMetadata(document, membership.role)
    };
  }

  archiveDocument(
    documentId: string,
    actor: DocumentActor
  ): ArchiveDocumentResponse {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
    }

    const membership = this.getMembership(document, actor.userId);

    if (!membership || membership.role !== "owner") {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "Only owners can archive this document.");
    }

    const archivedAt = new Date().toISOString();
    document.archivedAt = archivedAt;
    document.updatedAt = archivedAt;

    return {
      documentId: document.id,
      archivedAt
    };
  }
}
