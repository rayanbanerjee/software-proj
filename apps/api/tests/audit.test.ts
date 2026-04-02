import { describe, expect, it } from "vitest";

import { AuditService } from "../src/modules/audit/service.js";

describe("audit service", () => {
  it("records validated audit events", () => {
    const service = new AuditService();
    const event = service.recordEvent({
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

  it("rejects malformed audit events", () => {
    const service = new AuditService();

    expect(() =>
      service.recordEvent({
        action: "",
        actorUserId: "google:user_owner"
      })
    ).toThrowError();
  });
});
