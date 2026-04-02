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

export interface SharedMembership {
  userId: string;
  role: DocumentRole;
}

export interface InvitationSummary {
  id: string;
  documentId: string;
  inviteeEmail: string;
  role: DocumentRole;
  invitedByUserId: string;
  createdAt: IsoDateString;
  expiresAt: IsoDateString;
  acceptedAt: IsoDateString | null;
  revokedAt: IsoDateString | null;
}

export interface CreateInvitationRequest {
  email: string;
  role: DocumentRole;
}

export interface CreateInvitationResponse {
  invitation: InvitationSummary;
  acceptToken: string;
  acceptUrl: string;
}

export interface AcceptInvitationRequest {
  token: string;
}

export interface AcceptInvitationResponse {
  invitation: InvitationSummary;
  membership: SharedMembership;
  acceptedAt: IsoDateString;
}

export interface UpdateDocumentRoleRequest {
  role: DocumentRole;
}

export interface UpdateDocumentRoleResponse {
  documentId: string;
  membership: SharedMembership;
  updatedAt: IsoDateString;
}

export interface RevokeDocumentAccessResponse {
  documentId: string;
  userId: string;
  revokedAt: IsoDateString;
}

export interface AuditEventRecord {
  id: string;
  action: string;
  actorUserId: string;
  documentId: string | null;
  targetUserId: string | null;
  occurredAt: IsoDateString;
  metadata: Record<string, string | null>;
}

export type SessionConnectionStatus = "active" | "stale" | "disconnected";

export type SessionAccessLevel = "read" | "write";

export interface CollaboratorSessionSummary {
  sessionId: string;
  documentId: string;
  userId: string;
  displayName: string | null;
  role: DocumentRole;
  accessLevel: SessionAccessLevel;
  isPresent: boolean;
  lastSeenAt: IsoDateString;
  connectionStatus: SessionConnectionStatus;
}

export interface DocumentSessionState {
  documentId: string;
  joinedAt: IsoDateString;
  resumedFromSessionId: string | null;
  self: CollaboratorSessionSummary;
  collaborators: CollaboratorSessionSummary[];
}

export interface JoinDocumentSessionRequest {
  documentId: string;
  lastKnownSessionId?: string;
}

export interface JoinDocumentSessionResponse {
  session: DocumentSessionState;
  websocketUrl: string;
  token: string;
}

export interface LeaveDocumentSessionRequest {
  sessionId: string;
}

export interface LeaveDocumentSessionResponse {
  sessionId: string;
  leftAt: IsoDateString;
}

export interface DocumentSessionHeartbeat {
  sessionId: string;
  sentAt: IsoDateString;
}

export type PresenceEventType = "presence.snapshot";
export type DocumentEventType = "document.rollback";
export type CollabStatelessEventType = PresenceEventType | DocumentEventType;

export interface CollaboratorPresenceSummary {
  sessionId: string;
  documentId: string;
  userId: string;
  displayName: string | null;
  isPresent: boolean;
  lastSeenAt: IsoDateString;
  connectionStatus: SessionConnectionStatus;
}

export interface PresenceSnapshotEvent {
  type: PresenceEventType;
  documentId: string;
  generatedAt: IsoDateString;
  collaborators: CollaboratorPresenceSummary[];
}

export interface DocumentRollbackEvent {
  type: DocumentEventType;
  documentId: string;
  revisionId: string;
  rolledBackAt: IsoDateString;
  triggeredByUserId: string;
}

export type AiAction = "rewrite" | "summarize" | "translate" | "restructure";

export type AiRequestStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "stale";

export type AiSelectionScope = "document" | "selection";

export interface AiRequestContext {
  scope: AiSelectionScope;
  selectedText: string | null;
  surroundingText: string | null;
}

export interface SubmitAiRequestRequest {
  documentId: string;
  action: AiAction;
  prompt: string | null;
  context: AiRequestContext;
  maskPersonalData: boolean;
}

export interface AiProposal {
  proposalId: string;
  requestId: string;
  documentId: string;
  action: AiAction;
  originalText: string;
  proposedText: string;
  summary: string | null;
  createdAt: IsoDateString;
  isStale: boolean;
}

export interface SubmitAiRequestResponse {
  requestId: string;
  status: AiRequestStatus;
  queuedAt: IsoDateString;
}

export interface GetAiRequestStatusResponse {
  requestId: string;
  status: AiRequestStatus;
  startedAt: IsoDateString | null;
  completedAt: IsoDateString | null;
  errorMessage: string | null;
  proposal: AiProposal | null;
}

export interface AcceptAiProposalRequest {
  proposalId: string;
}

export interface AcceptAiProposalResponse {
  proposalId: string;
  appliedAt: IsoDateString;
}

export interface RejectAiProposalRequest {
  proposalId: string;
  reason?: string;
}

export interface RejectAiProposalResponse {
  proposalId: string;
  rejectedAt: IsoDateString;
}

export interface RevisionSummary {
  revisionId: string;
  documentId: string;
  label: string;
  authorUserId: string | null;
  createdAt: IsoDateString;
}

export interface RevisionDetail extends RevisionSummary {
  snapshotId: string;
  contentType: string;
}

export interface ListRevisionsResponse {
  revisions: RevisionSummary[];
}

export interface GetRevisionDetailResponse {
  revision: RevisionDetail;
}

export interface RevisionDiffResponse {
  documentId: string;
  revisionId: string;
  compareToRevisionId: string | null;
  summary: string;
  changes: Array<{
    field: "content";
    kind: "stub";
    description: string;
  }>;
}

export interface RollbackRevisionRequest {
  revisionId: string;
}

export interface RollbackRevisionResponse {
  revisionId: string;
  rolledBackAt: IsoDateString;
}

export type ExportFormat = "txt" | "pdf" | "docx";

export type ExportJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface RequestExportJobRequest {
  documentId: string;
  format: ExportFormat;
}

export interface RequestExportJobResponse {
  exportJobId: string;
  status: ExportJobStatus;
  requestedAt: IsoDateString;
}

export interface ExportJobSummary {
  exportJobId: string;
  documentId: string;
  format: ExportFormat;
  status: ExportJobStatus;
  requestedAt: IsoDateString;
  completedAt: IsoDateString | null;
  downloadUrl: string | null;
}

export interface GetExportJobStatusResponse {
  job: ExportJobSummary;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  googleSubject: string | null;
}

export interface GetCurrentUserResponse {
  user: UserProfile;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
  };
}
