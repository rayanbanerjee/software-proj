import { z } from "zod";

const googleTokenClaimsSchema = z.object({
  audience: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
  subject: z.string()
});

export type GoogleTokenClaims = z.infer<typeof googleTokenClaimsSchema>;

export interface GoogleTokenValidator {
  validateIdToken(idToken: string): Promise<GoogleTokenClaims>;
}

interface GoogleTokenValidatorConfig {
  googleClientId: string;
}

class StubGoogleTokenValidator implements GoogleTokenValidator {
  constructor(private readonly config: GoogleTokenValidatorConfig) {}

  async validateIdToken(idToken: string): Promise<GoogleTokenClaims> {
    if (idToken.trim() === "") {
      throw new Error("Google ID token is required.");
    }

    if (idToken !== "stub-valid-token") {
      throw new Error("Google token validation is not implemented. Use stub-valid-token in tests only.");
    }

    return googleTokenClaimsSchema.parse({
      audience: this.config.googleClientId,
      email: "stub-user@example.com",
      emailVerified: true,
      name: "Stub User",
      picture: "https://example.com/avatar.png",
      subject: "google-oauth-subject"
    });
  }
}

export function createGoogleTokenValidator(
  config: GoogleTokenValidatorConfig
): GoogleTokenValidator {
  return new StubGoogleTokenValidator(config);
}

