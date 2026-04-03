import { describe, expect, it } from "vitest";

import { createGoogleTokenValidator } from "../src/modules/auth/google-token-validator.js";

describe("google token validator", () => {
  it("rejects an empty token", async () => {
    const validator = createGoogleTokenValidator({
      googleClientId: "client-id",
      verifyIdToken: async () => {
        throw new Error("should not be called");
      }
    });

    await expect(validator.validateIdToken("")).rejects.toThrow("Google ID token is required.");
  });

  it("returns claims from the provided verifier", async () => {
    const validator = createGoogleTokenValidator({
      googleClientId: "client-id",
      verifyIdToken: async (_idToken, googleClientId) => ({
        audience: googleClientId,
        email: "stub-user@example.com",
        emailVerified: true,
        name: "Stub User",
        picture: "https://example.com/avatar.png",
        subject: "google-oauth-subject"
      })
    });

    await expect(validator.validateIdToken("stub-valid-token")).resolves.toMatchObject({
      audience: "client-id",
      subject: "google-oauth-subject"
    });
  });
});
