import { randomUUID } from "node:crypto";

import {
  canComment,
  canEdit,
  canExport,
  canRollback,
  canShare,
  canUseAi,
  canView
} from "@repo/authz";
import type {
  ArchiveDocumentResponse,
  CollaboratorSessionSummary,
  CreateDocumentResponse,
  DocumentContent,
  DocumentSessionState,
  JoinDocumentSessionResponse,
  GetDocumentMetadataResponse,
  GetDocumentContentResponse,
  DocumentMetadata,
  DocumentPermissionSummary,
  DocumentRole,
  DocumentSummary,
  ListDocumentsResponse,
  RenameDocumentResponse,
  UpdateDocumentContentResponse
} from "@repo/shared-types";
import { AppError } from "../../common/errors.js";

type StoredMembership = {
  role: DocumentRole;
  userId: string;
};

type StoredDocument = {
  archivedAt: string | null;
  content: string;
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

function toPermissionSummary(role: DocumentRole): DocumentPermissionSummary {
  return {
    role,
    canView: canView(role),
    canComment: canComment(role),
    canEdit: canEdit(role),
    canShare: canShare(role),
    canExport: canExport(role),
    canUseAi: canUseAi(role),
    canRollback: canRollback(role)
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

function toDocumentContent(document: StoredDocument): DocumentContent {
  return {
    documentId: document.id,
    text: document.content,
    updatedAt: document.updatedAt
  };
}

function toSessionAccessLevel(role: DocumentRole): "read" | "write" {
  return canEdit(role) ? "write" : "read";
}

function toCollaboratorSessionSummary(
  document: StoredDocument,
  actor: DocumentActor,
  role: DocumentRole,
  sessionId: string,
  joinedAt: string
): CollaboratorSessionSummary {
  return {
    sessionId,
    documentId: document.id,
    userId: actor.userId,
    displayName: actor.name,
    role,
    accessLevel: toSessionAccessLevel(role),
    isPresent: true,
    lastSeenAt: joinedAt,
    connectionStatus: "active"
  };
}

export class DocumentsService {
  private readonly documents = new Map<string, StoredDocument>();

  private maybeGrantDevelopmentAccess(document: StoredDocument, actor: DocumentActor): StoredMembership | undefined {
    const existingMembership = this.getMembership(document, actor.userId);

    if (existingMembership) {
      return existingMembership;
    }

    if (
      process.env.NODE_ENV === "production"
      || process.env.NODE_ENV === "test"
    ) {
      return undefined;
    }

    const membership: StoredMembership = {
      userId: actor.userId,
      role: "editor"
    };

    document.memberships.push(membership);
    document.updatedAt = new Date().toISOString();

    return membership;
  }

  private getMembership(document: StoredDocument, userId: string): StoredMembership | undefined {
    return document.memberships.find((entry) => entry.userId === userId);
  }

  private requireDocument(documentId: string): StoredDocument {
    const document = this.documents.get(documentId);

    if (!document) {
      throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
    }

    return document;
  }

  createDocument(title: string, actor: DocumentActor): CreateDocumentResponse {
    const now = new Date().toISOString();
    const document: StoredDocument = {
      id: randomUUID(),
      title,
      content: "",
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
        const membership = this.maybeGrantDevelopmentAccess(document, actor) ?? this.getMembership(
          document,
          actor.userId
        );

        if (!membership || !canView(membership.role)) {
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
    const document = this.requireDocument(documentId);

    const membership = this.maybeGrantDevelopmentAccess(document, actor) ?? this.getMembership(document, actor.userId);

    if (!membership || !canView(membership.role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    return {
      document: toDocumentMetadata(document, membership.role)
    };
  }

  createDocumentSession(
    documentId: string,
    actor: DocumentActor,
    options: {
      collabBaseUrl: string;
      lastKnownSessionId?: string;
      sessionToken: string;
    }
  ): JoinDocumentSessionResponse {
    const document = this.requireDocument(documentId);
    const membership = this.maybeGrantDevelopmentAccess(document, actor) ?? this.getMembership(document, actor.userId);

    if (!membership || !canView(membership.role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    const joinedAt = new Date().toISOString();
    const sessionId = randomUUID();
    const resumedFromSessionId = options.lastKnownSessionId?.trim() || null;
    const self = toCollaboratorSessionSummary(
      document,
      actor,
      membership.role,
      sessionId,
      joinedAt
    );
    const session: DocumentSessionState = {
      documentId: document.id,
      joinedAt,
      resumedFromSessionId,
      self,
      collaborators: [self]
    };
    const websocketUrl = new URL(options.collabBaseUrl);

    websocketUrl.searchParams.set("documentName", document.id);
    websocketUrl.searchParams.set("token", options.sessionToken);
    websocketUrl.searchParams.set("accessLevel", self.accessLevel);

    return {
      session,
      websocketUrl: websocketUrl.toString(),
      token: options.sessionToken
    };
  }

  renameDocument(
    documentId: string,
    title: string,
    actor: DocumentActor
  ): RenameDocumentResponse {
    const document = this.requireDocument(documentId);

    const membership = this.getMembership(document, actor.userId);

    if (!membership || !canEdit(membership.role)) {
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
    const document = this.requireDocument(documentId);

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

  getDocumentContent(documentId: string, actor: DocumentActor): GetDocumentContentResponse {
    const document = this.requireDocument(documentId);
    const membership = this.maybeGrantDevelopmentAccess(document, actor) ?? this.getMembership(document, actor.userId);

    if (!membership || !canView(membership.role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    return {
      content: toDocumentContent(document)
    };
  }

  updateDocumentContent(
    documentId: string,
    text: string,
    actor: DocumentActor
  ): UpdateDocumentContentResponse {
    const document = this.requireDocument(documentId);
    const membership = this.maybeGrantDevelopmentAccess(document, actor) ?? this.getMembership(document, actor.userId);

    if (!membership || !canEdit(membership.role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have permission to edit this document.");
    }

    document.content = text;
    document.updatedAt = new Date().toISOString();

    return {
      content: toDocumentContent(document)
    };
  }

  getDocumentRole(documentId: string, userId: string): DocumentRole | null {
    const document = this.requireDocument(documentId);
    const membership = this.getMembership(document, userId);
    return membership?.role ?? null;
  }

  setMembership(documentId: string, userId: string, role: DocumentRole): StoredMembership {
    const document = this.requireDocument(documentId);
    const existingMembership = this.getMembership(document, userId);

    if (existingMembership) {
      existingMembership.role = role;
      document.updatedAt = new Date().toISOString();
      return existingMembership;
    }

    const membership = {
      userId,
      role
    };

    document.memberships.push(membership);
    document.updatedAt = new Date().toISOString();

    return membership;
  }

  removeMembership(documentId: string, userId: string): void {
    const document = this.requireDocument(documentId);
    const nextMemberships = document.memberships.filter((membership) => membership.userId !== userId);

    if (nextMemberships.length === document.memberships.length) {
      throw new AppError("MEMBERSHIP_NOT_FOUND", 404, "Document membership not found.");
    }

    document.memberships = nextMemberships;
    document.updatedAt = new Date().toISOString();
  }
}
