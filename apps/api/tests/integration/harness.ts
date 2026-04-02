import type { FastifyInstance } from "fastify";

import { createApp } from "../../src/app.js";
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
