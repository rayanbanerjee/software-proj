import type { AiAction } from "@repo/shared-types";

export interface MockProviderInput {
  action: AiAction;
  prompt: string | null;
  sourceText: string;
}

export interface MockProviderOutput {
  proposedText: string;
  summary: string;
}

const actionLabels: Record<AiAction, string> = {
  rewrite: "[REWRITE]",
  summarize: "[SUMMARY]",
  translate: "[TRANSLATED]",
  restructure: "[RESTRUCTURED]"
};

export class MockProviderClient {
  readonly name = "mock-provider";

  async generate(input: MockProviderInput): Promise<MockProviderOutput> {
    const tag = actionLabels[input.action];
    const promptSuffix = input.prompt ? ` Prompt: ${input.prompt}` : "";

    return {
      proposedText: `${tag} ${input.sourceText}${promptSuffix}`.trim(),
      summary: `Mock ${input.action} proposal generated locally for development.`
    };
  }
}
