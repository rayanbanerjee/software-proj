import { describe, expect, it } from "vitest";

import {
  canManageRoleChange,
  canRevokeAccess,
  canEdit,
  canShare,
  canView,
  documentPermissionList,
  documentPermissions,
  hasPermission,
  roleCapabilities
} from "../src/index";

describe("authz permission model", () => {
  it("exports the centralized document permission list", () => {
    expect(documentPermissionList).toEqual([
      "view",
      "comment",
      "edit",
      "export",
      "ai",
      "share",
      "rollback"
    ]);
  });

  it("keeps role capabilities aligned with permission constants", () => {
    expect(roleCapabilities.owner).toContain(documentPermissions.share);
    expect(roleCapabilities.viewer).toEqual([documentPermissions.view]);
  });

  it("checks generic permissions by role", () => {
    expect(hasPermission("editor", documentPermissions.edit)).toBe(true);
    expect(hasPermission("commenter", documentPermissions.edit)).toBe(false);
    expect(hasPermission("owner", documentPermissions.rollback)).toBe(true);
  });

  it("exposes focused helpers for common UI checks", () => {
    expect(canView("viewer")).toBe(true);
    expect(canEdit("editor")).toBe(true);
    expect(canEdit("commenter")).toBe(false);
    expect(canShare("owner")).toBe(true);
    expect(canShare("editor")).toBe(false);
  });

  it("enforces owner-only role changes and access revocation", () => {
    expect(canManageRoleChange("owner", "editor")).toBe(true);
    expect(canManageRoleChange("editor", "viewer")).toBe(false);
    expect(canManageRoleChange("owner", "owner")).toBe(false);
    expect(canRevokeAccess("owner", "commenter")).toBe(true);
    expect(canRevokeAccess("commenter", "viewer")).toBe(false);
  });
});
