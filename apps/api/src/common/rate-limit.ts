import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { toApiErrorResponse, AppError } from "./errors.js";

interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
}

interface RateLimitBucket {
  count: number;
  resetAtMs: number;
}

class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly windowMs: number,
    private readonly maxRequests: number,
    private readonly now: () => number = () => Date.now()
  ) {}

  consume(key: string): RateLimitDecision {
    const now = this.now();
    const existingBucket = this.buckets.get(key);
    const bucket =
      !existingBucket || existingBucket.resetAtMs <= now
        ? {
            count: 0,
            resetAtMs: now + this.windowMs
          }
        : existingBucket;

    bucket.count += 1;
    this.buckets.set(key, bucket);

    return {
      allowed: bucket.count <= this.maxRequests,
      limit: this.maxRequests,
      remaining: Math.max(this.maxRequests - bucket.count, 0),
      resetAtMs: bucket.resetAtMs
    };
  }
}

function getClientAddress(request: FastifyRequest) {
  const forwardedFor = request.headers["x-forwarded-for"];
  const headerValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const forwardedAddress = headerValue?.split(",")[0]?.trim();

  return forwardedAddress || request.ip || "unknown";
}

function getRateLimitKey(request: FastifyRequest) {
  const requestPath = request.url.split("?")[0] ?? request.url;
  return `${request.method}:${requestPath}:${getClientAddress(request)}`;
}

function applyRateLimitHeaders(
  reply: FastifyReply,
  decision: RateLimitDecision
) {
  reply.header("x-ratelimit-limit", String(decision.limit));
  reply.header("x-ratelimit-remaining", String(decision.remaining));
  reply.header("x-ratelimit-reset", String(Math.ceil(decision.resetAtMs / 1000)));
}

export function registerRateLimiting(app: FastifyInstance) {
  const limiter = new InMemoryRateLimiter(
    app.apiEnv.RATE_LIMIT_WINDOW_MS,
    app.apiEnv.RATE_LIMIT_MAX_REQUESTS
  );

  app.addHook("onRequest", async (request, reply) => {
    if (request.method === "OPTIONS") {
      return;
    }

    const decision = limiter.consume(getRateLimitKey(request));
    applyRateLimitHeaders(reply, decision);

    if (decision.allowed) {
      return;
    }

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((decision.resetAtMs - Date.now()) / 1000)
    );
    const error = new AppError("TOO_MANY_REQUESTS", 429, "Rate limit exceeded.");

    reply.header("retry-after", String(retryAfterSeconds));
    return reply.status(error.statusCode).send(toApiErrorResponse(error));
  });
}
