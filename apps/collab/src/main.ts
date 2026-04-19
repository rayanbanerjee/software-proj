import { getCollabEnv } from "./config/env.js";
import { createCollabLogger } from "./logger.js";
import { createCollabServer } from "./server.js";

export const collabResponsibilities = [
  "session-sync",
  "presence-awareness",
  "writer-slot-enforcement",
  "snapshot-rehydration",
  "permission-updates"
] as const;

export async function bootstrap() {
  const env = getCollabEnv();
  const logger = createCollabLogger({
    service: "collab"
  });
  const server = createCollabServer(env, logger);

  try {
    await server.listen();
  } catch (error) {
    logger.error("collab.start_failed", {
      error
    });
    throw error;
  }

  logger.info("collab.started", {
    httpUrl: server.httpURL,
    webSocketUrl: server.webSocketURL
  });

  const shutdown = async (signal: string) => {
    logger.info("collab.shutdown", {
      signal
    });

    await server.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  return server;
}

bootstrap().catch(() => {
  process.exit(1);
});
