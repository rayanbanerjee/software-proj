import type { FastifyInstance } from "fastify";

import { AppError, toApiErrorResponse } from "./errors.js";

export function registerErrorHandling(app: FastifyInstance) {
  app.setNotFoundHandler(async (_request, reply) => {
    const error = new AppError("NOT_FOUND", 404, "Route not found.");
    return reply.status(error.statusCode).send(toApiErrorResponse(error));
  });

  app.setErrorHandler(async (error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(toApiErrorResponse(error));
    }

    const internalError = new AppError(
      "INTERNAL_SERVER_ERROR",
      500,
      "Internal server error."
    );

    return reply.status(internalError.statusCode).send(toApiErrorResponse(internalError));
  });
}

