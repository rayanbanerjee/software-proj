import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

import { canComment } from "@repo/authz";
import type {
  CommentRecord,
  CreateCommentResponse,
  DocumentRole,
  ListCommentsResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";
import { ensureUser } from "../../common/user-store.js";

type CommentActor = {
  email?: string | null;
  name: string | null;
  userId: string;
};

export class CommentsService {
  readonly moduleName = "comments";

  constructor(private readonly prisma: PrismaClient) {}

  async listComments(documentId: string): Promise<ListCommentsResponse> {
    const comments = await this.prisma.comment.findMany({
      where: {
        documentId
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    return {
      comments: comments.map((comment): CommentRecord => ({
        id: comment.id,
        documentId: comment.documentId,
        authorUserId: comment.authorUserId,
        authorName: comment.authorName,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString()
      }))
    };
  }

  async createComment(
    documentId: string,
    actor: CommentActor,
    role: DocumentRole,
    body: string
  ): Promise<CreateCommentResponse> {
    if (!canComment(role)) {
      throw new AppError("COMMENTS_FORBIDDEN", 403, "You do not have permission to comment on this document.");
    }

    await ensureUser(this.prisma, {
      email: actor.email ?? `${actor.userId}@local.test`,
      id: actor.userId,
      name: actor.name
    });

    const comment = await this.prisma.comment.create({
      data: {
        id: randomUUID(),
        documentId,
        authorUserId: actor.userId,
        authorName: actor.name,
        body
      }
    });

    return {
      comment: {
        id: comment.id,
        documentId: comment.documentId,
        authorUserId: comment.authorUserId,
        authorName: comment.authorName,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString()
      }
    };
  }
}
