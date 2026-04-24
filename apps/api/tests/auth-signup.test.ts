import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiTestApp, applyApiTestEnv } from "./integration/harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("auth signup endpoint", () => {
  it("creates a new local user, then issues a JWT-backed session payload and cookie", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: {
        username: "new-user",
        password: "dev-password"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.headers["set-cookie"]).toContain("collab_session=");
    expect(response.json()).toMatchObject({
      outcome: "created",
      session: {
        user: {
          email: "new-user@local.test",
          name: "new-user"
        }
      }
    });

    await app.close();
  });

  it("rejects duplicate usernames", async () => {
    const app = await createApiTestApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: {
        username: "owner",
        password: "dev-password"
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: {
        username: "owner",
        password: "dev-password"
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: {
        code: "AUTH_USER_EXISTS",
        message: "Username already exists.",
        statusCode: 409
      }
    });

    await app.close();
  });
});
