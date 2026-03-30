import { describe, expect, it } from "vitest";

import { createGoogleTokenValidator } from "../src/modules/auth/google-token-validator.js";

describe("google token validator stub", () => {
  it("rejects an empty token", async () => {
    const validator = createGoogleTokenValidator({
      googleClientId: "client-id"
    });

    await expect(validator.validateIdToken("")).rejects.toThrow("Google ID token is required.");
  });

  it("returns stub claims for the test token", async () => {
    const validator = createGoogleTokenValidator({
      googleClientId: "client-id"
    });

    await expect(validator.validateIdToken("stub-valid-token")).resolves.toMatchObject({
      audience: "client-id",
      subject: "google-oauth-subject"
    });
  });
});
