import type { AiAction } from "@repo/shared-types";

import type { AiProviderClient, AiProviderGenerateInput, AiProviderGenerateOutput } from "./provider.js";

const actionLabels: Record<AiAction, string> = {
  rewrite: "[REWRITE]",
  summarize: "[SUMMARY]",
  translate: "[TRANSLATED]",
  restructure: "[RESTRUCTURED]"
};

export class MockProviderClient implements AiProviderClient {
  readonly name = "mock-provider";

  async generate(input: AiProviderGenerateInput): Promise<AiProviderGenerateOutput> {
    const tag = actionLabels[input.action];
    const promptSuffix = input.prompt ? ` Prompt: ${input.prompt}` : "";

    return {
      proposedText: `${tag} ${input.sourceText}${promptSuffix}`.trim(),
      summary: `Mock ${input.action} proposal generated locally for development.`
    };
  }
}
