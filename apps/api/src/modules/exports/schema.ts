import { z } from "zod";

export const createExportRequestSchema = z.object({
  format: z.enum(["txt", "pdf", "docx"])
});

export type CreateExportRequest = z.infer<typeof createExportRequestSchema>;