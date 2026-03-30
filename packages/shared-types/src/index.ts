export type DocumentRole = "owner" | "editor" | "commenter" | "viewer";

export interface DocumentSummary {
  id: string;
  title: string;
  role: DocumentRole;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  googleSubject: string | null;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}
