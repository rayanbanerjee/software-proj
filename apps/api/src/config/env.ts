import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(1),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  COLLAB_URL: z.string().url(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  OPENROUTER_API_KEY: z.string().trim().min(1).optional(),
  OPENROUTER_MODEL: z.string().trim().min(1).default("qwen/qwen3.6-plus:free"),
  OPENROUTER_BASE_URL: z.string().url().default("https://openrouter.ai/api/v1"),
  OPENROUTER_APP_NAME: z.string().trim().min(1).optional(),
  OPENROUTER_APP_URL: z.string().url().optional(),
  OBJECT_STORAGE_ENDPOINT: z.string().min(1),
  OBJECT_STORAGE_BUCKET: z.string().min(1)
});

export type ApiEnv = z.infer<typeof envSchema>;

export function parseApiEnv(source: NodeJS.ProcessEnv): ApiEnv {
  return envSchema.parse({
    ...source,
    OPENROUTER_API_KEY: source.OPENROUTER_API_KEY ?? source.OPENAI_API_KEY
  });
}
