import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyApiTestEnv,
  createApiTestApp,
  createSessionHeaders
} from "./integration/harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("AI prompt templates and RAG retrieval", () => {
  it("lists the shared prompt templates for authenticated users", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/ai/prompt-templates",
      headers: createSessionHeaders(app, {
        email: "owner@example.com",
        userId: "jwt:user_owner"
      })
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      templates: expect.arrayContaining([
        expect.objectContaining({
          action: "rewrite",
          title: "Rewrite template"
        }),
        expect.objectContaining({
          action: "summarize",
          title: "Summarize template"
        })
      ])
    });

    await app.close();
  });

  it("retrieves ranked context from accessible documents and audit events", async () => {
    const app = await createApiTestApp();
    const ownerHeaders = createSessionHeaders(app, {
      email: "owner@example.com",
      name: "Owner Demo",
      userId: "jwt:user_owner"
    });

    const createResponse = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: ownerHeaders,
      payload: {
        title: "Release plan"
      }
    });

    const documentId = createResponse.json().document.id as string;
    await app.inject({
      method: "PUT",
      url: `/v1/documents/${documentId}/content`,
      headers: ownerHeaders,
      payload: {
        text: "Release plan\n\nSend the invitation email to the editor before publishing the launch notes."
      }
    });

    app.auditService.recordEvent({
      action: "sharing.invitation.created",
      actorUserId: "jwt:user_owner",
      documentId,
      metadata: {
        inviteeEmail: "editor@example.com"
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/ai/context/retrieve",
      headers: ownerHeaders,
      payload: {
        query: "sharing invitation release",
        topK: 6
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      query: "sharing invitation release"
    });
    expect(response.json().chunks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          documentId,
          sourceType: "document_content"
        }),
        expect.objectContaining({
          documentId,
          sourceType: "audit_event"
        })
      ])
    );

    await app.close();
  });
});
