import { randomUUID } from "node:crypto";
import prismaClientPkg, { type Prisma, type PrismaClient } from "@prisma/client";

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
  GetDocumentContentResponse,
  GetDocumentMetadataResponse,
  JoinDocumentSessionResponse,
  ListDocumentsResponse,
  DocumentMetadata,
  DocumentPermissionSummary,
  DocumentRole,
  DocumentSummary,
  RenameDocumentResponse,
  SharedMembership,
  UpdateDocumentContentResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";
import { ensureUser } from "../../common/user-store.js";
import {
  createRichTextDocumentFromPlainText,
  isRichTextDocument,
  type RichTextDocument
} from "./rich-text.js";

const { Prisma: PrismaRuntime } = prismaClientPkg;

type StoredDocument = {
  archivedAt: string | null;
  content: string;
  createdAt: string;
  defaultRole: DocumentRole | null;
  id: string;
  richContent: RichTextDocument | null;
  title: string;
  updatedAt: string;
};

type StoredMembership = {
  displayName: string | null;
  role: DocumentRole;
  userId: string;
};

type DocumentSnapshot = {
  richContent: RichTextDocument | null;
  text: string;
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
    richText: document.richContent ?? null,
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

function toDocumentRole(value: string): DocumentRole {
  if (value === "owner" || value === "editor" || value === "commenter" || value === "viewer") {
    return value;
  }

  throw new Error(`Unsupported document role: ${value}`);
}

function toStoredDocument(record: {
  archivedAt: Date | null;
  content: string;
  createdAt: Date;
  defaultRole: string | null;
  id: string;
  richContent: unknown;
  title: string;
  updatedAt: Date;
}): StoredDocument {
  const richContent = record.richContent && isRichTextDocument(record.richContent)
    ? record.richContent
    : record.richContent === null
      ? null
      : createRichTextDocumentFromPlainText(record.content);

  return {
    archivedAt: record.archivedAt?.toISOString() ?? null,
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    defaultRole: record.defaultRole ? toDocumentRole(record.defaultRole) : null,
    id: record.id,
    richContent,
    title: record.title,
    updatedAt: record.updatedAt.toISOString()
  };
}

function toPrismaJsonValue(value: RichTextDocument | null): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) {
    return PrismaRuntime.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class DocumentsService {
  constructor(private readonly prisma: PrismaClient) {}

  private async ensureActorUser(actor: DocumentActor) {
    await ensureUser(this.prisma, {
      email: `${actor.userId}@local.test`,
      id: actor.userId,
      name: actor.name
    });
  }

  private async findMembership(documentId: string, userId: string) {
    return this.prisma.documentMembership.findUnique({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      }
    });
  }

  private async getEffectiveRole(documentId: string, userId: string): Promise<DocumentRole | null> {
    const document = await this.prisma.document.findUnique({
      where: {
        id: documentId
      },
      select: {
        defaultRole: true,
        memberships: {
          where: {
            userId
          },
          select: {
            role: true
          },
          take: 1
        }
      }
    });

    if (!document) {
      throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
    }

    const membership = document.memberships[0];
    return membership ? toDocumentRole(membership.role) : document.defaultRole ? toDocumentRole(document.defaultRole) : null;
  }

  private async requireDocument(documentId: string): Promise<StoredDocument> {
    const document = await this.prisma.document.findUnique({
      where: {
        id: documentId
      }
    });

    if (!document) {
      throw new AppError("DOCUMENT_NOT_FOUND", 404, "Document not found.");
    }

    return toStoredDocument(document);
  }

  async createDocument(title: string, actor: DocumentActor): Promise<CreateDocumentResponse> {
    await this.ensureActorUser(actor);
    const documentId = randomUUID();
    const created = await this.prisma.document.create({
      data: {
        id: documentId,
        ownerUserId: actor.userId,
        title,
        content: "",
        richContent: toPrismaJsonValue(createRichTextDocumentFromPlainText("")),
        defaultRole: null,
        memberships: {
          create: {
            userId: actor.userId,
            displayName: actor.name,
            role: "owner"
          }
        }
      }
    });

    return {
      document: toDocumentMetadata(toStoredDocument(created), "owner")
    };
  }

  async listDocuments(actor: DocumentActor): Promise<ListDocumentsResponse> {
    const documents = await this.prisma.document.findMany({
      where: {
        archivedAt: null,
        OR: [
          {
            memberships: {
              some: {
                userId: actor.userId
              }
            }
          },
          {
            defaultRole: {
              not: null
            }
          }
        ]
      },
      include: {
        memberships: {
          where: {
            userId: actor.userId
          },
          select: {
            role: true
          },
          take: 1
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    return {
      documents: documents.flatMap((document) => {
        const membership = document.memberships[0];
        const role = membership ? toDocumentRole(membership.role) : document.defaultRole ? toDocumentRole(document.defaultRole) : null;

        if (!role || !canView(role)) {
          return [];
        }

        return [toDocumentSummary(toStoredDocument(document), role)];
      })
    };
  }

  async getDocumentMetadata(documentId: string, actor: DocumentActor): Promise<GetDocumentMetadataResponse> {
    const document = await this.requireDocument(documentId);
    const role = await this.getEffectiveRole(documentId, actor.userId);

    if (!role || !canView(role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    return {
      document: toDocumentMetadata(document, role)
    };
  }

  async createDocumentSession(
    documentId: string,
    actor: DocumentActor,
    options: {
      collabBaseUrl: string;
      lastKnownSessionId?: string;
      sessionToken: string;
    }
  ): Promise<JoinDocumentSessionResponse> {
    const document = await this.requireDocument(documentId);
    const role = await this.getEffectiveRole(documentId, actor.userId);

    if (!role || !canView(role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    const joinedAt = new Date().toISOString();
    const sessionId = randomUUID();
    const resumedFromSessionId = options.lastKnownSessionId?.trim() || null;
    const self = toCollaboratorSessionSummary(document, actor, role, sessionId, joinedAt);
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

  async renameDocument(documentId: string, title: string, actor: DocumentActor): Promise<RenameDocumentResponse> {
    const role = await this.getEffectiveRole(documentId, actor.userId);

    if (!role || !canEdit(role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have permission to rename this document.");
    }

    const updated = await this.prisma.document.update({
      where: {
        id: documentId
      },
      data: {
        title
      }
    });

    return {
      document: toDocumentMetadata(toStoredDocument(updated), role)
    };
  }

  async archiveDocument(documentId: string, actor: DocumentActor): Promise<ArchiveDocumentResponse> {
    const membership = await this.findMembership(documentId, actor.userId);

    if (!membership || membership.role !== "owner") {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "Only owners can archive this document.");
    }

    const updated = await this.prisma.document.update({
      where: {
        id: documentId
      },
      data: {
        archivedAt: new Date()
      }
    });

    return {
      documentId: updated.id,
      archivedAt: updated.archivedAt?.toISOString() ?? updated.updatedAt.toISOString()
    };
  }

  async getDocumentContent(documentId: string, actor: DocumentActor): Promise<GetDocumentContentResponse> {
    const document = await this.requireDocument(documentId);
    const role = await this.getEffectiveRole(documentId, actor.userId);

    if (!role || !canView(role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    return {
      content: toDocumentContent(document)
    };
  }

  async updateDocumentContent(documentId: string, text: string, actor: DocumentActor): Promise<UpdateDocumentContentResponse> {
    const role = await this.getEffectiveRole(documentId, actor.userId);

    if (!role || !canEdit(role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have permission to edit this document.");
    }

    const updated = await this.prisma.document.update({
      where: {
        id: documentId
      },
      data: {
        content: text,
        richContent: toPrismaJsonValue(createRichTextDocumentFromPlainText(text))
      }
    });

    return {
      content: toDocumentContent(toStoredDocument(updated))
    };
  }

  async syncDocumentContentFromCollab(
    documentId: string,
    input: {
      richContent?: RichTextDocument | null;
      text: string;
    }
  ) {
    const updated = await this.prisma.document.update({
      where: {
        id: documentId
      },
      data: {
        content: input.text,
        richContent: toPrismaJsonValue(input.richContent ?? createRichTextDocumentFromPlainText(input.text))
      }
    });

    return {
      content: toDocumentContent(toStoredDocument(updated))
    };
  }

  async getDocumentSnapshot(documentId: string, actor: DocumentActor): Promise<DocumentSnapshot> {
    const document = await this.requireDocument(documentId);
    const role = await this.getEffectiveRole(documentId, actor.userId);

    if (!role || !canView(role)) {
      throw new AppError("DOCUMENT_FORBIDDEN", 403, "You do not have access to this document.");
    }

    return {
      richContent: document.richContent ?? null,
      text: document.content,
      title: document.title,
      updatedAt: document.updatedAt
    };
  }

  async restoreDocumentSnapshot(
    documentId: string,
    snapshot: {
      richContent?: RichTextDocument | null;
      text: string;
      title: string;
    },
    actor: DocumentActor
  ) {
    const role = await this.getEffectiveRole(documentId, actor.userId);

    if (!role || !canRollback(role)) {
      throw new AppError("REVISION_FORBIDDEN", 403, "You do not have permission to roll back this document.");
    }

    const updated = await this.prisma.document.update({
      where: {
        id: documentId
      },
      data: {
        content: snapshot.text,
        richContent: toPrismaJsonValue(snapshot.richContent ?? createRichTextDocumentFromPlainText(snapshot.text)),
        title: snapshot.title
      }
    });

    return {
      text: updated.content,
      title: updated.title,
      updatedAt: updated.updatedAt.toISOString()
    };
  }

  async getDocumentRole(documentId: string, userId: string): Promise<DocumentRole | null> {
    return this.getEffectiveRole(documentId, userId);
  }

  async setMembership(
    documentId: string,
    userId: string,
    role: DocumentRole,
    options: {
      displayName?: string | null;
    } = {}
  ): Promise<StoredMembership> {
    await ensureUser(this.prisma, {
      email: `${userId}@local.test`,
      id: userId,
      name: options.displayName ?? null
    });

    const membership = await this.prisma.documentMembership.upsert({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      },
      update: {
        displayName: options.displayName ?? undefined,
        role
      },
      create: {
        documentId,
        userId,
        displayName: options.displayName ?? null,
        role
      }
    });

    return {
      displayName: membership.displayName,
      role: toDocumentRole(membership.role),
      userId: membership.userId
    };
  }

  async removeMembership(documentId: string, userId: string): Promise<void> {
    const membership = await this.findMembership(documentId, userId);

    if (!membership) {
      throw new AppError("MEMBERSHIP_NOT_FOUND", 404, "Document membership not found.");
    }

    await this.prisma.documentMembership.delete({
      where: {
        documentId_userId: {
          documentId,
          userId
        }
      }
    });
  }

  async listMemberships(documentId: string): Promise<SharedMembership[]> {
    const memberships = await this.prisma.documentMembership.findMany({
      where: {
        documentId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return memberships.map((membership) => ({
      displayName: membership.displayName,
      userId: membership.userId,
      role: toDocumentRole(membership.role)
    }));
  }
}
