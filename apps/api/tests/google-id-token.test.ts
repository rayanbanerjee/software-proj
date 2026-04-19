import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { GoogleIdTokenVerifier } from "../src/modules/auth/google-id-token.js";

function signGoogleIdToken(options: {
  audience?: string;
  email?: string;
  emailVerified?: boolean;
  expiresAtSeconds?: number;
  issuer?: string;
}) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048
  });
  const publicJwk = publicKey.export({
    format: "jwk"
  }) as JsonWebKey;
  const kid = "test-google-key";
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    kid,
    typ: "JWT"
  };
  const payload = {
    aud: options.audience ?? "test-google-client-id.apps.googleusercontent.com",
    email: options.email ?? "owner@example.com",
    email_verified: options.emailVerified ?? true,
    exp: options.expiresAtSeconds ?? nowSeconds + 300,
    iat: nowSeconds - 30,
    iss: options.issuer ?? "https://accounts.google.com",
    name: "Owner Demo",
    picture: "https://example.com/avatar.png",
    sub: "google-subject-123"
  };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signer = createSign("RSA-SHA256");

  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();

  return {
    jwk: {
      ...publicJwk,
      alg: "RS256",
      kid,
      kty: "RSA",
      use: "sig"
    },
    token: `${encodedHeader}.${encodedPayload}.${signer.sign(privateKey).toString("base64url")}`
  };
}

describe("GoogleIdTokenVerifier", () => {
  it("verifies a valid Google-style ID token and normalizes identity fields", async () => {
    const signedToken = signGoogleIdToken({});
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify({ keys: [signedToken.jwk] }), {
        status: 200,
        headers: {
          "cache-control": "public, max-age=300"
        }
      });
    const verifier = new GoogleIdTokenVerifier({
      clientId: "test-google-client-id.apps.googleusercontent.com",
      fetchImpl: fetchMock,
      jwksUrl: "https://example.com/google-jwks"
    });

    await expect(verifier.verifyIdToken(signedToken.token)).resolves.toEqual({
      email: "owner@example.com",
      imageUrl: "https://example.com/avatar.png",
      name: "Owner Demo",
      subject: "google-subject-123"
    });
  });

  it("rejects tokens with the wrong audience", async () => {
    const signedToken = signGoogleIdToken({
      audience: "different-client-id.apps.googleusercontent.com"
    });
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify({ keys: [signedToken.jwk] }), {
        status: 200
      });
    const verifier = new GoogleIdTokenVerifier({
      clientId: "test-google-client-id.apps.googleusercontent.com",
      fetchImpl: fetchMock,
      jwksUrl: "https://example.com/google-jwks"
    });

    await expect(verifier.verifyIdToken(signedToken.token)).rejects.toThrow(
      "Google ID token claims are invalid."
    );
  });
});
