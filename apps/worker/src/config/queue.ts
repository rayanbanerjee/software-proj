import type { ConnectionOptions } from "bullmq";

import type { WorkerEnv } from "./env";

export function getQueueConnection(env: WorkerEnv): ConnectionOptions {
  return {
    url: env.redisUrl,
    maxRetriesPerRequest: null
  };
}