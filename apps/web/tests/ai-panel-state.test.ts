import { describe, expect, it } from "vitest";

import { createAiPanelState } from "../src/lib/ai-panel-state";

describe("ai panel state model", () => {
  it("returns an idle state when no request is active", () => {
    expect(createAiPanelState()).toEqual({
      actionsEnabled: true,
      ctaLabel: "Run AI action",
      status: "idle",
      summary: "Choose an AI action to generate a proposal for the current document."
    });
  });

  it("returns a proposal-ready state when a succeeded request includes a proposal", () => {
    expect(
      createAiPanelState("succeeded", {
        proposalId: "proposal-1",
        requestId: "air-1",
        documentId: "doc-1",
        action: "rewrite",
        originalText: "Original text",
        proposedText: "Rewritten text",
        summary: "Proposal ready for review.",
        createdAt: "2026-04-02T18:00:00.000Z",
        isStale: false
      })
    ).toMatchObject({
      actionsEnabled: true,
      ctaLabel: "Review proposal",
      status: "proposal-ready",
      summary: "Proposal ready for review."
    });
  });

  it("returns a retryable state for failed or stale requests", () => {
    expect(createAiPanelState("failed")).toEqual({
      actionsEnabled: true,
      ctaLabel: "Retry AI action",
      status: "failed",
      summary: "The previous AI attempt did not produce an active proposal."
    });
  });
});
