import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

import type { IsoDateString, UserProfile } from "@repo/shared-types";

import { ensureUser } from "../../common/user-store.js";
import { toUserProfile } from "./user-profile.js";
import { signJwt, verifyJwt } from "./jwt.js";

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
  issuer: string;
  isProduction: boolean;
  prisma: PrismaClient;
  sessionSecret: string;
}

export interface JwtLoginIdentity {
  email: string;
  imageUrl?: string | null;
  name?: string | null;
  subject?: string;
  userId?: string;
}

export type LocalAuthResult =
  | { kind: "authenticated"; identity: JwtLoginIdentity; username: string }
  | { kind: "user_not_found" }
  | { kind: "invalid_password" };

export type LocalSignupResult =
  | { kind: "created"; identity: JwtLoginIdentity; username: string }
  | { kind: "user_exists" };

export interface VerifiedAuthSession extends AuthSessionPayload {
  token: string;
}

export const SESSION_COOKIE_NAME = "collab_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function normalizeUserId(email: string) {
  const normalizedValue = email.trim().toLowerCase();
  const digest = createHash("sha256").update(normalizedValue).digest("hex").slice(0, 16);
  return `jwt:${digest}`;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function toLocalIdentity(username: string, userId: string): JwtLoginIdentity {
  return {
    email: `${username}@local.test`,
    name: username,
    userId
  };
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

  async authenticateLocalUser(input: {
    username: string;
    password: string;
  }): Promise<LocalAuthResult> {
    const username = normalizeUsername(input.username);
    const credential = await this.config.prisma.localAuthCredential.findUnique({
      where: {
        username
      },
      include: {
        user: true
      }
    });

    if (!credential) {
      return { kind: "user_not_found" };
    }

    if (credential.passwordHash !== hashPassword(input.password)) {
      return { kind: "invalid_password" };
    }

    return {
      kind: "authenticated",
      username,
      identity: {
        email: credential.user.email,
        imageUrl: credential.user.imageUrl,
        name: credential.user.name,
        userId: credential.user.id
      }
    };
  }

  async registerLocalUser(input: {
    username: string;
    password: string;
  }): Promise<LocalSignupResult> {
    const username = normalizeUsername(input.username);
    const existingCredential = await this.config.prisma.localAuthCredential.findUnique({
      where: {
        username
      }
    });

    if (existingCredential) {
      return { kind: "user_exists" };
    }
    const userId = normalizeUserId(username);
    await ensureUser(this.config.prisma, {
      email: `${username}@local.test`,
      id: userId,
      name: username
    });
    await this.config.prisma.localAuthCredential.create({
      data: {
        userId,
        username,
        passwordHash: hashPassword(input.password)
      }
    });

    return {
      kind: "created",
      username,
      identity: toLocalIdentity(username, userId)
    };
  }

  issueJwtSession(identity: JwtLoginIdentity): IssuedAuthSession {
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + SESSION_TTL_SECONDS * 1000);
    const normalizedEmail = identity.email.trim().toLowerCase();
    const user = toUserProfile({
      id:
        identity.userId?.trim()
        || (identity.subject?.trim() ? `google:${identity.subject.trim()}` : normalizeUserId(normalizedEmail)),
      email: normalizedEmail,
      name: identity.name?.trim() || null,
      imageUrl: identity.imageUrl?.trim() || null
    });

    const token = signJwt(
      {
        sub: user.id,
        email: user.email,
        iss: this.config.issuer,
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
    const claims = verifyJwt(token, this.config.sessionSecret, this.config.issuer);
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
        imageUrl: claims.imageUrl
      }
    };
  }
}
