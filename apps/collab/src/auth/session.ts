import { createHmac } from "node:crypto";
import type { URLSearchParams } from "node:url";

import type { UserProfile } from "@repo/shared-types";
import type { SessionAccessLevel } from "@repo/shared-types";

import type { CollabEnv } from "../config/env.js";

interface JwtHeader {
  alg: "HS256";
  typ: "JWT";
}

interface SessionTokenClaims {
  sub: string;
  email: string;
  iss: string;
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

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPart(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function verifyToken(token: string, secret: string, issuer: string): SessionTokenClaims {
  const [encodedHeader, encodedPayload, providedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !providedSignature) {
    throw new Error("Session token format is invalid.");
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signPart(signingInput, secret);

  if (providedSignature !== expectedSignature) {
    throw new Error("Session token signature is invalid.");
  }

  let header: unknown;
  let claims: unknown;

  try {
    header = JSON.parse(decodeBase64Url(encodedHeader));
    claims = JSON.parse(decodeBase64Url(encodedPayload));
  } catch {
    throw new Error("Session token payload is invalid.");
  }

  if (
    !header ||
    typeof header !== "object" ||
    (header as JwtHeader).alg !== "HS256" ||
    (header as JwtHeader).typ !== "JWT"
  ) {
    throw new Error("Session token header is invalid.");
  }

  if (
    !claims ||
    typeof claims !== "object" ||
    typeof (claims as SessionTokenClaims).iss !== "string" ||
    typeof (claims as SessionTokenClaims).sub !== "string" ||
    typeof (claims as SessionTokenClaims).email !== "string" ||
    typeof (claims as SessionTokenClaims).iat !== "number" ||
    typeof (claims as SessionTokenClaims).exp !== "number" ||
    (claims as SessionTokenClaims).iss !== issuer
  ) {
    throw new Error("Session token claims are invalid.");
  }

  const parsedClaims = claims as SessionTokenClaims;

  if (parsedClaims.exp * 1000 <= Date.now()) {
    throw new Error("Session token has expired.");
  }

  return parsedClaims;
}

export function verifyCollabSessionToken(
  token: string,
  sessionSecret: string,
  issuer: string
): CollabSessionContext {
  const claims = verifyToken(token, sessionSecret, issuer);

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
      imageUrl: claims.imageUrl
    }
  };
}

export function requireCollabSession(
  requestParameters: URLSearchParams,
  env: Pick<CollabEnv, "jwtIssuer" | "sessionSecret">
): CollabSessionContext {
  const token = requestParameters.get("token");

  if (!token) {
    throw new Error("Missing session token.");
  }

  return verifyCollabSessionToken(token, env.sessionSecret, env.jwtIssuer);
}
