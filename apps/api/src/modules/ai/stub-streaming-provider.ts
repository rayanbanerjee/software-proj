import type { AiProviderClient, AiProviderGenerateInput, AiProviderInput } from "./provider.js";
import { buildSourceText } from "./provider.js";
import { MockProviderClient } from "./mock-provider-client.js";

export class StubStreamingProvider implements AiProviderClient {
  readonly name = "stub-streaming";
  private readonly fallback = new MockProviderClient();

  async generate(input: AiProviderGenerateInput) {
    return this.fallback.generate(input);
  }

  async *streamText(input: AiProviderInput): AsyncIterable<string> {
    const source = buildSourceText(input.context) || "No source text was provided.";
    const generated = (
      await this.fallback.generate({
        action: input.action,
        prompt: input.prompt,
        sourceText: source
      })
    ).proposedText;

    for (const chunk of generated.match(/.{1,24}/g) ?? [generated]) {
      yield chunk;
      await Promise.resolve();
    }
  }
}
