import { describe, expect, it } from "vitest";

import { getWorkerEnv } from "../src/config/env";

describe("getWorkerEnv", () => {
  it("parses required values", () => {
    const env = getWorkerEnv({
      PORT: "4002",
      REDIS_URL: "redis://localhost:6379",
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
      OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
      OBJECT_STORAGE_BUCKET: "collab-editor",
      LLM_API_KEY: "replace-me",
      WORKER_CONCURRENCY: "12"
    });

    expect(env.port).toBe(4002);
    expect(env.redisUrl).toBe("redis://localhost:6379");
    expect(env.databaseUrl).toContain("collab_editor");
    expect(env.objectStorageEndpoint).toBe("http://localhost:9000");
    expect(env.objectStorageBucket).toBe("collab-editor");
    expect(env.llmApiKey).toBe("replace-me");
    expect(env.workerConcurrency).toBe(12);
  });

  it("uses defaults for optional numeric values", () => {
    const env = getWorkerEnv({
      REDIS_URL: "redis://localhost:6379",
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
      OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
      OBJECT_STORAGE_BUCKET: "collab-editor",
      LLM_API_KEY: "replace-me"
    });

    expect(env.port).toBe(4002);
    expect(env.workerConcurrency).toBe(5);
  });

  it("throws when required values are missing", () => {
    expect(() =>
      getWorkerEnv({
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
        OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
        OBJECT_STORAGE_BUCKET: "collab-editor",
        LLM_API_KEY: "replace-me"
      })
    ).toThrow("Missing required environment variable: REDIS_URL");
  });

  it("throws on invalid integer values", () => {
    expect(() =>
      getWorkerEnv({
        PORT: "abc",
        REDIS_URL: "redis://localhost:6379",
        DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
        OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
        OBJECT_STORAGE_BUCKET: "collab-editor",
        LLM_API_KEY: "replace-me"
      })
    ).toThrow("Invalid integer for PORT");
  });
});