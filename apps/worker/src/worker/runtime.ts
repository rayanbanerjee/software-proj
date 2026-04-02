import { Worker, type ConnectionOptions, type Job } from "bullmq";

import { getWorkerEnv, type WorkerEnv } from "../config/env";
import { getQueueConnection } from "../config/queue";
import { DEFAULT_WORKER_CONCURRENCY } from "../jobs/defaults";
import { QUEUE_NAMES, WORKER_QUEUES, type QueueName } from "../jobs/names";
import { processAiJob } from "../processors/ai";
import { processExportJob } from "../processors/export";
import { processRevisionSummaryJob } from "../processors/revision-summary";

export interface WorkerLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export type WorkerProcessor = (job: Job<any>) => Promise<unknown>;

export interface WorkerDefinition {
  queueName: QueueName;
  processor: WorkerProcessor;
}

export interface ClosableWorker {
  close: () => Promise<void>;
}

export interface WorkerFactoryInput {
  definition: WorkerDefinition;
  connection: ConnectionOptions;
  concurrency: number;
}

export type WorkerFactory = (input: WorkerFactoryInput) => ClosableWorker;

export function createLogger(): WorkerLogger {
  return {
    info: (message, meta) => {
      console.log(message, meta ?? {});
    },
    error: (message, meta) => {
      console.error(message, meta ?? {});
    }
  };
}

export function buildWorkerDefinitions(): WorkerDefinition[] {
  return [
    {
      queueName: QUEUE_NAMES.ai,
      processor: (job) => processAiJob(job as Job<any>)
    },
    {
      queueName: QUEUE_NAMES.export,
      processor: (job) => processExportJob(job as Job<any>)
    },
    {
      queueName: QUEUE_NAMES.revision,
      processor: (job) => processRevisionSummaryJob(job as Job<any>)
    }
  ];
}

export function bullMqWorkerFactory({
  definition,
  connection,
  concurrency
}: WorkerFactoryInput): ClosableWorker {
  return new Worker(definition.queueName, definition.processor, {
    connection,
    concurrency
  });
}

export function startWorkerRuntime(
  env: WorkerEnv = getWorkerEnv(),
  logger: WorkerLogger = createLogger(),
  factory: WorkerFactory = bullMqWorkerFactory
) {
  const connection = getQueueConnection(env);
  const concurrency = env.workerConcurrency || DEFAULT_WORKER_CONCURRENCY;

  const workers = buildWorkerDefinitions().map((definition) => {
    logger.info("registering worker queue", {
      queueName: definition.queueName,
      concurrency
    });

    return factory({
      definition,
      connection,
      concurrency
    });
  });

  logger.info("worker runtime started", {
    queues: WORKER_QUEUES
  });

  return {
    workers,
    async shutdown() {
      await Promise.all(workers.map((worker) => worker.close()));
      logger.info("worker runtime stopped");
    }
  };
}