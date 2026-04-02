import { randomUUID } from "node:crypto";

import type { AuditEventRecord } from "@repo/shared-types";

type AuditMetadata = Record<string, string | null>;

export class AuditService {
  readonly moduleName = "audit";

  private readonly events: AuditEventRecord[] = [];

  recordEvent(input: {
    action: string;
    actorUserId: string;
    documentId?: string | null;
    targetUserId?: string | null;
    metadata?: AuditMetadata;
  }): AuditEventRecord {
    const event: AuditEventRecord = {
      id: randomUUID(),
      action: input.action,
      actorUserId: input.actorUserId,
      documentId: input.documentId ?? null,
      targetUserId: input.targetUserId ?? null,
      occurredAt: new Date().toISOString(),
      metadata: input.metadata ?? {}
    };

    this.events.push(event);

    return event;
  }

  listEvents(): AuditEventRecord[] {
    return [...this.events];
  }
}
