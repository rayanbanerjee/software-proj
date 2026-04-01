import type { FastifyInstance } from "fastify";

import { ExportsService } from "./service.js";

export async function registerExportsModule(app: FastifyInstance) {
  app.decorate("exportsService", new ExportsService());
}
