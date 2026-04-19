import type { AiStreamingProvider, AiProviderInput } from "./provider.js";
import { buildPromptPayload, buildSystemPrompt } from "./provider.js";

interface OpenRouterStreamingProviderConfig {
  apiKey: string;
  appName?: string;
  appUrl?: string;
  baseUrl: string;
  model: string;
}

export class OpenRouterStreamingProvider implements AiStreamingProvider {
  constructor(private readonly config: OpenRouterStreamingProviderConfig) {}

  async *streamText(input: AiProviderInput): AsyncIterable<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...(this.config.appUrl ? { "HTTP-Referer": this.config.appUrl } : {}),
        ...(this.config.appName ? { "X-Title": this.config.appName } : {})
      },
      body: JSON.stringify({
        model: this.config.model,
        stream: true,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(input.action)
          },
          {
            role: "user",
            content: buildPromptPayload(input)
          }
        ]
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "OpenRouter request failed.");
    }

    if (!response.body) {
      throw new Error("OpenRouter response did not include a stream.");
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line.startsWith("data:")) {
          continue;
        }

        const payload = line.slice("data:".length).trim();

        if (!payload || payload === "[DONE]") {
          continue;
        }

        let parsed: unknown;

        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const delta = extractDeltaText(parsed);

        if (delta) {
          yield delta;
        }
      }
    }
  }
}

function extractDeltaText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const choices = (payload as { choices?: unknown }).choices;

  if (!Array.isArray(choices) || choices.length === 0) {
    return "";
  }

  const firstChoice = choices[0];

  if (!firstChoice || typeof firstChoice !== "object") {
    return "";
  }

  const delta = (firstChoice as { delta?: unknown }).delta;

  if (!delta || typeof delta !== "object") {
    return "";
  }

  const content = (delta as { content?: unknown }).content;
  return typeof content === "string" ? content : "";
}
