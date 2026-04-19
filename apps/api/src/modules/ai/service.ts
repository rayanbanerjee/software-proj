import { randomUUID } from "node:crypto";

import type { AiProposal, AiStreamEvent, StreamAiRequestRequest } from "@repo/shared-types";

import { OpenRouterStreamingProvider } from "./openrouter-provider.js";
import type { AiStreamingProvider } from "./provider.js";
import { buildSourceText } from "./provider.js";
import { StubStreamingProvider } from "./stub-streaming-provider.js";

interface AiServiceConfig {
  llmApiKey?: string;
  openRouterApiKey?: string;
  openRouterAppName?: string;
  openRouterAppUrl?: string;
  openRouterBaseUrl: string;
  openRouterModel: string;
}

interface StreamAiProposalInput extends StreamAiRequestRequest {
  documentId: string;
}

export class AiService {
  readonly moduleName = "ai";

  private readonly provider: AiStreamingProvider;

  constructor(config: AiServiceConfig) {
    const apiKey = config.openRouterApiKey || config.llmApiKey;

    this.provider = apiKey
      ? new OpenRouterStreamingProvider({
          apiKey,
          appName: config.openRouterAppName,
          appUrl: config.openRouterAppUrl,
          baseUrl: config.openRouterBaseUrl,
          model: config.openRouterModel
        })
      : new StubStreamingProvider();
  }

  async *streamProposal(input: StreamAiProposalInput): AsyncGenerator<AiStreamEvent> {
    const requestId = `ai_${randomUUID()}`;
    const startedEvent: AiStreamEvent = {
      type: "started",
      requestId,
      status: "running"
    };

    yield startedEvent;

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

      const proposal = buildProposal({
        ...input,
        proposedText,
        requestId
      });

      yield {
        type: "completed",
        requestId,
        status: "succeeded",
        proposal
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
}

function buildProposal(input: StreamAiProposalInput & { proposedText: string; requestId: string }): AiProposal {
  const originalText = buildSourceText(input.context);

  return {
    proposalId: `proposal_${randomUUID()}`,
    requestId: input.requestId,
    documentId: input.documentId,
    action: input.action,
    originalText,
    proposedText: input.proposedText.trim(),
    summary: summarizeProposal(input.action, input.proposedText),
    createdAt: new Date().toISOString(),
    isStale: false
  };
}

function summarizeProposal(action: StreamAiProposalInput["action"], proposedText: string) {
  const firstLine = proposedText.trim().split("\n")[0]?.trim() ?? "";
  return `${action}: ${firstLine.slice(0, 80)}`.trim();
}
