import type { GoogleTokenValidator } from "../modules/auth/google-token-validator.js";
import type { ApiEnv } from "../config/env.js";

declare module "fastify" {
  interface FastifyInstance {
    apiEnv: ApiEnv;
    googleTokenValidator: GoogleTokenValidator;
  }
}

