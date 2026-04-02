import type { AiAction } from "@repo/shared-types";

export interface AiProviderGenerateInput {
  action: AiAction;
  prompt: string | null;
  sourceText: string;
}

export interface AiProviderGenerateOutput {
  proposedText: string;
  summary: string;
}

export interface AiProviderClient {
  readonly name: string;
  generate(input: AiProviderGenerateInput): Promise<AiProviderGenerateOutput>;
}
