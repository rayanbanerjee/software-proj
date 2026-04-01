import { randomUUID } from "node:crypto";

import type {
  CreateDocumentResponse,
  DocumentMetadata,
  DocumentPermissionSummary,
  DocumentRole,
  DocumentSummary,
  ListDocumentsResponse
} from "@repo/shared-types";

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
        const membership = document.memberships.find(
          (entry) => entry.userId === actor.userId && rolePermissions[entry.role].canView
        );

        if (!membership) {
          return null;
        }

        return toDocumentSummary(document, membership.role);
      })
      .filter((document): document is DocumentSummary => document !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return { documents };
  }
}
