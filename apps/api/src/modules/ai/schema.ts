import { z } from "zod";

export const submitAiRequestSchema = z.object({
  action: z.enum(["rewrite", "summarize", "translate", "restructure"]),
  prompt: z.string().trim().min(1).nullable(),
  context: z.object({
    scope: z.enum(["document", "selection"]),
    selectedText: z.string().nullable(),
    surroundingText: z.string().nullable()
  }),
  maskPersonalData: z.boolean().default(false)
});

export type SubmitAiRequestInput = z.infer<typeof submitAiRequestSchema>;
