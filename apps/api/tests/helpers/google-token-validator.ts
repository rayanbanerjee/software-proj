import type {
  GoogleTokenClaims,
  GoogleTokenValidator
} from "../../src/modules/auth/google-token-validator.js";

export function createTestGoogleTokenValidator(): GoogleTokenValidator {
  return {
    async validateIdToken(idToken: string): Promise<GoogleTokenClaims> {
      if (idToken.trim() === "") {
        throw new Error("Google ID token is required.");
      }

      if (idToken !== "stub-valid-token") {
        throw new Error("Google token validation failed.");
      }

      return {
        audience: "client-id",
        email: "stub-user@example.com",
        emailVerified: true,
        name: "Stub User",
        picture: "https://example.com/avatar.png",
        subject: "google-oauth-subject"
      };
    }
  };
}
