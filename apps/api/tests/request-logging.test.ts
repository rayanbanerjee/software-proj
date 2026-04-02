import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppLogger, LogContext } from "../src/common/logger.js";
import { createApp } from "../src/app.js";
import { applyApiTestEnv } from "./integration/harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

function createSpyLogger() {
  const info = vi.fn<(message: string, context?: LogContext) => void>();
  const warn = vi.fn<(message: string, context?: LogContext) => void>();
  const error = vi.fn<(message: string, context?: LogContext) => void>();
  const child = vi.fn<(bindings: LogContext) => AppLogger>();

  const logger: AppLogger = {
    child(bindings: LogContext) {
      child(bindings);
      return logger;
    },
    info,
    warn,
    error
  };

  return {
    child,
    error,
    info,
    logger,
    warn
  };
}

describe("request logging middleware", () => {
  it("logs completed requests through the shared logger abstraction", async () => {
    const spyLogger = createSpyLogger();
    const { app } = await createApp({
      appLogger: spyLogger.logger
    });

    const response = await app.inject({
      method: "GET",
      headers: {
        "x-request-id": "request-123"
      },
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe("request-123");
    expect(spyLogger.child).toHaveBeenCalledWith({
      requestId: "request-123"
    });
    expect(spyLogger.info).toHaveBeenCalledWith(
      "request.completed",
      expect.objectContaining({
        method: "GET",
        route: "/health",
        statusCode: 200,
        url: "/health",
        responseTimeMs: expect.any(Number)
      })
    );

    await app.close();
  });
});
