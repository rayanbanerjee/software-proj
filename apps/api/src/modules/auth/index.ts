import type { FastifyInstance } from "fastify";
import type { GetCurrentUserResponse } from "@repo/shared-types";
import { z } from "zod";

import { AppError } from "../../common/errors.js";
import { GoogleIdTokenVerifier } from "./google-id-token.js";
import { protectedRoute, requireCurrentUser } from "./guard.js";
import { AuthSessionService } from "./session.js";

const authCallbackBodySchema = z
  .object({
    credential: z.string().trim().min(1).optional(),
    idToken: z.string().trim().min(1).optional()
  })
  .refine((value) => Boolean(value.credential || value.idToken), {
    message: "Google ID token is required."
  });

const authCredentialsBodySchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(1)
});

export async function registerAuthModule(app: FastifyInstance) {
  const authSessionService = new AuthSessionService({
    issuer: app.apiEnv.JWT_ISSUER,
    isProduction: app.apiEnv.NODE_ENV === "production",
    prisma: app.prisma,
    sessionSecret: app.apiEnv.SESSION_SECRET
  });
  const googleIdTokenVerifier = app.apiEnv.GOOGLE_CLIENT_ID
    ? new GoogleIdTokenVerifier({
        clientId: app.apiEnv.GOOGLE_CLIENT_ID,
        jwksUrl: app.apiEnv.GOOGLE_JWKS_URL
      })
    : null;

  app.decorate("authSessionService", authSessionService);
  app.decorate("googleIdTokenVerifier", googleIdTokenVerifier);

  app.post("/v1/auth/callback", async (request, reply) => {
    if (!app.googleIdTokenVerifier) {
      throw new AppError(
        "AUTH_PROVIDER_NOT_CONFIGURED",
        503,
        "Google authentication is not configured."
      );
    }

    const parseResult = authCallbackBodySchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new AppError("BAD_REQUEST", 400, "Google ID token is required.");
    }

    const idToken = parseResult.data.credential ?? parseResult.data.idToken;

    if (!idToken) {
      throw new AppError("BAD_REQUEST", 400, "Google ID token is required.");
    }

    try {
      const identity = await app.googleIdTokenVerifier.verifyIdToken(idToken);
      const issuedSession = app.authSessionService.issueJwtSession(identity);

      reply.header("set-cookie", issuedSession.cookie);

      return reply.status(200).send({
        session: issuedSession.session
      });
    } catch {
      throw new AppError("AUTH_INVALID_GOOGLE_TOKEN", 401, "Google ID token is invalid.");
    }
  });

  app.post("/v1/auth/signup", async (request, reply) => {
    const parseResult = authCredentialsBodySchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new AppError("BAD_REQUEST", 400, "Username and password are required.");
    }

    const signupResult = await app.authSessionService.registerLocalUser(parseResult.data);

    if (signupResult.kind === "user_exists") {
      throw new AppError("AUTH_USER_EXISTS", 409, "Username already exists.");
    }

    const issuedSession = app.authSessionService.issueJwtSession(signupResult.identity);

    reply.header("set-cookie", issuedSession.cookie);

    return reply.status(201).send({
      outcome: signupResult.kind,
      session: issuedSession.session
    });
  });

  app.post("/v1/auth/login", async (request, reply) => {
    const parseResult = authCredentialsBodySchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new AppError("BAD_REQUEST", 400, "Username and password are required.");
    }

    const authResult = await app.authSessionService.authenticateLocalUser(parseResult.data);

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
    protectedRoute,
    async (request): Promise<GetCurrentUserResponse> => {
      return {
        user: requireCurrentUser(request)
      };
    }
  );
}
