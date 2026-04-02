import { EventEmitter } from "node:events";

import { describe, expect, it } from "vitest";

import { handleCollabRequest } from "../src/server.js";

function createMockResponse() {
  let statusCode = 200;
  let body = "";

  return {
    response: {
      end(value: string) {
        body = value;
      },
      writeHead(nextStatusCode: number) {
        statusCode = nextStatusCode;
      }
    },
    readJson() {
      return {
        body: JSON.parse(body),
        statusCode
      };
    }
  };
}

describe("collab server", () => {
  const logger = {
    info() {},
    error() {}
  };

  const server = {
    documents: new Map()
  };

  it("serves health and readiness payloads through the shared request handler", async () => {
    const health = createMockResponse();
    const ready = createMockResponse();
    const healthRequest = {
      method: "GET",
      on() {
        return this;
      },
      url: "/health"
    };
    const readyRequest = {
      method: "GET",
      on() {
        return this;
      },
      url: "/ready"
    };

    const handledHealth = await handleCollabRequest(
      healthRequest,
      health.response as never,
      {
        activeConnections: 0,
        activeDocuments: 0,
        logger,
        runtime: server
      }
    );
    const handledReady = await handleCollabRequest(
      readyRequest,
      ready.response as never,
      {
        activeConnections: 2,
        activeDocuments: 1,
        logger,
        runtime: server
      }
    );

    expect(handledHealth).toBe(true);
    expect(health.readJson()).toEqual({
      body: {
        service: "collab",
        status: "ok"
      },
      statusCode: 200
    });

    expect(handledReady).toBe(true);
    expect(ready.readJson()).toEqual({
      body: {
        activeConnections: 2,
        activeDocuments: 1,
        service: "collab",
        status: "ready"
      },
      statusCode: 200
    });
  });

  it("accepts a rollback event and rebroadcasts it to an active document", async () => {
    const response = createMockResponse();
    const broadcasts: string[] = [];
    const request = new EventEmitter() as EventEmitter & {
      method: string;
      url: string;
    };
    request.method = "POST";
    request.url = "/internal/events/document-rollback";

    server.documents.set("doc-1", {
      broadcastStateless(payload: string) {
        broadcasts.push(payload);
      }
    });

    const handledPromise = handleCollabRequest(request, response.response as never, {
      activeConnections: 1,
      activeDocuments: 1,
      logger,
      runtime: server
    });

    request.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          type: "document.rollback",
          documentId: "doc-1",
          revisionId: "rev-2",
          rolledBackAt: "2026-04-02T18:00:00.000Z",
          triggeredByUserId: "google:user_owner"
        })
      )
    );
    request.emit("end");

    const handled = await handledPromise;

    expect(handled).toBe(true);
    expect(broadcasts).toEqual([
      JSON.stringify({
        type: "document.rollback",
        documentId: "doc-1",
        revisionId: "rev-2",
        rolledBackAt: "2026-04-02T18:00:00.000Z",
        triggeredByUserId: "google:user_owner"
      })
    ]);
    expect(response.readJson()).toEqual({
      body: {
        broadcasted: true,
        status: "accepted"
      },
      statusCode: 202
    });
  });

  it("accepts a permission update event and rebroadcasts it to an active document", async () => {
    const response = createMockResponse();
    const broadcasts: string[] = [];
    const request = new EventEmitter() as EventEmitter & {
      method: string;
      url: string;
    };
    request.method = "POST";
    request.url = "/internal/events/document-permission-update";

    server.documents.set("doc-1", {
      broadcastStateless(payload: string) {
        broadcasts.push(payload);
      }
    });

    const handledPromise = handleCollabRequest(request, response.response as never, {
      activeConnections: 1,
      activeDocuments: 1,
      logger,
      runtime: server
    });

    request.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          type: "document.permission.updated",
          documentId: "doc-1",
          userId: "google:user_editor",
          role: "commenter",
          accessLevel: "read",
          changedAt: "2026-04-02T18:00:00.000Z",
          triggeredByUserId: "google:user_owner"
        })
      )
    );
    request.emit("end");

    const handled = await handledPromise;

    expect(handled).toBe(true);
    expect(broadcasts[0]).toBe(
      JSON.stringify({
        type: "document.permission.updated",
        documentId: "doc-1",
        userId: "google:user_editor",
        role: "commenter",
        accessLevel: "read",
        changedAt: "2026-04-02T18:00:00.000Z",
        triggeredByUserId: "google:user_owner"
      })
    );
    expect(response.readJson()).toEqual({
      body: {
        broadcasted: true,
        status: "accepted"
      },
      statusCode: 202
    });
  });
});
