import { describe, expect, it } from "vitest";

import { signJwt, verifyJwt } from "../src/modules/auth/jwt.js";

describe("jwt session helpers", () => {
  it("signs and verifies JWT claims", () => {
    const token = signJwt(
      {
        email: "user@example.com",
        exp: Math.floor(Date.now() / 1000) + 60,
        iat: Math.floor(Date.now() / 1000),
        imageUrl: "https://example.com/avatar.png",
        iss: "collab-editor-api-test",
        name: "User Example",
        sub: "jwt:test-user"
      },
      "secret"
    );

    expect(verifyJwt(token, "secret", "collab-editor-api-test")).toMatchObject({
      email: "user@example.com",
      iss: "collab-editor-api-test",
      sub: "jwt:test-user"
    });
  });

  it("rejects JWTs signed with the wrong secret", () => {
    const token = signJwt(
      {
        email: "user@example.com",
        exp: Math.floor(Date.now() / 1000) + 60,
        iat: Math.floor(Date.now() / 1000),
        imageUrl: null,
        iss: "collab-editor-api-test",
        name: "User Example",
        sub: "jwt:test-user"
      },
      "secret"
    );

    expect(() => verifyJwt(token, "different-secret", "collab-editor-api-test")).toThrow(
      "Session token signature is invalid."
    );
  });
});
