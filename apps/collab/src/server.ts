import { Server } from "@hocuspocus/server";
import type { IncomingMessage, ServerResponse } from "node:http";

import { getCollabEnv, type CollabEnv } from "./config/env.js";

export interface CollabLogger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export function createCollabLogger(): CollabLogger {
  return {
    info(message, meta) {
      console.log(message, meta ?? {});
    },
    error(message, meta) {
      console.error(message, meta ?? {});
    }
  };
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json"
  });
  response.end(JSON.stringify(body));
}

export function handleCollabRequest(
  request: Pick<IncomingMessage, "url">,
  response: ServerResponse,
  metrics: {
    activeConnections: number;
    activeDocuments: number;
  }
) {
  if (request.url === "/health") {
    writeJson(response, 200, {
      service: "collab",
      status: "ok"
    });
    return true;
  }

  if (request.url === "/ready") {
    writeJson(response, 200, {
      activeConnections: metrics.activeConnections,
      activeDocuments: metrics.activeDocuments,
      service: "collab",
      status: "ready"
    });
    return true;
  }

  return false;
}

export function createCollabServer(
  env: CollabEnv = getCollabEnv(),
  logger: CollabLogger = createCollabLogger()
) {
  return new Server({
    address: env.host,
    debounce: 2000,
    maxDebounce: 10000,
    name: "collab",
    port: env.port,
    quiet: env.nodeEnv === "test",
    timeout: 30000,
    unloadImmediately: false,
    async onConnect(data) {
      logger.info("collab.connection.opened", {
        documentName: data.documentName,
        socketId: data.socketId
      });
    },
    async onDisconnect(data) {
      logger.info("collab.connection.closed", {
        documentName: data.documentName,
        socketId: data.socketId
      });
    },
    async onRequest({ instance, request, response }) {
      if (
        handleCollabRequest(request, response, {
          activeConnections: instance.getConnectionsCount(),
          activeDocuments: instance.getDocumentsCount()
        })
      ) {
        throw null;
      }
    }
  });
}
