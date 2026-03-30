import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppError } from "../src/common/errors.js";
import { createApp } from "../src/app.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = {
    ...originalEnv,
    DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    NODE_ENV: "test",
    OBJECT_STORAGE_BUCKET: "collab-editor",
    OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
    PORT: "4000",
    REDIS_URL: "redis://localhost:6379",
    SESSION_SECRET: "secret"
  };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("api error handling", () => {
  it("returns the standard not found shape", async () => {
    const { app } = await createApp();

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
    const { app } = await createApp();

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

