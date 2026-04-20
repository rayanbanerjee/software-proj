import type { AiAction } from "@repo/shared-types";

import type { AiProviderClient, AiProviderGenerateInput, AiProviderGenerateOutput } from "./provider.js";

const actionLabels: Record<Exclude<AiAction, "translate">, string> = {
  rewrite: "[REWRITE]",
  summarize: "[SUMMARY]",
  restructure: "[RESTRUCTURED]"
};

export class MockProviderClient implements AiProviderClient {
  readonly name = "mock-provider";

  async generate(input: AiProviderGenerateInput): Promise<AiProviderGenerateOutput> {
    const tag = input.action === "translate"
      ? `[TRANSLATED TO ${(input.prompt?.trim() || "English").toUpperCase()}]`
      : actionLabels[input.action];
    const promptSuffix = input.prompt ? ` Prompt: ${input.prompt}` : "";
    const summary = input.action === "translate"
      ? `Mock translate proposal generated locally for development${input.prompt ? ` to ${input.prompt.trim()}` : " to English"}.`
      : `Mock ${input.action} proposal generated locally for development.`;

    return {
      proposedText: `${tag} ${input.sourceText}${promptSuffix}`.trim(),
      summary
    };
  }
}
