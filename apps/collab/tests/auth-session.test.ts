import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { requireCollabSession, verifyCollabSessionToken } from "../src/auth/session.js";

function createToken(secret: string, overrides: Partial<Record<string, unknown>> = {}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const claims = {
    v: 1,
    provider: "google",
    sub: "google:user_owner",
    email: "owner@example.com",
    name: "Owner Demo",
    imageUrl: "https://example.com/avatar.png",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
    ...overrides
  };
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedClaims).digest("base64url");

  return `${encodedClaims}.${signature}`;
}

describe("collab session verification", () => {
  it("verifies a signed API session token", () => {
    const token = createToken("secret");

    const session = verifyCollabSessionToken(token, "secret");

    expect(session.user).toEqual({
      email: "owner@example.com",
      googleSubject: "user_owner",
      id: "google:user_owner",
      imageUrl: "https://example.com/avatar.png",
      name: "Owner Demo"
    });
    expect(session.session.token).toBe(token);
  });

  it("requires a token query parameter for collab connections", () => {
    expect(() =>
      requireCollabSession(new URLSearchParams(), {
        sessionSecret: "secret"
      })
    ).toThrow("Missing session token.");

    const token = createToken("secret");
    const session = requireCollabSession(
      new URLSearchParams([["token", token]]),
      {
        sessionSecret: "secret"
      }
    );

    expect(session.user.id).toBe("google:user_owner");
  });

  it("rejects invalid tokens", () => {
    const token = createToken("wrong-secret");

    expect(() => verifyCollabSessionToken(token, "secret")).toThrow(
      "Session token signature is invalid."
    );
  });
});
