import { randomUUID } from "node:crypto";

import type {
  AcceptAiProposalResponse,
  AiAction,
  AiProposal,
  AiStreamEvent,
  GetAiRequestStatusResponse,
  RejectAiProposalResponse,
  StreamAiRequestRequest,
  SubmitAiRequestResponse
} from "@repo/shared-types";

import { AppError } from "../../common/errors.js";
import { readJsonFile, resolveDataPath, writeJsonFile } from "../../common/file-store.js";
import type { DocumentActor, DocumentsService } from "../documents/service.js";
import type { AiProviderClient } from "./provider.js";
import { buildSourceText } from "./provider.js";
import type { SubmitAiRequestInput } from "./schema.js";
import {
  buildProposalRevisionFingerprint,
  isProposalStale,
  type ProposalRevisionFingerprint
} from "./staleness.js";

type AiRequestRecord = {
  action: AiAction;
  baseDocumentText: string;
  completedAt: string | null;
  context: SubmitAiRequestInput["context"];
  documentId: string;
  errorMessage: string | null;
  forcedCurrentFingerprint: ProposalRevisionFingerprint | null;
  maskPersonalData: boolean;
  prompt: string | null;
  proposal: AiProposal | null;
  queuedAt: string;
  requestId: string;
  requestedByUserId: string;
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
    ?? "Document-wide request";
}

function buildRequestFingerprint(
  documentId: string,
  scope: "document" | "selection",
  documentText: string
) {
  return buildProposalRevisionFingerprint({
    documentId,
    scope,
    sourceText: documentText
  });
}

function applyProposalToDocument(request: AiRequestRecord) {
  const proposal = request.proposal;

  if (!proposal) {
    throw new AppError("AI_PROPOSAL_NOT_FOUND", 404, "AI proposal was not found for this document.");
  }

  if (request.context.scope === "document") {
    return proposal.proposedText;
  }

  const originalText = proposal.originalText;

  if (!originalText) {
    return `${request.baseDocumentText}${proposal.proposedText}`;
  }

  const selectionStart = request.baseDocumentText.indexOf(originalText);

  if (selectionStart === -1) {
    throw new AppError(
      "AI_PROPOSAL_APPLY_FAILED",
      409,
      "AI proposal can no longer be applied to the current document snapshot."
    );
  }

  return [
    request.baseDocumentText.slice(0, selectionStart),
    proposal.proposedText,
    request.baseDocumentText.slice(selectionStart + originalText.length)
  ].join("");
}

export class AiService {
  readonly moduleName = "ai";

  private readonly requests = new Map<string, AiRequestRecord>();
  private readonly inFlightRequestIds = new Set<string>();
  private readonly storagePath: string;

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly provider: AiProviderClient,
    dataDir: string
  ) {
    this.storagePath = resolveDataPath(dataDir, "ai", "requests.json");

    const storedRequests = readJsonFile<AiRequestRecord[]>(this.storagePath, []);

    for (const request of storedRequests) {
      this.requests.set(request.requestId, request);
    }

    for (const request of storedRequests) {
      if (request.status === "queued" || request.status === "running") {
        this.scheduleRequestProcessing(request.requestId);
      }
    }
  }

  private ensureAccessibleDocument(documentId: string, actor: DocumentActor) {
    this.documentsService.getDocumentMetadata(documentId, actor);
  }

  private persistRequests() {
    writeJsonFile(this.storagePath, Array.from(this.requests.values()));
  }

  private findRequestByProposal(documentId: string, proposalId: string) {
    return Array.from(this.requests.values()).find(
      (entry) => entry.documentId === documentId && entry.proposal?.proposalId === proposalId
    );
  }

  private refreshStaleness(request: AiRequestRecord, actor: DocumentActor) {
    if (!request.proposal) {
      return;
    }

    const currentFingerprint = request.forcedCurrentFingerprint
      ?? buildRequestFingerprint(
        request.documentId,
        request.context.scope,
        this.documentsService.getDocumentSnapshot(request.documentId, actor).text
      );
    const stale = isProposalStale(request.sourceFingerprint, currentFingerprint);
    request.proposal.isStale = stale;

    if (stale) {
      request.status = "stale";
      request.completedAt ??= new Date().toISOString();
      this.persistRequests();
    }
  }

  private scheduleRequestProcessing(requestId: string) {
    if (this.inFlightRequestIds.has(requestId)) {
      return;
    }

    this.inFlightRequestIds.add(requestId);
    queueMicrotask(() => {
      void this.processRequest(requestId).finally(() => {
        this.inFlightRequestIds.delete(requestId);
      });
    });
  }

  private async processRequest(requestId: string) {
    const request = this.requests.get(requestId);

    if (!request || (request.status !== "queued" && request.status !== "running")) {
      return;
    }

    request.status = "running";
    request.startedAt ??= new Date().toISOString();
    request.errorMessage = null;
    this.persistRequests();

    try {
      const sourceText = getSourceText({
        action: request.action,
        prompt: request.prompt,
        context: request.context,
        maskPersonalData: request.maskPersonalData
      });
      const providerResult = await this.provider.generate({
        action: request.action,
        prompt: request.prompt,
        sourceText: request.maskPersonalData ? maskText(sourceText) ?? "" : sourceText
      });

      request.proposal = {
        proposalId: `proposal_${randomUUID()}`,
        requestId,
        documentId: request.documentId,
        action: request.action,
        originalText: sourceText,
        proposedText: providerResult.proposedText,
        summary: providerResult.summary,
        createdAt: request.queuedAt,
        isStale: false
      };
      request.status = "succeeded";
      request.completedAt = new Date().toISOString();
    } catch (error) {
      request.status = "failed";
      request.completedAt = new Date().toISOString();
      request.errorMessage = error instanceof Error ? error.message : "AI provider request failed.";
    }

    this.persistRequests();
  }

  async *streamProposal(
    input: StreamAiRequestRequest & { documentId: string }
  ): AsyncGenerator<AiStreamEvent> {
    const requestId = `ai_${randomUUID()}`;

    yield {
      type: "started",
      requestId,
      status: "running"
    };

    if (!this.provider.streamText) {
      const generated = await this.provider.generate({
        action: input.action,
        prompt: input.prompt,
        sourceText: buildSourceText(input.context)
      });
      const proposal = buildStreamingProposal(input, requestId, generated.proposedText);

      yield {
        type: "completed",
        requestId,
        status: "succeeded",
        proposal: {
          ...proposal,
          summary: generated.summary
        }
      };
      return;
    }

    let proposedText = "";

    try {
      for await (const delta of this.provider.streamText(input)) {
        proposedText += delta;
        yield {
          type: "delta",
          requestId,
          delta,
          text: proposedText
        };
      }

      yield {
        type: "completed",
        requestId,
        status: "succeeded",
        proposal: buildStreamingProposal(input, requestId, proposedText)
      };
    } catch (error) {
      yield {
        type: "error",
        requestId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "AI streaming failed."
      };
    }
  }

  async submitRequest(
    documentId: string,
    input: SubmitAiRequestInput,
    actor: DocumentActor
  ): Promise<SubmitAiRequestResponse> {
    this.ensureAccessibleDocument(documentId, actor);
    const snapshot = this.documentsService.getDocumentSnapshot(documentId, actor);
    const requestId = `air_${randomUUID()}`;
    const queuedAt = new Date().toISOString();
    const sourceFingerprint = buildRequestFingerprint(documentId, input.context.scope, snapshot.text);
    const request: AiRequestRecord = {
      action: input.action,
      baseDocumentText: snapshot.text,
      completedAt: null,
      context: input.context,
      documentId,
      errorMessage: null,
      forcedCurrentFingerprint: null,
      maskPersonalData: input.maskPersonalData,
      prompt: input.prompt,
      proposal: null,
      queuedAt,
      requestId,
      requestedByUserId: actor.userId,
      sourceFingerprint,
      startedAt: null,
      status: "queued"
    };
    this.requests.set(requestId, request);
    this.persistRequests();
    this.scheduleRequestProcessing(requestId);

    return {
      requestId,
      status: "queued",
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

    this.refreshStaleness(request, actor);

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
    const request = this.findRequestByProposal(documentId, proposalId);

    if (!request || !request.proposal) {
      throw new AppError("AI_PROPOSAL_NOT_FOUND", 404, "AI proposal was not found for this document.");
    }

    this.refreshStaleness(request, actor);

    if (request.proposal.isStale) {
      throw new AppError("AI_PROPOSAL_STALE", 409, "AI proposal is stale and cannot be applied.");
    }

    const nextText = applyProposalToDocument(request);
    this.documentsService.updateDocumentContent(documentId, nextText, actor);
    const appliedAt = new Date().toISOString();
    request.baseDocumentText = nextText;
    request.forcedCurrentFingerprint = buildRequestFingerprint(
      documentId,
      request.context.scope,
      nextText
    );
    request.completedAt = appliedAt;
    request.proposal = null;
    this.persistRequests();

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
    const request = this.findRequestByProposal(documentId, proposalId);

    if (!request || !request.proposal) {
      throw new AppError("AI_PROPOSAL_NOT_FOUND", 404, "AI proposal was not found for this document.");
    }

    request.status = "cancelled";
    request.proposal = null;
    const rejectedAt = new Date().toISOString();
    request.completedAt = rejectedAt;
    this.persistRequests();

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

    request.forcedCurrentFingerprint = buildProposalRevisionFingerprint({
      documentId: request.documentId,
      scope: nextState.scope ?? request.context.scope,
      sourceText: nextState.sourceText
    });
    this.refreshStaleness(request, {
      userId: request.requestedByUserId,
      name: null
    });
    this.persistRequests();
  }
}

function buildStreamingProposal(
  input: StreamAiRequestRequest & { documentId: string },
  requestId: string,
  proposedText: string
): AiProposal {
  const originalText = buildSourceText(input.context);

  return {
    proposalId: `proposal_${randomUUID()}`,
    requestId,
    documentId: input.documentId,
    action: input.action,
    originalText,
    proposedText: proposedText.trim(),
    summary: summarizeProposal(input.action, proposedText),
    createdAt: new Date().toISOString(),
    isStale: false
  };
}

function summarizeProposal(action: AiAction, proposedText: string) {
  const firstLine = proposedText.trim().split("\n")[0]?.trim() ?? "";
  return `${action}: ${firstLine.slice(0, 80)}`.trim();
}
