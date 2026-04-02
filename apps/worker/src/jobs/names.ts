export const QUEUE_NAMES = {
  ai: "ai-jobs",
  export: "export-jobs",
  revision: "revision-jobs"
} as const;

export const WORKER_QUEUES = Object.values(QUEUE_NAMES);

export type QueueName = (typeof WORKER_QUEUES)[number];