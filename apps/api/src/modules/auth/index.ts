import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { AppError } from "../../common/errors.js";
import { createGoogleTokenValidator } from "./google-token-validator.js";
import { AuthSessionService } from "./session.js";

const authCallbackBodySchema = z.object({
  idToken: z.string().trim().min(1)
});

export async function registerAuthModule(app: FastifyInstance) {
  const validator = createGoogleTokenValidator({
    googleClientId: app.apiEnv.GOOGLE_CLIENT_ID
  });
  const authSessionService = new AuthSessionService({
    isProduction: app.apiEnv.NODE_ENV === "production",
    sessionSecret: app.apiEnv.SESSION_SECRET
  });

  app.decorate("googleTokenValidator", validator);
  app.decorate("authSessionService", authSessionService);

  app.post("/v1/auth/callback", async (request, reply) => {
    const parseResult = authCallbackBodySchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new AppError("BAD_REQUEST", 400, "Google ID token is required.");
    }

    try {
      const claims = await app.googleTokenValidator.validateIdToken(parseResult.data.idToken);
      const issuedSession = app.authSessionService.issueGoogleSession(claims);

      reply.header("set-cookie", issuedSession.cookie);

      return reply.status(200).send({
        session: issuedSession.session
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google token validation failed.";

      throw new AppError("INVALID_GOOGLE_TOKEN", 401, message);
    }
  });
}
