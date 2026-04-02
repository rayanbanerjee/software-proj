import type { AiProposal, AiRequestStatus } from "@repo/shared-types";

export type AiPanelState =
  | {
      actionsEnabled: true;
      ctaLabel: "Run AI action";
      status: "idle";
      summary: string;
    }
  | {
      actionsEnabled: false;
      ctaLabel: "Generating";
      status: "running" | "queued";
      summary: string;
    }
  | {
      actionsEnabled: true;
      ctaLabel: "Review proposal";
      proposal: AiProposal;
      status: "proposal-ready";
      summary: string;
    }
  | {
      actionsEnabled: true;
      ctaLabel: "Retry AI action";
      status: "failed" | "cancelled" | "stale";
      summary: string;
    };

export function createAiPanelState(
  requestStatus?: AiRequestStatus | null,
  proposal?: AiProposal | null
): AiPanelState {
  if (proposal && requestStatus === "succeeded") {
    return {
      actionsEnabled: true,
      ctaLabel: "Review proposal",
      proposal,
      status: "proposal-ready",
      summary: proposal.summary ?? "Proposal ready to review."
    };
  }

  if (requestStatus === "queued" || requestStatus === "running") {
    return {
      actionsEnabled: false,
      ctaLabel: "Generating",
      status: requestStatus,
      summary: "The AI request is being processed."
    };
  }

  if (requestStatus === "failed" || requestStatus === "cancelled" || requestStatus === "stale") {
    return {
      actionsEnabled: true,
      ctaLabel: "Retry AI action",
      status: requestStatus,
      summary: "The previous AI attempt did not produce an active proposal."
    };
  }

  return {
    actionsEnabled: true,
    ctaLabel: "Run AI action",
    status: "idle",
    summary: "Choose an AI action to generate a proposal for the current document."
  };
}
