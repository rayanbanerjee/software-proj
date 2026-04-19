import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import cors from "@fastify/cors";
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

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();

    if (!key || process.env[key]) {
      continue;
    }

    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\""))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadLocalEnvFiles() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  const cwd = process.cwd();
  const rootEnvFiles = [
    path.join(cwd, ".env"),
    path.join(cwd, ".env.local")
  ];
  const appEnvFiles = [
    path.join(cwd, "apps/api/.env"),
    path.join(cwd, "apps/api/.env.local")
  ];

  for (const filePath of [...rootEnvFiles, ...appEnvFiles]) {
    loadEnvFile(filePath);
  }
}

export async function createApp(options: CreateAppOptions = {}) {
  loadLocalEnvFiles();
  const env = parseApiEnv(process.env);

  const app = Fastify({
    logger: options.logger ?? env.NODE_ENV !== "test"
  });
  const appLogger = options.appLogger ?? createAppLogger(app.log, { service: "api" });

  app.decorate("apiEnv", env);
  app.decorate("appLogger", appLogger);

  await app.register(cors, {
    credentials: true,
    origin: env.WEB_ORIGIN,
    allowedHeaders: ["content-type", "authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  });
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
