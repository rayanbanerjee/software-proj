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
  it("issues a JWT-backed session payload and cookie", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/login",
      payload: {
        email: "owner@example.com",
        imageUrl: "https://example.com/avatar.png",
        name: "Owner Demo"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toContain("collab_session=");
    expect(response.headers["set-cookie"]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]).toContain("SameSite=Lax");
    expect(response.headers["set-cookie"]).toContain("Path=/");
    expect(response.headers["set-cookie"]).toContain("Max-Age=604800");
    expect(response.json()).toMatchObject({
      session: {
        user: {
          email: "owner@example.com",
          imageUrl: "https://example.com/avatar.png",
          name: "Owner Demo"
        }
      }
    });

    await app.close();
  });

  it("rejects missing email with a standard request error", async () => {
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
        message: "Email is required to create a JWT session.",
        statusCode: 400
      }
    });

    await app.close();
  });
});
