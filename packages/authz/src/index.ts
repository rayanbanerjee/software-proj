import type { DocumentRole } from "@repo/shared-types";

export const roleCapabilities: Record<DocumentRole, readonly string[]> = {
  owner: ["view", "comment", "edit", "export", "ai", "share", "rollback"],
  editor: ["view", "comment", "edit", "export", "ai"],
  commenter: ["view", "comment", "export"],
  viewer: ["view"]
};

