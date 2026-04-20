import { createPublicKey, createVerify } from "node:crypto";

import { JwtLoginIdentity } from "./session.js";

interface GoogleJwk {
  alg?: string;
  e?: string;
  kid?: string;
  kty?: string;
  n?: string;
  use?: string;
}

interface GoogleJwksResponse {
  keys?: GoogleJwk[];
}

interface GoogleIdTokenHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface GoogleIdTokenClaims {
  aud?: string;
  email?: string;
  email_verified?: boolean | string;
  exp?: number;
  iat?: number;
  iss?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

interface CachedGoogleJwks {
  expiresAtMs: number;
  keys: Map<string, GoogleJwk>;
}

interface GoogleIdTokenVerifierConfig {
  clientId: string;
  jwksUrl: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

function decodeBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function isGoogleIssuer(value: string | undefined) {
  return value === "accounts.google.com" || value === "https://accounts.google.com";
}

function isVerifiedEmail(value: boolean | string | undefined) {
  return value === true || value === "true";
}

function parseMaxAgeSeconds(cacheControl: string | null) {
  if (!cacheControl) {
    return null;
  }

  const match = /max-age=(\d+)/i.exec(cacheControl);

  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toKeyMap(keys: GoogleJwk[]) {
  const mappedKeys = new Map<string, GoogleJwk>();

  for (const key of keys) {
    if (
      typeof key.kid !== "string"
      || key.kid.length === 0
      || key.kty !== "RSA"
      || typeof key.n !== "string"
      || typeof key.e !== "string"
    ) {
      continue;
    }

    mappedKeys.set(key.kid, key);
  }

  return mappedKeys;
}

export class GoogleIdTokenVerifier {
  private cache: CachedGoogleJwks | null = null;

  private readonly clientId: string;
  private readonly fetchImpl: typeof fetch;
  private readonly jwksUrl: string;
  private readonly now: () => number;

  constructor(config: GoogleIdTokenVerifierConfig) {
    this.clientId = config.clientId;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.jwksUrl = config.jwksUrl;
    this.now = config.now ?? (() => Date.now());
  }

  async verifyIdToken(idToken: string): Promise<JwtLoginIdentity> {
    const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new Error("Google ID token format is invalid.");
    }

    const header = decodeBase64UrlJson<GoogleIdTokenHeader>(encodedHeader);
    const claims = decodeBase64UrlJson<GoogleIdTokenClaims>(encodedPayload);

    if (header.alg !== "RS256" || typeof header.kid !== "string" || header.kid.length === 0) {
      throw new Error("Google ID token header is invalid.");
    }

    if (
      typeof claims.sub !== "string"
      || claims.sub.length === 0
      || typeof claims.email !== "string"
      || claims.email.length === 0
      || !isVerifiedEmail(claims.email_verified)
      || typeof claims.aud !== "string"
      || claims.aud !== this.clientId
      || !isGoogleIssuer(claims.iss)
      || typeof claims.exp !== "number"
      || claims.exp * 1000 <= this.now()
    ) {
      throw new Error("Google ID token claims are invalid.");
    }

    const key = await this.getKey(header.kid);
    const verifier = createVerify("RSA-SHA256");

    verifier.update(`${encodedHeader}.${encodedPayload}`);
    verifier.end();

    const publicKey = createPublicKey({
      key: {
        kty: "RSA",
        n: key.n!,
        e: key.e!
      },
      format: "jwk"
    });

    const signatureIsValid = verifier.verify(publicKey, Buffer.from(encodedSignature, "base64url"));

    if (!signatureIsValid) {
      throw new Error("Google ID token signature is invalid.");
    }

    return {
      email: claims.email.trim().toLowerCase(),
      imageUrl: claims.picture?.trim() || null,
      name: claims.name?.trim() || null,
      subject: claims.sub
    };
  }

  private async getKey(kid: string) {
    const cachedKey = await this.getCachedKey(kid);

    if (cachedKey) {
      return cachedKey;
    }

    this.cache = null;

    const refreshedKey = await this.getCachedKey(kid);

    if (refreshedKey) {
      return refreshedKey;
    }

    throw new Error("Google signing key was not found.");
  }

  private async getCachedKey(kid: string) {
    const now = this.now();

    if (!this.cache || this.cache.expiresAtMs <= now) {
      this.cache = await this.fetchJwks();
    }

    return this.cache.keys.get(kid) ?? null;
  }

  private async fetchJwks(): Promise<CachedGoogleJwks> {
    const response = await this.fetchImpl(this.jwksUrl, {
      method: "GET",
      headers: {
        accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Google JWK fetch failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as GoogleJwksResponse;
    const keys = Array.isArray(payload.keys) ? payload.keys : [];
    const maxAgeSeconds = parseMaxAgeSeconds(response.headers.get("cache-control")) ?? 300;

    return {
      expiresAtMs: this.now() + maxAgeSeconds * 1000,
      keys: toKeyMap(keys)
    };
  }
}
