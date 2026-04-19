import { createHmac } from "node:crypto";

interface JwtHeader {
  alg: "HS256";
  typ: "JWT";
}

export interface JwtClaims {
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPart(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function signJwt(claims: JwtClaims, secret: string) {
  const header: JwtHeader = {
    alg: "HS256",
    typ: "JWT"
  };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(claims));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = signPart(signingInput, secret);

  return `${signingInput}.${signature}`;
}

export function verifyJwt(token: string, secret: string, issuer: string): JwtClaims {
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
    typeof (claims as JwtClaims).iss !== "string" ||
    typeof (claims as JwtClaims).sub !== "string" ||
    typeof (claims as JwtClaims).email !== "string" ||
    typeof (claims as JwtClaims).iat !== "number" ||
    typeof (claims as JwtClaims).exp !== "number" ||
    (claims as JwtClaims).iss !== issuer
  ) {
    throw new Error("Session token claims are invalid.");
  }

  const parsedClaims = claims as JwtClaims;

  if (parsedClaims.exp * 1000 <= Date.now()) {
    throw new Error("Session token has expired.");
  }

  return parsedClaims;
}
