import Fastify from "fastify";

import { registerErrorHandling } from "./common/error-handler.js";
import { parseApiEnv } from "./config/env.js";
import { registerAuthModule } from "./modules/auth/index.js";
import { registerDocumentsModule } from "./modules/documents/index.js";
import { registerHealthRoutes } from "./modules/health/routes.js";

export async function createApp() {
  const env = parseApiEnv(process.env);

  const app = Fastify({
    logger: env.NODE_ENV !== "test"
  });

  app.decorate("apiEnv", env);

  registerErrorHandling(app);
  await registerAuthModule(app);
  await registerDocumentsModule(app);
  await registerHealthRoutes(app);

  return {
    app,
    env
  };
}
