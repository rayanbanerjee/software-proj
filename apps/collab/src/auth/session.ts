import { createHmac } from "node:crypto";
import type { URLSearchParams } from "node:url";

import type { UserProfile } from "@repo/shared-types";
import type { SessionAccessLevel } from "@repo/shared-types";

import type { CollabEnv } from "../config/env.js";

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

export interface CollabSessionContext {
  accessLevel?: SessionAccessLevel;
  reconnectSessionId?: string | null;
  stateVector?: string | null;
  presenceSessionId?: string;
  session: {
    expiresAt: string;
    issuedAt: string;
    token: string;
  };
  user: UserProfile;
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

export function verifyCollabSessionToken(
  token: string,
  sessionSecret: string
): CollabSessionContext {
  const claims = verifyToken(token, sessionSecret);

  return {
    session: {
      expiresAt: new Date(claims.exp * 1000).toISOString(),
      issuedAt: new Date(claims.iat * 1000).toISOString(),
      token
    },
    user: {
      id: claims.sub,
      email: claims.email,
      name: claims.name,
      imageUrl: claims.imageUrl,
      googleSubject: claims.sub.replace(/^google:/, "")
    }
  };
}

export function requireCollabSession(
  requestParameters: URLSearchParams,
  env: Pick<CollabEnv, "sessionSecret">
): CollabSessionContext {
  const token = requestParameters.get("token");

  if (!token) {
    throw new Error("Missing session token.");
  }

  return verifyCollabSessionToken(token, env.sessionSecret);
}
