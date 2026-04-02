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
  it("serves health and readiness payloads through the shared request handler", () => {
    const health = createMockResponse();
    const ready = createMockResponse();

    const handledHealth = handleCollabRequest(
      { url: "/health" },
      health.response as never,
      {
        activeConnections: 0,
        activeDocuments: 0
      }
    );
    const handledReady = handleCollabRequest(
      { url: "/ready" },
      ready.response as never,
      {
        activeConnections: 2,
        activeDocuments: 1
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
});
