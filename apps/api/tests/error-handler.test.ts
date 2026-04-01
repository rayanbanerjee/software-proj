import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppError } from "../src/common/errors.js";
import { createApiTestApp, applyApiTestEnv } from "./integration/harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("api error handling", () => {
  it("returns the standard not found shape", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/missing"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
        statusCode: 404
      }
    });

    await app.close();
  });

  it("maps app errors to the standard error shape", async () => {
    const app = await createApiTestApp();

    app.get("/boom", async () => {
      throw new AppError("BAD_REQUEST", 400, "Bad request.");
    });

    const response = await app.inject({
      method: "GET",
      url: "/boom"
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Bad request.",
        statusCode: 400
      }
    });

    await app.close();
  });
});
