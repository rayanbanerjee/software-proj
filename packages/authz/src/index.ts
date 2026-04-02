import type { DocumentRole } from "@repo/shared-types";

export const documentPermissions = {
  view: "view",
  comment: "comment",
  edit: "edit",
  export: "export",
  ai: "ai",
  share: "share",
  rollback: "rollback"
} as const;

export const documentPermissionList = Object.freeze(
  Object.values(documentPermissions)
) satisfies readonly string[];

export type DocumentPermission = (typeof documentPermissions)[keyof typeof documentPermissions];

export const roleCapabilities: Record<DocumentRole, readonly DocumentPermission[]> = {
  owner: [
    documentPermissions.view,
    documentPermissions.comment,
    documentPermissions.edit,
    documentPermissions.export,
    documentPermissions.ai,
    documentPermissions.share,
    documentPermissions.rollback
  ],
  editor: [
    documentPermissions.view,
    documentPermissions.comment,
    documentPermissions.edit,
    documentPermissions.export,
    documentPermissions.ai
  ],
  commenter: [documentPermissions.view, documentPermissions.comment, documentPermissions.export],
  viewer: [documentPermissions.view]
};

export function hasPermission(role: DocumentRole, permission: DocumentPermission): boolean {
  return roleCapabilities[role].includes(permission);
}

export function canView(role: DocumentRole): boolean {
  return hasPermission(role, documentPermissions.view);
}

export function canEdit(role: DocumentRole): boolean {
  return hasPermission(role, documentPermissions.edit);
}

export function canShare(role: DocumentRole): boolean {
  return hasPermission(role, documentPermissions.share);
}

export function canComment(role: DocumentRole): boolean {
  return hasPermission(role, documentPermissions.comment);
}

export function canExport(role: DocumentRole): boolean {
  return hasPermission(role, documentPermissions.export);
}

export function canUseAi(role: DocumentRole): boolean {
  return hasPermission(role, documentPermissions.ai);
}

export function canRollback(role: DocumentRole): boolean {
  return hasPermission(role, documentPermissions.rollback);
}

export function canManageRoleChange(actorRole: DocumentRole, targetRole: DocumentRole): boolean {
  return actorRole === "owner" && targetRole !== "owner";
}

export function canRevokeAccess(actorRole: DocumentRole, targetRole: DocumentRole): boolean {
  return actorRole === "owner" && targetRole !== "owner";
}
