import type { FastifyInstance } from "fastify";

import { createApp } from "../../src/app.js";
import type { JwtLoginIdentity } from "../../src/modules/auth/session.js";
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
  overrides: Partial<JwtLoginIdentity> = {}
) {
  const identity: JwtLoginIdentity = {
    email: "stub-user@example.com",
    name: "Stub User",
    imageUrl: "https://example.com/avatar.png",
    ...overrides
  };

  return app.authSessionService.issueJwtSession(identity).cookie;
}

export function createSessionHeaders(
  app: FastifyInstance,
  overrides: Partial<JwtLoginIdentity> = {}
) {
  return {
    cookie: issueTestSessionCookie(app, overrides)
  };
}
