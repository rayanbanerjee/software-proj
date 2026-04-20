import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiTestApp, applyApiTestEnv } from "./integration/harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("auth login endpoint", () => {
  it("issues a JWT-backed session payload and cookie for an existing user", async () => {
    const app = await createApiTestApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        username: "owner",
        password: "dev-password",
        createUserIfMissing: true
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        username: "owner",
        password: "dev-password"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toContain("collab_session=");
    expect(response.headers["set-cookie"]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]).toContain("SameSite=Lax");
    expect(response.headers["set-cookie"]).toContain("Path=/");
    expect(response.headers["set-cookie"]).toContain("Max-Age=604800");
    expect(response.json()).toMatchObject({
      outcome: "authenticated",
      session: {
        user: {
          email: "owner@local.test",
          imageUrl: null,
          name: "owner"
        }
      }
    });

    await app.close();
  });

  it("rejects missing username with a standard request error", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Username and password are required.",
        statusCode: 400
      }
    });

    await app.close();
  });

  it("rejects invalid passwords for existing users", async () => {
    const app = await createApiTestApp();

    await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        username: "owner",
        password: "dev-password",
        createUserIfMissing: true
      }
    });

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        username: "owner",
        password: "wrong-password"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "Invalid username or password.",
        statusCode: 401
      }
    });

    await app.close();
  });

  it("returns a promptable not-found error for unknown usernames", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        username: "new-user",
        password: "dev-password"
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: {
        code: "AUTH_USER_NOT_FOUND",
        message: "Username does not exist.",
        statusCode: 404
      }
    });

    await app.close();
  });

  it("creates a new local user when explicitly requested", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        username: "new-user",
        password: "dev-password",
        createUserIfMissing: true
      }
    });

    expect(response.statusCode).toBe(200);
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
});
