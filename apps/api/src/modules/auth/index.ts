import type { FastifyInstance } from "fastify";
import type { GetCurrentUserResponse } from "@repo/shared-types";
import { z } from "zod";

import { AppError } from "../../common/errors.js";
import { authenticateRequest, requireCurrentUser } from "./guard.js";
import { AuthSessionService } from "./session.js";

const authLoginBodySchema = z.object({
  email: z.string().trim().email(),
  imageUrl: z.string().trim().url().nullable().optional(),
  name: z.string().trim().min(1).nullable().optional(),
  userId: z.string().trim().min(1).optional()
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
      throw new AppError("BAD_REQUEST", 400, "Email is required to create a JWT session.");
    }

    const issuedSession = app.authSessionService.issueJwtSession(parseResult.data);

    reply.header("set-cookie", issuedSession.cookie);

    return reply.status(200).send({
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
