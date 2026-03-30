import Fastify from "fastify";

import { parseApiEnv } from "./config/env.js";

export function createApp() {
  const env = parseApiEnv(process.env);

  const app = Fastify({
    logger: env.NODE_ENV !== "test"
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "api"
  }));

  return {
    app,
    env
  };
}

