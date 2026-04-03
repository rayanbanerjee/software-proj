import type { AiProviderClient, AiProviderGenerateOutput } from "./provider.js";

export class NotConfiguredProviderClient implements AiProviderClient {
  readonly name = "not-configured";

  async generate(): Promise<AiProviderGenerateOutput> {
    throw new Error("AI provider is not configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY.");
  }
}
