import { z } from "zod";

export const auditMetadataSchema = z.record(z.string(), z.string().nullable());

export const recordAuditEventInputSchema = z.object({
  action: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
  documentId: z.string().trim().min(1).nullable().optional(),
  targetUserId: z.string().trim().min(1).nullable().optional(),
  metadata: auditMetadataSchema.optional()
});

export const auditEventRecordSchema = z.object({
  id: z.string().trim().min(1),
  action: z.string().trim().min(1),
  actorUserId: z.string().trim().min(1),
  documentId: z.string().trim().min(1).nullable(),
  targetUserId: z.string().trim().min(1).nullable(),
  occurredAt: z.string().trim().min(1),
  metadata: auditMetadataSchema
});
