import { createHmac } from "node:crypto";

import type { IsoDateString, UserProfile } from "@repo/shared-types";

import { toUserProfile } from "./user-profile.js";
import type { GoogleTokenClaims } from "./google-token-validator.js";

export interface AuthSessionPayload {
  issuedAt: IsoDateString;
  expiresAt: IsoDateString;
  user: UserProfile;
}

export interface IssuedAuthSession {
  cookie: string;
  session: AuthSessionPayload;
}

interface AuthSessionServiceConfig {
  isProduction: boolean;
  sessionSecret: string;
}

interface SessionTokenClaims {
  v: 1;
  provider: "google";
  sub: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE_NAME = "collab_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function signToken(claims: SessionTokenClaims, secret: string): string {
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedClaims).digest("base64url");

  return `${encodedClaims}.${signature}`;
}

function serializeSessionCookie(
  token: string,
  expiresAt: Date,
  isProduction: boolean
): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    `Expires=${expiresAt.toUTCString()}`
  ];

  if (isProduction) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export class AuthSessionService {
  constructor(private readonly config: AuthSessionServiceConfig) {}

  issueGoogleSession(claims: GoogleTokenClaims): IssuedAuthSession {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_SECONDS * 1000);
    const user = toUserProfile({
      id: `google:${claims.subject}`,
      email: claims.email,
      name: claims.name ?? null,
      imageUrl: claims.picture ?? null,
      googleSubject: claims.subject
    });

    const token = signToken(
      {
        v: 1,
        provider: "google",
        sub: user.id,
        email: user.email,
        name: user.name,
        imageUrl: user.imageUrl,
        iat: Math.floor(issuedAt.getTime() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000)
      },
      this.config.sessionSecret
    );

    return {
      cookie: serializeSessionCookie(token, expiresAt, this.config.isProduction),
      session: {
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        user
      }
    };
  }
}
