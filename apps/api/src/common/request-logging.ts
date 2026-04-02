import type { FastifyInstance } from "fastify";

function toMilliseconds(durationNanoseconds: bigint): number {
  return Number(durationNanoseconds) / 1_000_000;
}

export function registerRequestLogging(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    request.requestStartedAt = process.hrtime.bigint();
    const headerValue = request.headers["x-request-id"];
    request.requestId = Array.isArray(headerValue) ? headerValue[0] : headerValue ?? request.id;
    reply.header("x-request-id", request.requestId);
  });

  app.addHook("onResponse", async (request, reply) => {
    const startedAt = request.requestStartedAt ?? process.hrtime.bigint();
    const responseTimeMs = toMilliseconds(process.hrtime.bigint() - startedAt);
    const requestId = request.requestId ?? request.id;

    app.appLogger
      .child({
        requestId
      })
      .info("request.completed", {
        method: request.method,
        route: request.routeOptions.url ?? request.url,
        statusCode: reply.statusCode,
        url: request.url,
        responseTimeMs: Number(responseTimeMs.toFixed(3))
      });
  });
}
