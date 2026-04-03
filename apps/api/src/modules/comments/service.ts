import { randomUUID } from "node:crypto";

import { canComment } from "@repo/authz";
import type {
  CommentRecord,
  CreateCommentResponse,
  DocumentRole,
  ListCommentsResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";

type CommentActor = {
  name: string | null;
  userId: string;
};

type StoredComment = CommentRecord;

export class CommentsService {
  readonly moduleName = "comments";

  private readonly commentsByDocument = new Map<string, StoredComment[]>();

  listComments(documentId: string): ListCommentsResponse {
    return {
      comments: [...(this.commentsByDocument.get(documentId) ?? [])]
    };
  }

  createComment(
    documentId: string,
    actor: CommentActor,
    role: DocumentRole,
    body: string
  ): CreateCommentResponse {
    if (!canComment(role)) {
      throw new AppError("COMMENTS_FORBIDDEN", 403, "You do not have permission to comment on this document.");
    }

    const timestamp = new Date().toISOString();
    const comment: StoredComment = {
      id: randomUUID(),
      documentId,
      authorUserId: actor.userId,
      authorName: actor.name,
      body,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const existingComments = this.commentsByDocument.get(documentId) ?? [];

    this.commentsByDocument.set(documentId, [...existingComments, comment]);

    return {
      comment
    };
  }
}
