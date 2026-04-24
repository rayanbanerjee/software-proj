import { randomUUID } from "node:crypto";
import prismaClientPkg, { type Prisma, type PrismaClient } from "@prisma/client";

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
import type { DocumentActor, DocumentsService } from "../documents/service.js";
import type { AiProviderClient } from "./provider.js";
import { buildSourceText } from "./provider.js";
import type { SubmitAiRequestInput } from "./schema.js";
import {
  buildProposalRevisionFingerprint,
  isProposalStale,
  type ProposalRevisionFingerprint
} from "./staleness.js";

const { Prisma: PrismaRuntime } = prismaClientPkg;

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

function isIgnorablePrismaLifecycleError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("Engine is not yet connected")
    || error.message.includes("Response from the Engine was empty");
}

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

function applyProposalToDocument(request: AiRequestRecord, editedText?: string | null) {
  const proposal = request.proposal;

  if (!proposal) {
    throw new AppError("AI_PROPOSAL_NOT_FOUND", 404, "AI proposal was not found for this document.");
  }

  const nextProposalText = editedText ?? proposal.proposedText;

  if (request.context.scope === "document") {
    return nextProposalText;
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
    nextProposalText,
    request.baseDocumentText.slice(selectionStart + originalText.length)
  ].join("");
}

function toJsonValue(value: object | null): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  if (value === null) {
    return PrismaRuntime.JsonNull;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toRequiredJsonValue(value: object): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toAiRequestRecord(record: {
  action: string;
  baseDocumentText: string;
  completedAt: Date | null;
  documentId: string;
  errorMessage: string | null;
  forcedCurrentFingerprint: unknown;
  maskPersonalData: boolean;
  prompt: string | null;
  proposal: unknown;
  queuedAt: Date;
  requestId: string;
  requestedByUserId: string;
  scope: string;
  selectedText: string | null;
  sourceFingerprint: unknown;
  startedAt: Date | null;
  status: string;
  surroundingText: string | null;
}): AiRequestRecord {
  return {
    action: record.action as AiAction,
    baseDocumentText: record.baseDocumentText,
    completedAt: record.completedAt?.toISOString() ?? null,
    context: {
      scope: record.scope as "document" | "selection",
      selectedText: record.selectedText,
      surroundingText: record.surroundingText
    },
    documentId: record.documentId,
    errorMessage: record.errorMessage,
    forcedCurrentFingerprint: (record.forcedCurrentFingerprint as ProposalRevisionFingerprint | null) ?? null,
    maskPersonalData: record.maskPersonalData,
    prompt: record.prompt,
    proposal: (record.proposal as AiProposal | null) ?? null,
    queuedAt: record.queuedAt.toISOString(),
    requestId: record.requestId,
    requestedByUserId: record.requestedByUserId,
    sourceFingerprint: record.sourceFingerprint as ProposalRevisionFingerprint,
    startedAt: record.startedAt?.toISOString() ?? null,
    status: record.status as GetAiRequestStatusResponse["status"]
  };
}

export class AiService {
  readonly moduleName = "ai";

  private readonly inFlightRequestIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly documentsService: DocumentsService,
    private readonly provider: AiProviderClient
  ) {
    void this.resumePendingRequests();
  }

  private async resumePendingRequests() {
    const pendingRequests = await this.prisma.aiRequest.findMany({
      where: {
        status: {
          in: ["queued", "running"]
        }
      },
      select: {
        requestId: true
      }
    });

    for (const request of pendingRequests) {
      this.scheduleRequestProcessing(request.requestId);
    }
  }

  private async ensureAccessibleDocument(documentId: string, actor: DocumentActor) {
    await this.documentsService.getDocumentMetadata(documentId, actor);
  }

  private async findRequest(documentId: string, requestId: string): Promise<AiRequestRecord> {
    const request = await this.prisma.aiRequest.findUnique({
      where: {
        requestId
      }
    });

    if (!request || request.documentId !== documentId) {
      throw new AppError("AI_REQUEST_NOT_FOUND", 404, "AI request was not found for this document.");
    }

    return toAiRequestRecord(request);
  }

  private async findRequestByProposal(documentId: string, proposalId: string) {
    const requests = await this.prisma.aiRequest.findMany({
      where: {
        documentId
      }
    });

    return requests
      .map((request) => toAiRequestRecord(request))
      .find((request) => request.proposal?.proposalId === proposalId)
      ?? null;
  }

  private async refreshStaleness(request: AiRequestRecord, actor: DocumentActor) {
    if (!request.proposal) {
      return request;
    }

    const currentFingerprint = request.forcedCurrentFingerprint
      ?? buildRequestFingerprint(
        request.documentId,
        request.context.scope,
        (await this.documentsService.getDocumentSnapshot(request.documentId, actor)).text
      );
    const stale = isProposalStale(request.sourceFingerprint, currentFingerprint);

    if (!stale || request.proposal.isStale) {
      return request;
    }

    await this.prisma.aiRequest.update({
      where: {
        requestId: request.requestId
      },
      data: {
        proposal: toJsonValue({
          ...request.proposal,
          isStale: true
        }),
        status: "stale",
        completedAt: request.completedAt ? new Date(request.completedAt) : new Date()
      }
    });

    return await this.findRequest(request.documentId, request.requestId);
  }

  private scheduleRequestProcessing(requestId: string) {
    if (this.inFlightRequestIds.has(requestId)) {
      return;
    }

    this.inFlightRequestIds.add(requestId);
    queueMicrotask(() => {
      void this.processRequest(requestId)
        .catch((error) => {
          if (!isIgnorablePrismaLifecycleError(error)) {
            throw error;
          }
        })
        .finally(() => {
          this.inFlightRequestIds.delete(requestId);
        });
    });
  }

  private async processRequest(requestId: string) {
    const request = await this.prisma.aiRequest.findUnique({
      where: {
        requestId
      }
    });

    if (!request || (request.status !== "queued" && request.status !== "running")) {
      return;
    }

    const running = await this.prisma.aiRequest.update({
      where: {
        requestId
      },
      data: {
        status: "running",
        startedAt: request.startedAt ?? new Date(),
        errorMessage: null
      }
    });
    const current = toAiRequestRecord(running);

    try {
      const sourceText = getSourceText({
        action: current.action,
        prompt: current.prompt,
        context: current.context,
        maskPersonalData: current.maskPersonalData
      });
      const providerResult = await this.provider.generate({
        action: current.action,
        prompt: current.prompt,
        sourceText: current.maskPersonalData ? maskText(sourceText) ?? "" : sourceText
      });

      const proposal: AiProposal = {
        proposalId: `proposal_${randomUUID()}`,
        requestId,
        documentId: current.documentId,
        action: current.action,
        originalText: sourceText,
        proposedText: providerResult.proposedText,
        summary: providerResult.summary,
        createdAt: current.queuedAt,
        isStale: false
      };

      await this.prisma.aiRequest.update({
        where: {
          requestId
        },
        data: {
          proposal: toJsonValue(proposal),
          status: "succeeded",
          completedAt: new Date()
        }
      });
    } catch (error) {
      await this.prisma.aiRequest.update({
        where: {
          requestId
        },
        data: {
          status: "failed",
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "AI provider request failed."
        }
      });
    }
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

      if (!proposedText.trim()) {
        const generated = await this.provider.generate({
          action: input.action,
          prompt: input.prompt,
          sourceText: buildSourceText(input.context)
        });

        yield {
          type: "completed",
          requestId,
          status: "succeeded",
          proposal: {
            ...buildStreamingProposal(input, requestId, generated.proposedText),
            summary: generated.summary
          }
        };
        return;
      }

      yield {
        type: "completed",
        requestId,
        status: "succeeded",
        proposal: buildStreamingProposal(input, requestId, proposedText)
      };
    } catch (error) {
      try {
        const generated = await this.provider.generate({
          action: input.action,
          prompt: input.prompt,
          sourceText: buildSourceText(input.context)
        });

        yield {
          type: "completed",
          requestId,
          status: "succeeded",
          proposal: {
            ...buildStreamingProposal(input, requestId, generated.proposedText),
            summary: generated.summary
          }
        };
        return;
      } catch {
        // Fall through to the original streaming error when both modes fail.
      }

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
    await this.ensureAccessibleDocument(documentId, actor);
    const snapshot = await this.documentsService.getDocumentSnapshot(documentId, actor);
    const requestId = `air_${randomUUID()}`;
    const queuedAt = new Date();
    const sourceFingerprint = buildRequestFingerprint(documentId, input.context.scope, snapshot.text);

    await this.prisma.aiRequest.create({
      data: {
        requestId,
        documentId,
        requestedByUserId: actor.userId,
        action: input.action,
        status: "queued",
        scope: input.context.scope,
        prompt: input.prompt,
        selectedText: input.context.selectedText,
        surroundingText: input.context.surroundingText,
        maskPersonalData: input.maskPersonalData,
        baseDocumentText: snapshot.text,
        sourceFingerprint: toRequiredJsonValue(sourceFingerprint),
        forcedCurrentFingerprint: PrismaRuntime.JsonNull,
        proposal: PrismaRuntime.JsonNull,
        errorMessage: null,
        queuedAt
      }
    });

    this.scheduleRequestProcessing(requestId);

    return {
      requestId,
      status: "queued",
      queuedAt: queuedAt.toISOString()
    };
  }

  async getRequestStatus(
    documentId: string,
    requestId: string,
    actor: DocumentActor
  ): Promise<GetAiRequestStatusResponse> {
    await this.ensureAccessibleDocument(documentId, actor);
    const request = await this.refreshStaleness(await this.findRequest(documentId, requestId), actor);

    return {
      requestId: request.requestId,
      status: request.status,
      startedAt: request.startedAt,
      completedAt: request.completedAt,
      errorMessage: request.errorMessage,
      proposal: request.proposal
    };
  }

  async acceptProposal(
    documentId: string,
    proposalId: string,
    actor: DocumentActor,
    editedText?: string
  ): Promise<AcceptAiProposalResponse> {
    await this.ensureAccessibleDocument(documentId, actor);
    const request = await this.findRequestByProposal(documentId, proposalId);

    if (!request || !request.proposal) {
      throw new AppError("AI_PROPOSAL_NOT_FOUND", 404, "AI proposal was not found for this document.");
    }

    const refreshed = await this.refreshStaleness(request, actor);

    if (!refreshed.proposal) {
      throw new AppError("AI_PROPOSAL_NOT_FOUND", 404, "AI proposal was not found for this document.");
    }

    if (refreshed.proposal.isStale) {
      throw new AppError("AI_PROPOSAL_STALE", 409, "AI proposal is stale and cannot be applied.");
    }

    const nextText = applyProposalToDocument(refreshed, editedText?.trim() ?? undefined);
    await this.documentsService.updateDocumentContent(documentId, nextText, actor);
    const appliedAt = new Date();

    await this.prisma.aiRequest.update({
      where: {
        requestId: refreshed.requestId
      },
      data: {
        baseDocumentText: nextText,
        forcedCurrentFingerprint: toJsonValue(
          buildRequestFingerprint(documentId, refreshed.context.scope, nextText)
        ),
        proposal: PrismaRuntime.JsonNull,
        completedAt: appliedAt
      }
    });

    return {
      proposalId,
      appliedAt: appliedAt.toISOString()
    };
  }

  async rejectProposal(
    documentId: string,
    proposalId: string,
    actor: DocumentActor
  ): Promise<RejectAiProposalResponse> {
    await this.ensureAccessibleDocument(documentId, actor);
    const request = await this.findRequestByProposal(documentId, proposalId);

    if (!request || !request.proposal) {
      throw new AppError("AI_PROPOSAL_NOT_FOUND", 404, "AI proposal was not found for this document.");
    }

    const rejectedAt = new Date();

    await this.prisma.aiRequest.update({
      where: {
        requestId: request.requestId
      },
      data: {
        status: "cancelled",
        proposal: PrismaRuntime.JsonNull,
        completedAt: rejectedAt
      }
    });

    return {
      proposalId,
      rejectedAt: rejectedAt.toISOString()
    };
  }

  async markRequestStaleForTest(
    requestId: string,
    nextState: {
      scope?: "document" | "selection";
      sourceText: string;
    }
  ) {
    const request = await this.prisma.aiRequest.findUnique({
      where: {
        requestId
      }
    });

    if (!request) {
      throw new AppError("AI_REQUEST_NOT_FOUND", 404, "AI request was not found for this document.");
    }

    await this.prisma.aiRequest.update({
      where: {
        requestId
      },
      data: {
        forcedCurrentFingerprint: toJsonValue(
          buildProposalRevisionFingerprint({
            documentId: request.documentId,
            scope: nextState.scope ?? (request.scope as "document" | "selection"),
            sourceText: nextState.sourceText
          })
        )
      }
    });
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
