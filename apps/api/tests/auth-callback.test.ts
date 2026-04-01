import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApiTestApp, applyApiTestEnv } from "./integration/harness.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("auth callback endpoint", () => {
  it("accepts the stub Google token and returns the issued session payload", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/callback",
      payload: {
        idToken: "stub-valid-token"
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
          id: "google:google-oauth-subject",
          email: "stub-user@example.com",
          name: "Stub User",
          imageUrl: "https://example.com/avatar.png",
          googleSubject: "google-oauth-subject"
        }
      }
    });

    await app.close();
  });

  it("rejects invalid Google tokens with a standard auth error", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/callback",
      payload: {
        idToken: "not-a-valid-token"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "INVALID_GOOGLE_TOKEN",
        message: "Google token validation is not implemented. Use stub-valid-token in tests only.",
        statusCode: 401
      }
    });

    await app.close();
  });

  it("rejects missing tokens before validator execution", async () => {
    const app = await createApiTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/callback",
      payload: {}
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Google ID token is required.",
        statusCode: 400
      }
    });

    await app.close();
  });
});
