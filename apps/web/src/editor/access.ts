import type { DocumentRecord } from "../lib/app-shell";

export function isEditorReadOnly(role: DocumentRecord["role"]): boolean {
  return role !== "owner" && role !== "editor";
}

export function getEditorModeLabel(role: DocumentRecord["role"]): "editable" | "read-only" {
  return isEditorReadOnly(role) ? "read-only" : "editable";
}
