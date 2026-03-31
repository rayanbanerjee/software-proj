export type DocumentRole = "owner" | "editor" | "commenter" | "viewer";

export type IsoDateString = string;

export interface DocumentSummary {
  id: string;
  title: string;
  role: DocumentRole;
  updatedAt: IsoDateString;
}

export interface DocumentPermissionSummary {
  role: DocumentRole;
  canView: boolean;
  canComment: boolean;
  canEdit: boolean;
  canShare: boolean;
  canExport: boolean;
  canUseAi: boolean;
  canRollback: boolean;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  archivedAt: IsoDateString | null;
  permissions: DocumentPermissionSummary;
}

export interface CreateDocumentRequest {
  title: string;
}

export interface CreateDocumentResponse {
  document: DocumentMetadata;
}

export interface ListDocumentsResponse {
  documents: DocumentSummary[];
}

export interface GetDocumentMetadataResponse {
  document: DocumentMetadata;
}

export interface RenameDocumentRequest {
  title: string;
}

export interface RenameDocumentResponse {
  document: DocumentMetadata;
}

export interface ArchiveDocumentResponse {
  documentId: string;
  archivedAt: IsoDateString;
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
