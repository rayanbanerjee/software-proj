import type { FastifyInstance } from "fastify";

function toMilliseconds(durationNanoseconds: bigint): number {
  return Number(durationNanoseconds) / 1_000_000;
}

export function registerRequestLogging(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    request.requestStartedAt = process.hrtime.bigint();
  });

  app.addHook("onResponse", async (request, reply) => {
    const startedAt = request.requestStartedAt ?? process.hrtime.bigint();
    const responseTimeMs = toMilliseconds(process.hrtime.bigint() - startedAt);

    app.appLogger
      .child({
        requestId: request.id
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
