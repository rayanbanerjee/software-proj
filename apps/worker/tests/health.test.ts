import { describe, expect, it } from "vitest";

import { handleWorkerHealthRequest } from "../src/health";

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
        return this;
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

describe("worker health server", () => {
  it("serves health and readiness payloads", () => {
    const health = createMockResponse();
    const ready = createMockResponse();

    const handledHealth = handleWorkerHealthRequest(
      { url: "/health" } as never,
      health.response as never,
      {
        workerCount: 3
      }
    );
    const handledReady = handleWorkerHealthRequest(
      { url: "/ready" } as never,
      ready.response as never,
      {
        workerCount: 3
      }
    );

    expect(handledHealth).toBe(true);
    expect(health.readJson()).toEqual({
      body: {
        service: "worker",
        status: "ok"
      },
      statusCode: 200
    });

    expect(handledReady).toBe(true);
    expect(ready.readJson()).toEqual({
      body: {
        queues: ["ai-jobs", "export-jobs", "revision-jobs"],
        service: "worker",
        status: "ready",
        workerCount: 3
      },
      statusCode: 200
    });
  });
});
