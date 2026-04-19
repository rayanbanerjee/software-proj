import type {
  DocumentMetadata,
  DocumentPermissionSummary,
  DocumentSummary,
  DocumentRole
} from "@repo/shared-types";

const fixtureTimestamps = {
  archivedAt: null,
  createdAt: "2026-03-31T08:00:00.000Z",
  updatedAt: "2026-03-31T08:15:00.000Z"
} as const;

export const ownerPermissions: DocumentPermissionSummary = {
  role: "owner",
  canView: true,
  canComment: true,
  canEdit: true,
  canShare: true,
  canExport: true,
  canUseAi: true,
  canRollback: true
};

export const editorPermissions: DocumentPermissionSummary = {
  role: "editor",
  canView: true,
  canComment: true,
  canEdit: true,
  canShare: false,
  canExport: true,
  canUseAi: true,
  canRollback: false
};

export const viewerPermissions: DocumentPermissionSummary = {
  role: "viewer",
  canView: true,
  canComment: false,
  canEdit: false,
  canShare: false,
  canExport: false,
  canUseAi: false,
  canRollback: false
};

export const fixtureDocument: DocumentSummary = {
  id: "doc_demo",
  title: "Untitled document",
  role: "owner",
  updatedAt: fixtureTimestamps.updatedAt
};

export const sampleDocumentSummaries: readonly DocumentSummary[] = [
  fixtureDocument,
  {
    id: "doc_meeting_notes",
    title: "Weekly planning notes",
    role: "editor",
    updatedAt: "2026-03-31T09:45:00.000Z"
  },
  {
    id: "doc_shared_brief",
    title: "Shared product brief",
    role: "viewer",
    updatedAt: "2026-03-30T18:20:00.000Z"
  }
];

export const fixtureDocumentMetadata: DocumentMetadata = {
  id: fixtureDocument.id,
  title: fixtureDocument.title,
  createdAt: fixtureTimestamps.createdAt,
  updatedAt: fixtureTimestamps.updatedAt,
  archivedAt: fixtureTimestamps.archivedAt,
  permissions: ownerPermissions
};

export const sampleDocumentMetadata: readonly DocumentMetadata[] = [
  fixtureDocumentMetadata,
  {
    id: "doc_meeting_notes",
    title: "Weekly planning notes",
    createdAt: "2026-03-30T13:00:00.000Z",
    updatedAt: "2026-03-31T09:45:00.000Z",
    archivedAt: null,
    permissions: editorPermissions
  },
  {
    id: "doc_shared_brief",
    title: "Shared product brief",
    createdAt: "2026-03-28T10:30:00.000Z",
    updatedAt: "2026-03-30T18:20:00.000Z",
    archivedAt: null,
    permissions: viewerPermissions
  }
];

type DocumentSummaryOverrides = Partial<DocumentSummary> & { role?: DocumentRole };

type DocumentMetadataOverrides = Partial<DocumentMetadata> & {
  permissions?: Partial<DocumentPermissionSummary>;
};

export function makeDocumentSummary(overrides: DocumentSummaryOverrides = {}): DocumentSummary {
  return {
    ...fixtureDocument,
    ...overrides
  };
}

export function makeDocumentMetadata(
  overrides: DocumentMetadataOverrides = {}
): DocumentMetadata {
  return {
    ...fixtureDocumentMetadata,
    ...overrides,
    permissions: {
      ...fixtureDocumentMetadata.permissions,
      ...overrides.permissions
    }
  };
}

export function makeUserFixture(
  overrides: Partial<{
    email: string;
    id: string;
    imageUrl: string | null;
    name: string | null;
  }> = {}
) {
  return {
    email: "user@example.com",
    id: "user_123",
    imageUrl: "https://example.com/avatar.png",
    name: "User Example",
    ...overrides
  };
}
