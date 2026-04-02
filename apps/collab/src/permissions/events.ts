import type { DocumentPermissionUpdatedEvent } from "@repo/shared-types";

export function isDocumentPermissionUpdatedEvent(
  value: unknown
): value is DocumentPermissionUpdatedEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DocumentPermissionUpdatedEvent>;

  return (
    candidate.type === "document.permission.updated"
    && typeof candidate.documentId === "string"
    && typeof candidate.userId === "string"
    && (candidate.role === null
      || candidate.role === "owner"
      || candidate.role === "editor"
      || candidate.role === "commenter"
      || candidate.role === "viewer")
    && (candidate.accessLevel === "none"
      || candidate.accessLevel === "read"
      || candidate.accessLevel === "write")
    && typeof candidate.changedAt === "string"
    && typeof candidate.triggeredByUserId === "string"
  );
}
