import type { AiAction } from "@repo/shared-types";

import type {
  AiProviderClient,
  AiProviderGenerateInput,
  AiProviderGenerateOutput,
  AiProviderInput
} from "./provider.js";
import { buildPromptPayload, buildSystemPrompt } from "./provider.js";

interface OpenRouterProviderOptions {
  apiKey: string;
  allowFallbacks?: boolean;
  appName?: string | null;
  appUrl?: string | null;
  baseUrl: string;
  model: string;
  providers?: string[];
  streamModel?: string;
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?: OpenRouterMessageContent;
    };
  }>;
  error?: {
    message?: string;
  };
}

type OpenRouterMessageContent = string | Array<{ text?: string; type?: string }>;

const actionInstructions: Record<Exclude<AiAction, "translate">, string> = {
  rewrite: "Rewrite the source text while preserving meaning and improving clarity.",
  summarize: "Summarize the source text concisely.",
  restructure: "Restructure the source text into a clearer organization."
};

function getActionInstruction(input: AiProviderGenerateInput): string {
  if (input.action === "translate") {
    const targetLanguage = input.prompt?.trim() || "English";
    return `Translate the source text into ${targetLanguage} while preserving intent, tone, and meaning.`;
  }

  return actionInstructions[input.action];
}

function buildUserMessage(input: AiProviderGenerateInput) {
  const prompt = input.action !== "translate" && input.prompt
    ? `Additional instruction: ${input.prompt}\n\n`
    : "";

  return [
    `Task: ${getActionInstruction(input)}`,
    prompt,
    "Return a JSON object with exactly these keys:",
    '- "proposedText": string',
    '- "summary": string',
    "",
    "Source text:",
    input.sourceText
  ].join("\n");
}

function readContent(content: OpenRouterMessageContent | undefined): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (typeof entry?.text === "string") {
          return entry.text;
        }

        return "";
      })
      .join("");
  }

  return "";
}

function parseJsonResponse(content: string): AiProviderGenerateOutput {
  const parsed = JSON.parse(content) as Partial<AiProviderGenerateOutput>;

  if (typeof parsed.proposedText !== "string" || typeof parsed.summary !== "string") {
    throw new Error("OpenRouter returned an invalid AI payload.");
  }

  return {
    proposedText: parsed.proposedText.trim(),
    summary: parsed.summary.trim()
  };
}

function toOpenRouterErrorMessage(status: number, payload: { error?: { message?: string } } | null) {
  const rawMessage = payload?.error?.message?.trim();

  if (!rawMessage) {
    return `OpenRouter request failed with status ${status}.`;
  }

  if (status === 401 && rawMessage.toLowerCase() === "user not found.") {
    return "AI provider authentication failed. The configured OpenRouter API key is invalid or belongs to a deleted account.";
  }

  return rawMessage;
}

function readStreamError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as { error?: unknown }).error;

  if (!error || typeof error !== "object") {
    return null;
  }

  const code = typeof (error as { code?: unknown }).code === "number"
    ? (error as { code: number }).code
    : null;
  const message = typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message.trim()
    : null;

  if (!message) {
    return null;
  }

  if (code === 401 && message.toLowerCase() === "user not found.") {
    return "AI provider authentication failed. The configured OpenRouter API key is invalid or belongs to a deleted account.";
  }

  return message;
}

export class OpenRouterProviderClient implements AiProviderClient {
  readonly name = "openrouter";

  constructor(private readonly options: OpenRouterProviderOptions) {}

  private buildProviderRouting() {
    const order = this.options.providers?.filter((provider) => provider.trim().length > 0) ?? [];

    if (order.length === 0 && this.options.allowFallbacks !== false) {
      return undefined;
    }

    return {
      ...(order.length > 0 ? { order } : {}),
      allow_fallbacks: this.options.allowFallbacks ?? true
    };
  }

  private buildStreamingProviderRouting() {
    return {
      ...(this.buildProviderRouting() ?? {}),
      require_parameters: true
    };
  }

  async generate(input: AiProviderGenerateInput): Promise<AiProviderGenerateOutput> {
    const provider = this.buildProviderRouting();
    const response = await fetch(`${this.options.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
        ...(this.options.appUrl ? { "HTTP-Referer": this.options.appUrl } : {}),
        ...(this.options.appName ? { "X-Title": this.options.appName } : {})
      },
      body: JSON.stringify({
        model: this.options.model,
        ...(provider ? { provider } : {}),
        response_format: {
          type: "json_object"
        },
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are an editing assistant for a collaborative document product. Return only valid JSON."
          },
          {
            role: "user",
            content: buildUserMessage(input)
          }
        ]
      })
    });

    const payload = (await response.json()) as OpenRouterChatResponse;

    if (!response.ok) {
      throw new Error(toOpenRouterErrorMessage(response.status, payload));
    }

    const content = readContent(payload.choices?.[0]?.message?.content);

    if (!content.trim()) {
      throw new Error("OpenRouter returned an empty AI response.");
    }

    return parseJsonResponse(content);
  }

  async *streamText(input: AiProviderInput): AsyncIterable<string> {
    const provider = this.buildStreamingProviderRouting();
    const response = await fetch(`${this.options.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        "Content-Type": "application/json",
        ...(this.options.appUrl ? { "HTTP-Referer": this.options.appUrl } : {}),
        ...(this.options.appName ? { "X-Title": this.options.appName } : {})
      },
      body: JSON.stringify({
        model: this.options.streamModel ?? this.options.model,
        provider,
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
      const rawBody = await response.text();
      let payload: OpenRouterChatResponse | null = null;

      try {
        payload = JSON.parse(rawBody) as OpenRouterChatResponse;
      } catch {
        payload = null;
      }

      throw new Error(
        payload
          ? toOpenRouterErrorMessage(response.status, payload)
          : rawBody || "OpenRouter request failed."
      );
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

        const streamError = readStreamError(parsed);

        if (streamError) {
          throw new Error(streamError);
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
