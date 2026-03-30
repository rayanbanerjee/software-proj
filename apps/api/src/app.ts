import Fastify from "fastify";

import { parseApiEnv } from "./config/env.js";
import { registerAuthModule } from "./modules/auth/index.js";
import { registerHealthRoutes } from "./modules/health/routes.js";

export async function createApp() {
  const env = parseApiEnv(process.env);

  const app = Fastify({
    logger: env.NODE_ENV !== "test"
  });

  app.decorate("apiEnv", env);

  await registerAuthModule(app);
  await registerHealthRoutes(app);

  return {
    app,
    env
  };
}
