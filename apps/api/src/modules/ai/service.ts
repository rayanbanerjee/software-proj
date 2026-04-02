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
import type { MockProviderClient } from "./mock-provider-client.js";
import type { SubmitAiRequestInput } from "./schema.js";

type AiRequestRecord = {
  action: AiAction;
  completedAt: string | null;
  context: SubmitAiRequestInput["context"];
  documentId: string;
  errorMessage: string | null;
  proposal: AiProposal | null;
  requestId: string;
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
    private readonly mockProvider: MockProviderClient
  ) {}

  private ensureAccessibleDocument(documentId: string, actor: DocumentActor) {
    this.documentsService.getDocumentMetadata(documentId, actor);
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
    const providerResult = await this.mockProvider.generate({
      action: input.action,
      prompt: input.prompt,
      sourceText: input.maskPersonalData ? maskText(sourceText) ?? "" : sourceText
    });
    const proposal: AiProposal = {
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

    this.requests.set(requestId, {
      action: input.action,
      completedAt: queuedAt,
      context: input.context,
      documentId,
      errorMessage: null,
      proposal,
      requestId,
      startedAt,
      status: "succeeded"
    });

    return {
      requestId,
      status: "succeeded",
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
}
