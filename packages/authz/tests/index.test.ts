import { describe, expect, it } from "vitest";

import {
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
});
