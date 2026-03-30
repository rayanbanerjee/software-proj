export type DocumentRole = "owner" | "editor" | "commenter" | "viewer";

export interface DocumentSummary {
  id: string;
  title: string;
  role: DocumentRole;
}

