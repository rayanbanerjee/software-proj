import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  applyApiTestEnv,
  createApiTestApp,
  createSessionHeaders,
  issueTestSessionCookie
} from "./integration/harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("current user endpoint", () => {
  it("returns the normalized user profile for a valid session cookie", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/v1/auth/me",
      headers: createSessionHeaders(app, {
        email: "owner@example.com",
        name: "Owner Demo",
        subject: "user_owner"
      })
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      user: {
        id: "google:user_owner",
        email: "owner@example.com",
        name: "Owner Demo",
        imageUrl: "https://example.com/avatar.png",
        googleSubject: "user_owner"
      }
    });

    await app.close();
  });

  it("accepts bearer credentials using the same signed session token", async () => {
    const app = await createApiTestApp();
    const cookie = issueTestSessionCookie(app, {
      email: "bearer@example.com",
      subject: "user_bearer"
    });
    const token = cookie.split(";")[0]?.split("=")[1];

    const response = await app.inject({
      method: "GET",
      url: "/v1/auth/me",
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: {
        id: "google:user_bearer",
        email: "bearer@example.com",
        googleSubject: "user_bearer"
      }
    });

    await app.close();
  });

  it("rejects missing or invalid session credentials", async () => {
    const app = await createApiTestApp();

    const missingResponse = await app.inject({
      method: "GET",
      url: "/v1/auth/me"
    });

    expect(missingResponse.statusCode).toBe(401);
    expect(missingResponse.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
        statusCode: 401
      }
    });

    const invalidResponse = await app.inject({
      method: "GET",
      url: "/v1/auth/me",
      headers: {
        cookie: "collab_session=invalid.token"
      }
    });

    expect(invalidResponse.statusCode).toBe(401);
    expect(invalidResponse.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid session token.",
        statusCode: 401
      }
    });

    await app.close();
  });
});
