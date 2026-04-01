import type { FastifyInstance } from "fastify";

import { createApp } from "../../src/app.js";

const baseEnv = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  NODE_ENV: "test",
  OBJECT_STORAGE_BUCKET: "collab-editor",
  OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
  PORT: "4000",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "secret"
} as const;

export function applyApiTestEnv(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  return {
    ...baseEnv,
    ...overrides
  };
}

export async function createApiTestApp(): Promise<FastifyInstance> {
  const { app } = await createApp();
  return app;
}
