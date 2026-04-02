import { pathToFileURL } from "node:url";

import { getWorkerEnv } from "./config/env";
import { startWorkerHealthServer } from "./health";
import { WORKER_QUEUES } from "./jobs/names";
import { startWorkerRuntime } from "./worker/runtime";

export { WORKER_QUEUES as workerQueues };

export async function bootstrap() {
  const env = getWorkerEnv();
  const runtime = startWorkerRuntime(env);
  const healthServer = await startWorkerHealthServer(
    env.port,
    {
      workerCount: runtime.workers.length
    },
    runtime.logger
  );

  const shutdown = async (signal: string) => {
    console.log("worker shutdown signal received", {
      signal,
      queues: WORKER_QUEUES
    });

    await new Promise<void>((resolve, reject) => {
      healthServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    await runtime.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  return runtime;
}

const entry = process.argv[1];

if (entry && import.meta.url === pathToFileURL(entry).href) {
  bootstrap().catch((error: unknown) => {
    console.error("worker bootstrap failed", error);
    process.exit(1);
  });
}
