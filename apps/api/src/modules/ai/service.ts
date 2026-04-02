import { randomUUID } from "node:crypto";

import type { CreateAiRequest } from "./schema.js";

export interface AiRequestRecord {
  requestId: string;
  documentId: string;
  operation: "rewrite" | "summarize" | "translate" | "restructure";
  selection: {
    start: number;
    end: number;
  };
  parameters?: Record<string, string>;
  status: "pending" | "completed" | "failed";
}

export class AiService {
  readonly moduleName = "ai";

  private readonly requests = new Map<string, AiRequestRecord>();

  async createAiRequest(
    documentId: string,
    input: CreateAiRequest
  ): Promise<AiRequestRecord> {
    const requestId = `ai_${randomUUID()}`;

    const request: AiRequestRecord = {
      requestId,
      documentId,
      operation: input.operation,
      selection: input.selection,
      parameters: input.parameters,
      status: "pending"
    };

    this.requests.set(requestId, request);

    console.log("enqueue ai request", {
      requestId,
      documentId,
      operation: input.operation,
      selection: input.selection
    });

    return request;
  }

  async getAiRequest(
    documentId: string,
    requestId: string
  ): Promise<AiRequestRecord | null> {
    const request = this.requests.get(requestId);

    if (!request) {
      return null;
    }

    if (request.documentId !== documentId) {
      return null;
    }

    return request;
  }
}