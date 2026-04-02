import Fastify from "fastify";

import { registerErrorHandling } from "./common/error-handler.js";
import { createAppLogger, type AppLogger } from "./common/logger.js";
import { registerRequestLogging } from "./common/request-logging.js";
import { parseApiEnv } from "./config/env.js";
import { registerAiModule } from "./modules/ai/index.js";
import { registerAuditModule } from "./modules/audit/index.js";
import { registerAuthModule } from "./modules/auth/index.js";
import { registerCommentsModule } from "./modules/comments/index.js";
import { registerDocumentsModule } from "./modules/documents/index.js";
import { registerExportsModule } from "./modules/exports/index.js";
import { registerHealthRoutes } from "./modules/health/routes.js";
import { registerSharingModule } from "./modules/sharing/index.js";
import { registerVersionsModule } from "./modules/versions/index.js";

interface CreateAppOptions {
  appLogger?: AppLogger;
  logger?: boolean;
}

export async function createApp(options: CreateAppOptions = {}) {
  const env = parseApiEnv(process.env);

  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV !== "test"
  });
  const appLogger = options.appLogger ?? createAppLogger(app.log, { service: "api" });

  app.decorate("apiEnv", env);
  app.decorate("appLogger", appLogger);

  registerErrorHandling(app);
  registerRequestLogging(app);
  await registerAuditModule(app);
  await registerAuthModule(app);
  await registerCommentsModule(app);
  await registerDocumentsModule(app);
  await registerAiModule(app);
  await registerExportsModule(app);
  await registerHealthRoutes(app);
  await registerSharingModule(app);
  await registerVersionsModule(app);

  return {
    app,
    env
  };
}
