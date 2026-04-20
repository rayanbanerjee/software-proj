import type { RouteShorthandOptions, FastifyRequest } from "fastify";

import { AppError } from "../../common/errors.js";

export async function authenticateRequest(request: FastifyRequest) {
  const token = request.server.authSessionService.readTokenFromHeaders(request.headers);

  if (!token) {
    throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
  }

  try {
    const session = request.server.authSessionService.verifySessionToken(token);
    request.authSession = session;
    request.currentUser = session.user;
  } catch {
    throw new AppError("UNAUTHORIZED", 401, "Invalid session token.");
  }
}

export const protectedRoute: RouteShorthandOptions = {
  preHandler: authenticateRequest
};

export function requireCurrentUser(request: FastifyRequest) {
  if (!request.currentUser) {
    throw new AppError("UNAUTHORIZED", 401, "Authentication required.");
  }

  return request.currentUser;
}
