import { z } from "zod";

export const createAiRequestSchema = z.object({
  operation: z.enum(["rewrite", "summarize", "translate", "restructure"]),
  selection: z.object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative()
  }),
  parameters: z.record(z.string(), z.string()).optional()
});

export type CreateAiRequest = z.infer<typeof createAiRequestSchema>;