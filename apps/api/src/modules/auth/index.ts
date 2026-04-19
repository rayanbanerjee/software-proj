import type { FastifyInstance } from "fastify";
import type { GetCurrentUserResponse } from "@repo/shared-types";
import { z } from "zod";

import { AppError } from "../../common/errors.js";
import { authenticateRequest, requireCurrentUser } from "./guard.js";
import { AuthSessionService } from "./session.js";

const authLoginBodySchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(1),
  createUserIfMissing: z.boolean().optional().default(false)
});

export async function registerAuthModule(app: FastifyInstance) {
  const authSessionService = new AuthSessionService({
    issuer: app.apiEnv.JWT_ISSUER,
    isProduction: app.apiEnv.NODE_ENV === "production",
    sessionSecret: app.apiEnv.SESSION_SECRET
  });

  app.decorate("authSessionService", authSessionService);

  app.post("/v1/auth/login", async (request, reply) => {
    const parseResult = authLoginBodySchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new AppError("BAD_REQUEST", 400, "Username and password are required.");
    }

    const authResult = app.authSessionService.authenticateLocalUser(parseResult.data);

    if (authResult.kind === "user_not_found") {
      throw new AppError("AUTH_USER_NOT_FOUND", 404, "Username does not exist.");
    }

    if (authResult.kind === "invalid_password") {
      throw new AppError("AUTH_INVALID_CREDENTIALS", 401, "Invalid username or password.");
    }

    const issuedSession = app.authSessionService.issueJwtSession(authResult.identity);

    reply.header("set-cookie", issuedSession.cookie);

    return reply.status(200).send({
      outcome: authResult.kind,
      session: issuedSession.session
    });
  });

  app.get(
    "/v1/auth/me",
    {
      preHandler: authenticateRequest
    },
    async (request): Promise<GetCurrentUserResponse> => {
      return {
        user: requireCurrentUser(request)
      };
    }
  );
}
