import type { FastifyInstance } from "fastify";

import { AiService } from "./service.js";

export async function registerAiModule(app: FastifyInstance) {
  app.decorate("aiService", new AiService());
}
