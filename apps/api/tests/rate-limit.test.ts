import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { applyApiTestEnv, createApiTestApp } from "./integration/harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv({
    RATE_LIMIT_MAX_REQUESTS: "2",
    RATE_LIMIT_WINDOW_MS: "60000"
  });
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("api rate limiting", () => {
  it("returns 429 after the configured request limit is exceeded", async () => {
    const app = await createApiTestApp();

    const firstResponse = await app.inject({
      method: "GET",
      url: "/health"
    });
    const secondResponse = await app.inject({
      method: "GET",
      url: "/health"
    });
    const thirdResponse = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(firstResponse.statusCode).toBe(200);
    expect(firstResponse.headers["x-ratelimit-limit"]).toBe("2");
    expect(firstResponse.headers["x-ratelimit-remaining"]).toBe("1");
    expect(secondResponse.statusCode).toBe(200);
    expect(secondResponse.headers["x-ratelimit-remaining"]).toBe("0");
    expect(thirdResponse.statusCode).toBe(429);
    expect(thirdResponse.headers["retry-after"]).toBeDefined();
    expect(thirdResponse.json()).toEqual({
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded.",
        statusCode: 429
      }
    });

    await app.close();
  });

  it("skips OPTIONS requests", async () => {
    const app = await createApiTestApp();

    await app.inject({
      method: "GET",
      url: "/health"
    });
    await app.inject({
      method: "GET",
      url: "/health"
    });
    const optionsResponse = await app.inject({
      method: "OPTIONS",
      url: "/health"
    });

    expect(optionsResponse.statusCode).not.toBe(429);
    expect(optionsResponse.headers["x-ratelimit-limit"]).toBeUndefined();
    expect(optionsResponse.headers["retry-after"]).toBeUndefined();

    await app.close();
  });
});
