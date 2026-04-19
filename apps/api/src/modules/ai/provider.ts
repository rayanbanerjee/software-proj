import type { AiAction, AiRequestContext } from "@repo/shared-types";

export interface AiProviderInput {
  action: AiAction;
  context: AiRequestContext;
  maskPersonalData: boolean;
  prompt: string | null;
}

export interface AiStreamingProvider {
  streamText(input: AiProviderInput): AsyncIterable<string>;
}

export function buildSourceText(context: AiRequestContext) {
  return context.selectedText?.trim() || context.surroundingText?.trim() || "";
}

export function maskSensitiveText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b(?:\+?\d[\d -]{7,}\d)\b/g, "[redacted-phone]");
}

export function buildPromptPayload(input: AiProviderInput) {
  const sourceText = buildSourceText(input.context);
  const effectiveSource = input.maskPersonalData ? maskSensitiveText(sourceText) : sourceText;
  const promptLines = [
    `Action: ${input.action}`,
    `Scope: ${input.context.scope}`,
    `Selected text: ${effectiveSource || "(empty)"}`,
    input.context.surroundingText
      ? `Surrounding context: ${
          input.maskPersonalData
            ? maskSensitiveText(input.context.surroundingText)
            : input.context.surroundingText
        }`
      : null,
    input.prompt?.trim() ? `Additional instructions: ${input.prompt.trim()}` : null
  ].filter((line): line is string => Boolean(line));

  return promptLines.join("\n");
}

export function buildSystemPrompt(action: AiAction) {
  switch (action) {
    case "rewrite":
      return "Rewrite the provided text clearly and preserve intent. Return only the revised text.";
    case "summarize":
      return "Summarize the provided text clearly and concisely. Return only the summary.";
    case "translate":
      return "Translate the provided text while preserving meaning. Return only the translated text.";
    case "restructure":
      return "Restructure the provided text into a cleaner, more readable form. Return only the improved text.";
  }
}
