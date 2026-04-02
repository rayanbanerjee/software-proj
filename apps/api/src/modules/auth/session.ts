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

export interface VerifiedAuthSession extends AuthSessionPayload {
  token: string;
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

function verifyToken(token: string, secret: string): SessionTokenClaims {
  const [encodedClaims, signature] = token.split(".");

  if (!encodedClaims || !signature) {
    throw new Error("Session token format is invalid.");
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(encodedClaims)
    .digest("base64url");

  if (signature !== expectedSignature) {
    throw new Error("Session token signature is invalid.");
  }

  let parsedClaims: unknown;

  try {
    parsedClaims = JSON.parse(Buffer.from(encodedClaims, "base64url").toString("utf8"));
  } catch {
    throw new Error("Session token payload is invalid.");
  }

  if (
    !parsedClaims ||
    typeof parsedClaims !== "object" ||
    (parsedClaims as SessionTokenClaims).v !== 1 ||
    (parsedClaims as SessionTokenClaims).provider !== "google" ||
    typeof (parsedClaims as SessionTokenClaims).sub !== "string" ||
    typeof (parsedClaims as SessionTokenClaims).email !== "string" ||
    typeof (parsedClaims as SessionTokenClaims).iat !== "number" ||
    typeof (parsedClaims as SessionTokenClaims).exp !== "number"
  ) {
    throw new Error("Session token claims are invalid.");
  }

  const claims = parsedClaims as SessionTokenClaims;

  if (claims.exp * 1000 <= Date.now()) {
    throw new Error("Session token has expired.");
  }

  return claims;
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  for (const pair of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = pair.trim().split("=");

    if (!rawName || rawValue.length === 0) {
      continue;
    }

    cookies.set(rawName, rawValue.join("="));
  }

  return cookies;
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

  readTokenFromHeaders(
    headers: Record<string, string | string[] | undefined>
  ): string | null {
    const authorizationHeader = headers.authorization;
    const authorization = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;

    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length).trim() || null;
    }

    const cookieHeader = headers.cookie;
    const cookie = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;
    const cookies = parseCookies(cookie);

    return cookies.get(SESSION_COOKIE_NAME) ?? null;
  }

  verifySessionToken(token: string): VerifiedAuthSession {
    const claims = verifyToken(token, this.config.sessionSecret);
    const issuedAt = new Date(claims.iat * 1000);
    const expiresAt = new Date(claims.exp * 1000);

    return {
      token,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      user: {
        id: claims.sub,
        email: claims.email,
        name: claims.name,
        imageUrl: claims.imageUrl,
        googleSubject: claims.provider === "google" ? claims.sub.replace(/^google:/, "") : null
      }
    };
  }
}
