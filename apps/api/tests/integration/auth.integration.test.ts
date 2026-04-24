import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyApiTestEnv,
  createApiTestApp
} from "./harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("auth integration flow", () => {
  it("covers signup, cookie-backed auth, and bearer reuse in one flow", async () => {
    const app = await createApiTestApp();

    const loginResponse = await app.inject({
      method: "POST",
      url: "/v1/auth/signup",
      payload: {
        password: "dev-password",
        username: "stub-user"
      }
    });

    expect(loginResponse.statusCode).toBe(201);
    expect(loginResponse.json()).toMatchObject({
      outcome: "created",
      session: {
        user: {
          id: expect.stringMatching(/^jwt:/),
          email: "stub-user@local.test"
        }
      }
    });

    const sessionCookie = loginResponse.headers["set-cookie"] as string;
    const meWithCookie = await app.inject({
      method: "GET",
      url: "/v1/auth/me",
      headers: {
        cookie: sessionCookie
      }
    });

    expect(meWithCookie.statusCode).toBe(200);
    expect(meWithCookie.json()).toEqual({
      user: {
        id: expect.stringMatching(/^jwt:/),
        email: "stub-user@local.test",
        name: "stub-user",
        imageUrl: null
      }
    });

    const token = sessionCookie.split(";")[0]?.split("=")[1];
    const meWithBearer = await app.inject({
      method: "GET",
      url: "/v1/auth/me",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(meWithBearer.statusCode).toBe(200);
    expect(meWithBearer.json()).toEqual(meWithCookie.json());

    await app.close();
  });
});
