import type { AiProviderInput, AiStreamingProvider } from "./provider.js";
import { buildSourceText } from "./provider.js";

export class StubStreamingProvider implements AiStreamingProvider {
  async *streamText(input: AiProviderInput): AsyncIterable<string> {
    const source = buildSourceText(input.context) || "No source text was provided.";
    const generated = buildDeterministicOutput(input, source);

    for (const chunk of generated.match(/.{1,24}/g) ?? [generated]) {
      yield chunk;
      await Promise.resolve();
    }
  }
}

function buildDeterministicOutput(input: AiProviderInput, source: string) {
  const trimmedPrompt = input.prompt?.trim();

  switch (input.action) {
    case "rewrite":
      return `Rewritten draft:\n${source}\n${trimmedPrompt ? `\nInstruction: ${trimmedPrompt}` : ""}`;
    case "summarize":
      return `Summary: ${source.slice(0, 160)}${source.length > 160 ? "..." : ""}`;
    case "translate":
      return `Translated text:\n${source}`;
    case "restructure":
      return `Restructured outline:\n- ${source.replace(/\n+/g, "\n- ")}`;
  }
}
