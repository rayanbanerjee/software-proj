import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { WORKER_QUEUES } from "./jobs/names.js";
import type { WorkerLogger } from "./logger.js";

export interface WorkerReadinessState {
  workerCount: number;
}

function writeJson(response: ServerResponse, statusCode: number, body: Record<string, unknown>) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(body));
}

export function handleWorkerHealthRequest(
  request: IncomingMessage,
  response: ServerResponse,
  state: WorkerReadinessState
) {
  if (request.url === "/health") {
    writeJson(response, 200, {
      service: "worker",
      status: "ok"
    });
    return true;
  }

  if (request.url === "/ready") {
    writeJson(response, 200, {
      queues: WORKER_QUEUES,
      service: "worker",
      status: "ready",
      workerCount: state.workerCount
    });
    return true;
  }

  return false;
}

export function startWorkerHealthServer(
  port: number,
  state: WorkerReadinessState,
  logger: WorkerLogger
): Promise<Server> {
  const server = createServer((request, response) => {
    if (handleWorkerHealthRequest(request, response, state)) {
      return;
    }

    response.writeHead(404, {
      "Content-Type": "application/json"
    });
    response.end(
      JSON.stringify({
        error: "Not found"
      })
    );
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "0.0.0.0", () => {
      logger.info("worker.health_server.started", {
        port
      });
      resolve(server);
    });
  });
}
