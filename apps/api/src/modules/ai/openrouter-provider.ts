import type { AiAction } from "@repo/shared-types";

import type { AiProviderClient, AiProviderGenerateInput, AiProviderGenerateOutput } from "./provider.js";

interface OpenRouterProviderOptions {
  apiKey: string;
  appName?: string | null;
  appUrl?: string | null;
  baseUrl: string;
  model: string;
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

const actionInstructions: Record<AiAction, string> = {
  rewrite: "Rewrite the source text while preserving meaning and improving clarity.",
  summarize: "Summarize the source text concisely.",
  translate: "Translate the source text while preserving intent and meaning.",
  restructure: "Restructure the source text into a clearer organization."
};

function buildUserMessage(input: AiProviderGenerateInput) {
  const prompt = input.prompt ? `Additional instruction: ${input.prompt}\n\n` : "";

  return [
    `Task: ${actionInstructions[input.action]}`,
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

export class OpenRouterProviderClient implements AiProviderClient {
  readonly name = "openrouter";

  constructor(private readonly options: OpenRouterProviderOptions) {}

  async generate(input: AiProviderGenerateInput): Promise<AiProviderGenerateOutput> {
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
      const message = payload.error?.message?.trim() || `OpenRouter request failed with status ${response.status}.`;
      throw new Error(message);
    }

    const content = readContent(payload.choices?.[0]?.message?.content);

    if (!content.trim()) {
      throw new Error("OpenRouter returned an empty AI response.");
    }

    return parseJsonResponse(content);
  }
}
