import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiTestApp, applyApiTestEnv } from "./integration/harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("api app", () => {
  it("responds on the health endpoint", async () => {
    const app = await createApiTestApp();

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
    const app = await createApiTestApp();

    await expect(app.googleTokenValidator.validateIdToken("stub-valid-token")).resolves.toMatchObject({
      audience: "client-id",
      email: "stub-user@example.com"
    });

    await app.close();
  });
});
