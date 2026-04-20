import type { AiAction } from "@repo/shared-types";

export const aiPromptTemplateVersion = "v1" as const;

export interface PromptTemplateDefinition {
  action: AiAction;
  systemPrompt: string;
  version: typeof aiPromptTemplateVersion;
}

export const aiActions = ["rewrite", "summarize", "translate", "restructure"] as const;

export const promptTemplates: Record<AiAction, PromptTemplateDefinition> = {
  rewrite: {
    action: "rewrite",
    version: aiPromptTemplateVersion,
    systemPrompt: "Rewrite the provided text while preserving the original meaning and intent."
  },
  summarize: {
    action: "summarize",
    version: aiPromptTemplateVersion,
    systemPrompt: "Summarize the provided text into a concise, high-signal draft."
  },
  translate: {
    action: "translate",
    version: aiPromptTemplateVersion,
    systemPrompt:
      "Translate the provided text into English by default while preserving tone, structure, and meaning. If the request names a different target language, use that language instead."
  },
  restructure: {
    action: "restructure",
    version: aiPromptTemplateVersion,
    systemPrompt: "Restructure the provided text to improve clarity, flow, and organization."
  }
};
