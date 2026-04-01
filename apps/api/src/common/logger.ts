import type { FastifyBaseLogger } from "fastify";

export type LogContext = Record<string, unknown>;

export interface AppLogger {
  child(bindings: LogContext): AppLogger;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

class FastifyAppLogger implements AppLogger {
  constructor(private readonly logger: FastifyBaseLogger) {}

  child(bindings: LogContext): AppLogger {
    return new FastifyAppLogger(this.logger.child(bindings));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(context ?? {}, message);
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(context ?? {}, message);
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(context ?? {}, message);
  }
}

export function createAppLogger(logger: FastifyBaseLogger, bindings?: LogContext): AppLogger {
  if (!bindings) {
    return new FastifyAppLogger(logger);
  }

  return new FastifyAppLogger(logger.child(bindings));
}
