import { createSign, generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyApiTestEnv, createApiTestApp } from "./integration/harness.js";

const originalEnv = { ...process.env };

function issueGoogleIdToken() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048
  });
  const publicJwk = publicKey.export({
    format: "jwk"
  }) as JsonWebKey;
  const kid = "callback-key";
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    kid,
    typ: "JWT"
  };
  const payload = {
    aud: "test-google-client-id.apps.googleusercontent.com",
    email: "callback@example.com",
    email_verified: true,
    exp: nowSeconds + 300,
    iat: nowSeconds - 30,
    iss: "https://accounts.google.com",
    name: "Callback User",
    picture: "https://example.com/callback.png",
    sub: "google-callback-subject"
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

beforeEach(() => {
  process.env = applyApiTestEnv();
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...originalEnv };
});

describe("auth callback endpoint", () => {
  it("verifies a Google ID token and issues an API session", async () => {
    const signedToken = issueGoogleIdToken();
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ keys: [signedToken.jwk] }), {
        status: 200,
        headers: {
          "cache-control": "public, max-age=300"
        }
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const app = await createApiTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/callback",
      payload: {
        credential: signedToken.token
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toContain("collab_session=");
    expect(response.json()).toEqual({
      session: {
        issuedAt: expect.any(String),
        expiresAt: expect.any(String),
        user: {
          id: "google:google-callback-subject",
          email: "callback@example.com",
          name: "Callback User",
          imageUrl: "https://example.com/callback.png"
        }
      }
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it("rejects invalid Google ID tokens", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(JSON.stringify({ keys: [] }), {
        status: 200
      })
    );

    vi.stubGlobal("fetch", fetchMock);

    const app = await createApiTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/callback",
      payload: {
        credential: "invalid.token.value"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      error: {
        code: "AUTH_INVALID_GOOGLE_TOKEN",
        message: "Google ID token is invalid.",
        statusCode: 401
      }
    });

    await app.close();
  });

  it("returns 503 when Google authentication is not configured", async () => {
    process.env = applyApiTestEnv({
      GOOGLE_CLIENT_ID: undefined
    });

    const app = await createApiTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/v1/auth/callback",
      payload: {
        credential: "unused"
      }
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      error: {
        code: "AUTH_PROVIDER_NOT_CONFIGURED",
        message: "Google authentication is not configured.",
        statusCode: 503
      }
    });

    await app.close();
  });
});
