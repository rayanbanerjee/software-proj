import type { FastifyInstance } from "fastify";

import { createGoogleTokenValidator } from "./google-token-validator.js";

export async function registerAuthModule(app: FastifyInstance) {
  const validator = createGoogleTokenValidator({
    googleClientId: app.apiEnv.GOOGLE_CLIENT_ID
  });

  app.decorate("googleTokenValidator", validator);
}

