export type LogContext = Record<string, unknown>;

export interface WorkerLogger {
  child(bindings: LogContext): WorkerLogger;
  info(message: string, meta?: LogContext): void;
  warn(message: string, meta?: LogContext): void;
  error(message: string, meta?: LogContext): void;
}

class ConsoleWorkerLogger implements WorkerLogger {
  constructor(private readonly bindings: LogContext = {}) {}

  child(bindings: LogContext): WorkerLogger {
    return new ConsoleWorkerLogger({
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

export function createWorkerLogger(bindings?: LogContext): WorkerLogger {
  return new ConsoleWorkerLogger(bindings);
}
