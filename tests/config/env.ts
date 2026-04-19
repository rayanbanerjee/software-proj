export const defaultApiTestEnv = {
  COLLAB_URL: "ws://localhost:4001",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
  JWT_ISSUER: "collab-editor-api-test",
  NODE_ENV: "test",
  OBJECT_STORAGE_BUCKET: "collab-editor",
  OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
  PORT: "4000",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "secret",
  WEB_ORIGIN: "http://localhost:3000"
} as const;

export function applyTestEnv(
  originalEnv: NodeJS.ProcessEnv,
  overrides: Partial<NodeJS.ProcessEnv> = {}
) {
  process.env = {
    ...originalEnv,
    ...defaultApiTestEnv,
    ...overrides
  };
}

export function restoreTestEnv(originalEnv: NodeJS.ProcessEnv) {
  process.env = {
    ...originalEnv
  };
}
