export type LogContext = Record<string, unknown>;

export interface CollabLogger {
  child(bindings: LogContext): CollabLogger;
  info(message: string, meta?: LogContext): void;
  warn(message: string, meta?: LogContext): void;
  error(message: string, meta?: LogContext): void;
}

class ConsoleCollabLogger implements CollabLogger {
  constructor(private readonly bindings: LogContext = {}) {}

  child(bindings: LogContext): CollabLogger {
    return new ConsoleCollabLogger({
      ...this.bindings,
      ...bindings
    });
  }

  info(message: string, meta?: LogContext) {
    console.log(message, {
      ...this.bindings,
      ...(meta ?? {})
    });
  }

  warn(message: string, meta?: LogContext) {
    console.warn(message, {
      ...this.bindings,
      ...(meta ?? {})
    });
  }

  error(message: string, meta?: LogContext) {
    console.error(message, {
      ...this.bindings,
      ...(meta ?? {})
    });
  }
}

export function createCollabLogger(bindings?: LogContext): CollabLogger {
  return new ConsoleCollabLogger(bindings);
}
