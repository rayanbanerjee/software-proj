import type { FastifyInstance } from "fastify";

import { SharingService } from "./service.js";

export async function registerSharingModule(app: FastifyInstance) {
  app.decorate("sharingService", new SharingService());
}
