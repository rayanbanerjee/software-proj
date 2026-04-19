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
    child() {
      return logger;
    },
    info() {},
    warn() {},
    error() {}
  };

  const server = {
    documents: new Map()
  };

  function createPostRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
    const request = new EventEmitter() as EventEmitter & {
      headers: Record<string, string>;
      method: string;
      url: string;
    };
    request.headers = headers;
    request.method = "POST";
    request.url = url;

    return {
      emitBody() {
        request.emit("data", Buffer.from(JSON.stringify(body)));
        request.emit("end");
      },
      request
    };
  }

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
    const { request, emitBody } = createPostRequest("/internal/events/document-rollback", {
      type: "document.rollback",
      documentId: "doc-1",
      revisionId: "rev-2",
      restoredFromRevisionId: "rev-1",
      rolledBackAt: "2026-04-02T18:00:00.000Z",
      triggeredByUserId: "google:user_owner"
    });

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

    emitBody();

    const handled = await handledPromise;

    expect(handled).toBe(true);
    expect(broadcasts).toEqual([
      JSON.stringify({
        type: "document.rollback",
        documentId: "doc-1",
        revisionId: "rev-2",
        restoredFromRevisionId: "rev-1",
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
    const { request, emitBody } = createPostRequest("/internal/events/document-permission-update", {
      type: "document.permission.updated",
      documentId: "doc-1",
      userId: "google:user_editor",
      role: "commenter",
      accessLevel: "read",
      changedAt: "2026-04-02T18:00:00.000Z",
      triggeredByUserId: "google:user_owner"
    });

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

    emitBody();

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

  it("accepts an authenticated content sync request", async () => {
    const response = createMockResponse();
    const syncCalls: Array<{ documentId: string; initializeIfEmpty: boolean; text: string }> = [];
    const { request, emitBody } = createPostRequest(
      "/internal/documents/doc-1/content-sync",
      {
        initializeIfEmpty: true,
        text: "Synced content"
      },
      {
        "x-collab-token": "secret"
      }
    );

    const handledPromise = handleCollabRequest(request, response.response as never, {
      activeConnections: 1,
      activeDocuments: 1,
      internalToken: "secret",
      logger,
      runtime: server,
      syncDocumentContent: async (input) => {
        syncCalls.push(input);
        return true;
      }
    });

    emitBody();

    const handled = await handledPromise;

    expect(handled).toBe(true);
    expect(syncCalls).toEqual([
      {
        documentId: "doc-1",
        initializeIfEmpty: true,
        text: "Synced content"
      }
    ]);
    expect(response.readJson()).toEqual({
      body: {
        applied: true,
        status: "accepted"
      },
      statusCode: 202
    });
  });
});
