export interface WorkerEnv {
  port: number;
  redisUrl: string;
  databaseUrl: string;
  objectStorageEndpoint: string;
  objectStorageBucket: string;
  llmApiKey: string;
  workerConcurrency: number;
}

function parseInteger(name: string, value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer for ${name}: ${value}`);
  }

  return parsed;
}

function requireValue(name: string, value: string | undefined): string {
  if (value == null || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

export function getWorkerEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  return {
    port: parseInteger("PORT", source.PORT, 4002),
    redisUrl: requireValue("REDIS_URL", source.REDIS_URL),
    databaseUrl: requireValue("DATABASE_URL", source.DATABASE_URL),
    objectStorageEndpoint: requireValue("OBJECT_STORAGE_ENDPOINT", source.OBJECT_STORAGE_ENDPOINT),
    objectStorageBucket: requireValue("OBJECT_STORAGE_BUCKET", source.OBJECT_STORAGE_BUCKET),
    llmApiKey: requireValue("LLM_API_KEY", source.LLM_API_KEY),
    workerConcurrency: parseInteger("WORKER_CONCURRENCY", source.WORKER_CONCURRENCY, 5)
  };
}