import { describe, expect, it } from "vitest";

import { requireCollabSession, verifyCollabSessionToken } from "../src/auth/session.js";
import { signJwt } from "../../api/src/modules/auth/jwt.js";

function createToken(secret: string, overrides: Partial<Record<string, unknown>> = {}) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return signJwt(
    {
      sub: "jwt:user_owner",
      email: "owner@example.com",
      iss: "collab-editor-api",
      name: "Owner Demo",
      imageUrl: "https://example.com/avatar.png",
      iat: nowSeconds,
      exp: nowSeconds + 3600,
      ...overrides
    },
    secret
  );
}

describe("collab session verification", () => {
  it("verifies a signed API session token", () => {
    const token = createToken("secret");

    const session = verifyCollabSessionToken(token, "secret", "collab-editor-api");

    expect(session.user).toEqual({
      email: "owner@example.com",
      id: "jwt:user_owner",
      imageUrl: "https://example.com/avatar.png",
      name: "Owner Demo"
    });
    expect(session.session.token).toBe(token);
  });

  it("requires a token query parameter for collab connections", () => {
    expect(() =>
      requireCollabSession(new URLSearchParams(), {
        jwtIssuer: "collab-editor-api",
        sessionSecret: "secret"
      })
    ).toThrow("Missing session token.");

    const token = createToken("secret");
    const session = requireCollabSession(
      new URLSearchParams([["token", token]]),
      {
        jwtIssuer: "collab-editor-api",
        sessionSecret: "secret"
      }
    );

    expect(session.user.id).toBe("jwt:user_owner");
  });

  it("rejects invalid tokens", () => {
    const token = createToken("wrong-secret");

    expect(() => verifyCollabSessionToken(token, "secret", "collab-editor-api")).toThrow(
      "Session token signature is invalid."
    );
  });
});
