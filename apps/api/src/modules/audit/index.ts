import type { FastifyInstance } from "fastify";

import { AuditService } from "./service.js";

export async function registerAuditModule(app: FastifyInstance) {
  app.decorate("auditService", new AuditService());
}
