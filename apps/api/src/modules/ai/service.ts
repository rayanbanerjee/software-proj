import { randomUUID } from "node:crypto";

import type {
  AcceptAiProposalResponse,
  AiAction,
  AiProposal,
  GetAiRequestStatusResponse,
  RejectAiProposalResponse,
  SubmitAiRequestResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";
import type { DocumentActor, DocumentsService } from "../documents/service.js";
import type { AiProviderClient } from "./provider.js";
import type { SubmitAiRequestInput } from "./schema.js";
import {
  buildProposalRevisionFingerprint,
  isProposalStale,
  type ProposalRevisionFingerprint
} from "./staleness.js";

type AiRequestRecord = {
  action: AiAction;
  completedAt: string | null;
  context: SubmitAiRequestInput["context"];
  currentFingerprint: ProposalRevisionFingerprint;
  documentId: string;
  errorMessage: string | null;
  proposal: AiProposal | null;
  requestId: string;
  sourceFingerprint: ProposalRevisionFingerprint;
  startedAt: string | null;
  status: GetAiRequestStatusResponse["status"];
};

function maskText(value: string | null): string | null {
  if (!value) {
    return value;
  }

  return value.replace(/[A-Za-z0-9]/g, "x");
}

function getSourceText(input: SubmitAiRequestInput): string {
  return input.context.selectedText
    ?? input.context.surroundingText
    ?? "Document-wide request placeholder";
}

export class AiService {
  readonly moduleName = "ai";

  private readonly requests = new Map<string, AiRequestRecord>();

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly provider: AiProviderClient
  ) {}

  private ensureAccessibleDocument(documentId: string, actor: DocumentActor) {
    this.documentsService.getDocumentMetadata(documentId, actor);
  }

  private refreshStaleness(request: AiRequestRecord) {
    if (!request.proposal) {
      return;
    }

    const stale = isProposalStale(request.sourceFingerprint, request.currentFingerprint);
    request.proposal.isStale = stale;

    if (stale) {
      request.status = "stale";
      request.completedAt ??= new Date().toISOString();
    }
  }

  async submitRequest(
    documentId: string,
    input: SubmitAiRequestInput,
    actor: DocumentActor
  ): Promise<SubmitAiRequestResponse> {
    this.ensureAccessibleDocument(documentId, actor);
    const requestId = `air_${randomUUID()}`;
    const queuedAt = new Date().toISOString();
    const startedAt = queuedAt;
    const sourceText = getSourceText(input);
    const sourceFingerprint = buildProposalRevisionFingerprint({
      documentId,
      scope: input.context.scope,
      sourceText
    });
    const request: AiRequestRecord = {
      action: input.action,
      completedAt: null,
      context: input.context,
      currentFingerprint: sourceFingerprint,
      documentId,
      errorMessage: null,
      proposal: null,
      requestId,
      sourceFingerprint,
      startedAt,
      status: "running"
    };
    this.requests.set(requestId, request);

    try {
      const providerResult = await this.provider.generate({
        action: input.action,
        prompt: input.prompt,
        sourceText: input.maskPersonalData ? maskText(sourceText) ?? "" : sourceText
      });

      request.proposal = {
        proposalId: `proposal_${randomUUID()}`,
        requestId,
        documentId,
        action: input.action,
        originalText: sourceText,
        proposedText: providerResult.proposedText,
        summary: providerResult.summary,
        createdAt: queuedAt,
        isStale: false
      };
      request.status = "succeeded";
      request.completedAt = new Date().toISOString();
    } catch (error) {
      request.status = "failed";
      request.completedAt = new Date().toISOString();
      request.errorMessage = error instanceof Error ? error.message : "AI provider request failed.";
    }

    return {
      requestId,
      status: request.status,
      queuedAt
    };
  }

  getRequestStatus(
    documentId: string,
    requestId: string,
    actor: DocumentActor
  ): GetAiRequestStatusResponse {
    this.ensureAccessibleDocument(documentId, actor);
    const request = this.requests.get(requestId);

    if (!request || request.documentId !== documentId) {
      throw new AppError("AI_REQUEST_NOT_FOUND", 404, "AI request was not found for this document.");
    }

    this.refreshStaleness(request);

    return {
      requestId: request.requestId,
      status: request.status,
      startedAt: request.startedAt,
      completedAt: request.completedAt,
      errorMessage: request.errorMessage,
      proposal: request.proposal
    };
  }

  acceptProposal(
    documentId: string,
    proposalId: string,
    actor: DocumentActor
  ): AcceptAiProposalResponse {
    this.ensureAccessibleDocument(documentId, actor);
    const request = Array.from(this.requests.values()).find(
      (entry) => entry.documentId === documentId && entry.proposal?.proposalId === proposalId
    );

    if (!request || !request.proposal) {
      throw new AppError("AI_PROPOSAL_NOT_FOUND", 404, "AI proposal was not found for this document.");
    }

    this.refreshStaleness(request);

    if (request.proposal.isStale) {
      throw new AppError("AI_PROPOSAL_STALE", 409, "AI proposal is stale and cannot be applied.");
    }

    const appliedAt = new Date().toISOString();
    request.completedAt = appliedAt;

    return {
      proposalId,
      appliedAt
    };
  }

  rejectProposal(
    documentId: string,
    proposalId: string,
    actor: DocumentActor
  ): RejectAiProposalResponse {
    this.ensureAccessibleDocument(documentId, actor);
    const request = Array.from(this.requests.values()).find(
      (entry) => entry.documentId === documentId && entry.proposal?.proposalId === proposalId
    );

    if (!request || !request.proposal) {
      throw new AppError("AI_PROPOSAL_NOT_FOUND", 404, "AI proposal was not found for this document.");
    }

    request.status = "cancelled";
    request.proposal = null;
    const rejectedAt = new Date().toISOString();
    request.completedAt = rejectedAt;

    return {
      proposalId,
      rejectedAt
    };
  }

  markRequestStaleForTest(
    requestId: string,
    nextState: {
      scope?: "document" | "selection";
      sourceText: string;
    }
  ) {
    const request = this.requests.get(requestId);

    if (!request) {
      throw new AppError("AI_REQUEST_NOT_FOUND", 404, "AI request was not found for this document.");
    }

    request.currentFingerprint = buildProposalRevisionFingerprint({
      documentId: request.documentId,
      scope: nextState.scope ?? request.context.scope,
      sourceText: nextState.sourceText
    });
    this.refreshStaleness(request);
  }
}
