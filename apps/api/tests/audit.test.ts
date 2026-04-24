import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { AuditService } from "../src/modules/audit/service.js";

function createAuditTestService() {
  const events: Array<{
    action: string;
    actorUserId: string;
    createdAt: Date;
    documentId: string | null;
    id: string;
    metadata: Record<string, string | null> | null;
    occurredAt: Date;
    targetUserId: string | null;
  }> = [];

  const prisma = {
    user: {
      upsert: async () => null
    },
    auditEvent: {
      create: async ({ data }: { data: Omit<(typeof events)[number], "createdAt"> }) => {
        const event = {
          ...data,
          createdAt: new Date()
        };
        events.push(event);
        return event;
      },
      findMany: async () => events
    }
  } as unknown as PrismaClient;

  return new AuditService(prisma);
}

describe("audit service", () => {
  it("records validated audit events", async () => {
    const service = createAuditTestService();
    const event = await service.recordEvent({
      action: "document.share.updated",
      actorUserId: "google:user_owner",
      documentId: "doc-1",
      targetUserId: "google:user_editor",
      metadata: {
        role: "commenter"
      }
    });

    expect(event).toMatchObject({
      action: "document.share.updated",
      actorUserId: "google:user_owner",
      documentId: "doc-1",
      targetUserId: "google:user_editor",
      metadata: {
        role: "commenter"
      }
    });
  });

  it("rejects malformed audit events", async () => {
    const service = createAuditTestService();

    await expect(
      service.recordEvent({
        action: "",
        actorUserId: "google:user_owner"
      })
    ).rejects.toThrowError();
  });
});
