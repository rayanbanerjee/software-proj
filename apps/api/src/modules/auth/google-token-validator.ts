import { OAuth2Client } from "google-auth-library";
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
  verifyIdToken?: VerifyGoogleIdToken;
}

type VerifyGoogleIdToken = (
  idToken: string,
  googleClientId: string
) => Promise<GoogleTokenClaims>;

async function verifyGoogleIdTokenWithGoogleAuthLibrary(
  idToken: string,
  googleClientId: string
): Promise<GoogleTokenClaims> {
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: googleClientId
  });
  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Google token payload is missing.");
  }

  return googleTokenClaimsSchema.parse({
    audience: payload.aud,
    email: payload.email,
    emailVerified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
    subject: payload.sub
  });
}

class GoogleAuthLibraryTokenValidator implements GoogleTokenValidator {
  constructor(private readonly config: GoogleTokenValidatorConfig) {}

  async validateIdToken(idToken: string): Promise<GoogleTokenClaims> {
    if (idToken.trim() === "") {
      throw new Error("Google ID token is required.");
    }

    const verifyIdToken = this.config.verifyIdToken ?? verifyGoogleIdTokenWithGoogleAuthLibrary;
    return verifyIdToken(idToken, this.config.googleClientId);
  }
}

export function createGoogleTokenValidator(
  config: GoogleTokenValidatorConfig
): GoogleTokenValidator {
  return new GoogleAuthLibraryTokenValidator(config);
}
