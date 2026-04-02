import { randomUUID } from "node:crypto";

import type { AuditEventRecord } from "@repo/shared-types";

import {
  auditEventRecordSchema,
  recordAuditEventInputSchema
} from "./schema.js";

export class AuditService {
  readonly moduleName = "audit";

  private readonly events: AuditEventRecord[] = [];

  recordEvent(input: {
    action: string;
    actorUserId: string;
    documentId?: string | null;
    targetUserId?: string | null;
    metadata?: Record<string, string | null>;
  }): AuditEventRecord {
    const validatedInput = recordAuditEventInputSchema.parse(input);
    const event: AuditEventRecord = {
      id: randomUUID(),
      action: validatedInput.action,
      actorUserId: validatedInput.actorUserId,
      documentId: validatedInput.documentId ?? null,
      targetUserId: validatedInput.targetUserId ?? null,
      occurredAt: new Date().toISOString(),
      metadata: validatedInput.metadata ?? {}
    };

    const validatedEvent = auditEventRecordSchema.parse(event);
    this.events.push(validatedEvent);

    return validatedEvent;
  }

  listEvents(): AuditEventRecord[] {
    return [...this.events];
  }
}
