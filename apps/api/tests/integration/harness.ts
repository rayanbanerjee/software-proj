import type { FastifyInstance } from "fastify";

import { createApp } from "../../src/app.js";
import type { GoogleTokenClaims } from "../../src/modules/auth/google-token-validator.js";
import { defaultApiTestEnv } from "../../../../tests/config/env.js";

export function applyApiTestEnv(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return {
    ...defaultApiTestEnv,
    ...overrides
  };
}

export async function createApiTestApp(): Promise<FastifyInstance> {
  const { app } = await createApp();
  return app;
}

export function issueTestSessionCookie(
  app: FastifyInstance,
  overrides: Partial<GoogleTokenClaims> = {}
) {
  const claims: GoogleTokenClaims = {
    audience: app.apiEnv.GOOGLE_CLIENT_ID,
    email: "stub-user@example.com",
    emailVerified: true,
    name: "Stub User",
    picture: "https://example.com/avatar.png",
    subject: "google-oauth-subject",
    ...overrides
  };

  return app.authSessionService.issueGoogleSession(claims).cookie;
}

export function createSessionHeaders(
  app: FastifyInstance,
  overrides: Partial<GoogleTokenClaims> = {}
) {
  return {
    cookie: issueTestSessionCookie(app, overrides)
  };
}
