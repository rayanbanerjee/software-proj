import { describe, expect, it, vi } from "vitest";

import { buildWorkerDefinitions, startWorkerRuntime, type WorkerFactory } from "../src/worker/runtime";
import { WORKER_QUEUES } from "../src/jobs/names";
import type { WorkerEnv } from "../src/config/env";

describe("worker runtime", () => {
  it("builds definitions for all worker queues", () => {
    const definitions = buildWorkerDefinitions();

    expect(definitions.map((item) => item.queueName)).toEqual(WORKER_QUEUES);
  });

  it("registers all workers using shared connection settings", () => {
    const created: Array<{
      queueName: string;
      concurrency: number;
      url: string;
    }> = [];

    const close = vi.fn().mockResolvedValue(undefined);

    const factory: WorkerFactory = ({ definition, connection, concurrency }) => {
      created.push({
        queueName: definition.queueName,
        concurrency,
        url: String((connection as { url?: string }).url)
      });

      return { close };
    };

    const logger = {
      info: vi.fn(),
      error: vi.fn()
    };

    const env: WorkerEnv = {
      port: 4002,
      redisUrl: "redis://localhost:6379",
      databaseUrl: "postgres://postgres:postgres@localhost:5432/collab_editor",
      objectStorageEndpoint: "http://localhost:9000",
      objectStorageBucket: "collab-editor",
      llmApiKey: "replace-me",
      workerConcurrency: 9
    };

    const runtime = startWorkerRuntime(env, logger, factory);

    expect(created).toHaveLength(3);
    expect(created.map((item) => item.queueName)).toEqual(WORKER_QUEUES);
    expect(created[0]?.concurrency).toBe(9);
    expect(created[0]?.url).toBe("redis://localhost:6379");

    return runtime.shutdown();
  });
});