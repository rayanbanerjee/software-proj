import type { GoogleTokenValidator } from "../modules/auth/google-token-validator.js";
import type { DocumentsService } from "../modules/documents/service.js";
import type { ApiEnv } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    apiEnv: ApiEnv;
    documentsService: DocumentsService;
    googleTokenValidator: GoogleTokenValidator;
  }
}
