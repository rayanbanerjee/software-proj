export const defaultApiTestEnv = {
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
  WEB_ORIGIN: "http://localhost:3002",
  NODE_ENV: "test",
  OBJECT_STORAGE_BUCKET: "collab-editor",
  OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
  PORT: "4000",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "secret",
  COLLAB_URL: "ws://localhost:4001",
  RATE_LIMIT_WINDOW_MS: "60000",
  RATE_LIMIT_MAX_REQUESTS: "120",
  OPENROUTER_MODEL: "qwen/qwen3.6-plus:free",
  OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1"
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
