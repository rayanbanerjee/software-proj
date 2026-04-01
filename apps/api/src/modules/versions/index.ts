import type { FastifyInstance } from "fastify";

import { VersionsService } from "./service.js";

export async function registerVersionsModule(app: FastifyInstance) {
  app.decorate("versionsService", new VersionsService());
}
