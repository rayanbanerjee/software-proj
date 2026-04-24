import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

import type { AuditEventRecord } from "@repo/shared-types";

import { ensureUser } from "../../common/user-store.js";
import {
  auditEventRecordSchema,
  recordAuditEventInputSchema
} from "./schema.js";

export class AuditService {
  readonly moduleName = "audit";

  constructor(private readonly prisma: PrismaClient) {}

  async recordEvent(input: {
    action: string;
    actorUserId: string;
    documentId?: string | null;
    targetUserId?: string | null;
    metadata?: Record<string, string | null>;
  }): Promise<AuditEventRecord> {
    const validatedInput = recordAuditEventInputSchema.parse(input);

    await ensureUser(this.prisma, {
      email: `${validatedInput.actorUserId}@local.test`,
      id: validatedInput.actorUserId,
      name: null
    });

    const event = await this.prisma.auditEvent.create({
      data: {
        id: randomUUID(),
        action: validatedInput.action,
        actorUserId: validatedInput.actorUserId,
        documentId: validatedInput.documentId ?? null,
        targetUserId: validatedInput.targetUserId ?? null,
        metadata: validatedInput.metadata ?? {},
        occurredAt: new Date()
      }
    });

    return auditEventRecordSchema.parse({
      id: event.id,
      action: event.action,
      actorUserId: event.actorUserId,
      documentId: event.documentId,
      targetUserId: event.targetUserId,
      occurredAt: event.occurredAt.toISOString(),
      metadata: (event.metadata as Record<string, string | null> | null) ?? {}
    });
  }

  async listEvents(): Promise<AuditEventRecord[]> {
    const events = await this.prisma.auditEvent.findMany({
      orderBy: {
        occurredAt: "asc"
      }
    });

    return events.map((event) => auditEventRecordSchema.parse({
      id: event.id,
      action: event.action,
      actorUserId: event.actorUserId,
      documentId: event.documentId,
      targetUserId: event.targetUserId,
      occurredAt: event.occurredAt.toISOString(),
      metadata: (event.metadata as Record<string, string | null> | null) ?? {}
    }));
  }
}
