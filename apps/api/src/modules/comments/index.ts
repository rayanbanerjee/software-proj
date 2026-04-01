import type { FastifyInstance } from "fastify";

import { CommentsService } from "./service.js";

export async function registerCommentsModule(app: FastifyInstance) {
  app.decorate("commentsService", new CommentsService());
}
