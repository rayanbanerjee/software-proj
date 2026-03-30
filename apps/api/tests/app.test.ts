import { afterEach, beforeEach, describe, expect, it } from "vitest";

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

describe("api app", () => {
  it("responds on the health endpoint", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      service: "api"
    });

    await app.close();
  });

  it("registers the google token validator", async () => {
    const { app } = await createApp();

    await expect(app.googleTokenValidator.validateIdToken("stub-valid-token")).resolves.toMatchObject({
      audience: "client-id",
      email: "stub-user@example.com"
    });

    await app.close();
  });
});

