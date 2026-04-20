import type {
  CommentRecord,
  CreateCommentResponse,
  CreateDocumentResponse,
  DocumentMetadata,
  DocumentSummary,
  GetDocumentMetadataResponse,
  ListCommentsResponse,
  ListDocumentsResponse,
  RenameDocumentResponse
} from "@repo/shared-types";

import { getDocumentRecord, type DocumentRecord } from "./app-shell";

export type WorkspaceDocumentsState = {
  authRequired: boolean;
  documents: DocumentRecord[];
};

export type WorkspaceDocumentRecordState = {
  authRequired: boolean;
  document: DocumentRecord;
  isMissing: boolean;
};

function formatRelativeTimestamp(isoDate: string, now: Date) {
  const timestamp = Date.parse(isoDate);

  if (Number.isNaN(timestamp)) {
    return "Updated recently";
  }

  const diffMs = Math.max(0, now.getTime() - timestamp);
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "Updated just now";
  }

  if (diffMinutes < 60) {
    return `Updated ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `Updated ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `Updated ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function createDocumentSummaryCopy(role: DocumentSummary["role"]) {
  switch (role) {
    case "owner":
      return "Owned document available for active drafting and collaboration.";
    case "editor":
      return "Editable document shared into the current workspace.";
    case "commenter":
      return "Shared review document available in comment-oriented mode.";
    case "viewer":
      return "Read-only document available for reference and handoff.";
  }
}

function createDocumentParagraphs(document: { title: string; role: DocumentSummary["role"] }) {
  return [
    `${document.title} is now loaded from the API-backed workspace instead of the old seeded shell data.`,
    `Your current role is ${document.role}, so the workspace can align editing and collaboration controls with the real document permissions.`
  ];
}

function mapSummaryToRecord(document: DocumentSummary, now: Date): DocumentRecord {
  return {
    id: document.id,
    title: document.title,
    role: document.role,
    updatedLabel: formatRelativeTimestamp(document.updatedAt, now),
    collaborators: 0,
    summary: createDocumentSummaryCopy(document.role),
    paragraphs: createDocumentParagraphs(document)
  };
}

function mapMetadataToRecord(document: DocumentMetadata, now: Date): DocumentRecord {
  return {
    id: document.id,
    title: document.title,
    role: document.permissions.role,
    updatedLabel: formatRelativeTimestamp(document.updatedAt, now),
    collaborators: 0,
    summary: createDocumentSummaryCopy(document.permissions.role),
    paragraphs: createDocumentParagraphs({
      title: document.title,
      role: document.permissions.role
    })
  };
}

export async function createWorkspaceDocument(
  title: string,
  options: {
    apiBaseUrl?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<DocumentRecord> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${apiBaseUrl}/v1/documents`, {
    body: JSON.stringify({ title }),
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error?.message ?? "Failed to create document.");
  }

  const payload = await response.json() as CreateDocumentResponse;
  return mapMetadataToRecord(payload.document, new Date());
}

export async function archiveWorkspaceDocument(
  documentId: string,
  options: {
    apiBaseUrl?: string;
    fetchImpl?: typeof fetch;
  } = {}
) {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${apiBaseUrl}/v1/documents/${documentId}`, {
    credentials: "include",
    method: "DELETE"
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error?.message ?? "Failed to delete document.");
  }
}

export async function renameWorkspaceDocument(
  documentId: string,
  title: string,
  options: {
    apiBaseUrl?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<DocumentRecord> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${apiBaseUrl}/v1/documents/${documentId}`, {
    body: JSON.stringify({ title }),
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    method: "PATCH"
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error?.message ?? "Failed to rename document.");
  }

  const payload = await response.json() as RenameDocumentResponse;
  return mapMetadataToRecord(payload.document, new Date());
}

export async function listDocumentComments(
  documentId: string,
  options: {
    apiBaseUrl?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<CommentRecord[]> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${apiBaseUrl}/v1/documents/${documentId}/comments`, {
    credentials: "include"
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error?.message ?? "Failed to load comments.");
  }

  const payload = await response.json() as ListCommentsResponse;
  return payload.comments;
}

export async function createDocumentComment(
  documentId: string,
  body: string,
  options: {
    apiBaseUrl?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<CommentRecord> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(`${apiBaseUrl}/v1/documents/${documentId}/comments`, {
    body: JSON.stringify({ body }),
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    throw new Error(errorPayload?.error?.message ?? "Failed to add comment.");
  }

  const payload = await response.json() as CreateCommentResponse;
  return payload.comment;
}

export async function getWorkspaceDocumentsState(
  options: {
    apiBaseUrl?: string;
    cookieHeader?: string | null;
    fetchImpl?: typeof fetch;
    now?: Date;
  } = {}
): Promise<WorkspaceDocumentsState> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date();

  try {
    const response = await fetchImpl(`${apiBaseUrl}/v1/documents`, {
      cache: "no-store",
      headers: options.cookieHeader
        ? {
            cookie: options.cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      return {
        authRequired: response.status === 401,
        documents: []
      };
    }

    const payload = (await response.json()) as ListDocumentsResponse;

    if (!Array.isArray(payload.documents) || payload.documents.length === 0) {
      return {
        authRequired: false,
        documents: []
      };
    }

    return {
      authRequired: false,
      documents: payload.documents.map((document) => mapSummaryToRecord(document, now))
    };
  } catch {
    return {
      authRequired: false,
      documents: []
    };
  }
}

export async function getWorkspaceDocuments(
  options: {
    apiBaseUrl?: string;
    cookieHeader?: string | null;
    fetchImpl?: typeof fetch;
    now?: Date;
  } = {}
): Promise<DocumentRecord[]> {
  const result = await getWorkspaceDocumentsState(options);
  return result.documents;
}

export async function getWorkspaceDocumentRecord(
  documentId: string,
  options: {
    apiBaseUrl?: string;
    cookieHeader?: string | null;
    fetchImpl?: typeof fetch;
    now?: Date;
  } = {}
): Promise<WorkspaceDocumentRecordState> {
  const apiBaseUrl = options.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? new Date();

  try {
    const response = await fetchImpl(`${apiBaseUrl}/v1/documents/${documentId}`, {
      cache: "no-store",
      headers: options.cookieHeader
        ? {
            cookie: options.cookieHeader
          }
        : undefined
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          authRequired: true,
          document: getDocumentRecord(documentId),
          isMissing: true
        };
      }

      return {
        authRequired: false,
        document: getDocumentRecord(documentId),
        isMissing: true
      };
    }

    const payload = (await response.json()) as GetDocumentMetadataResponse;
    return {
      authRequired: false,
      document: mapMetadataToRecord(payload.document, now),
      isMissing: false
    };
  } catch {
    return {
      authRequired: false,
      document: getDocumentRecord(documentId),
      isMissing: true
    };
  }
}
