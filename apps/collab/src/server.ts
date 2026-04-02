import { Server } from "@hocuspocus/server";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  PresenceManager,
  PRESENCE_STALE_TIMEOUT_MS,
  PRESENCE_SWEEP_INTERVAL_MS
} from "./awareness/presence.js";
import { requireCollabSession, type CollabSessionContext } from "./auth/session.js";
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
  const presence = new PresenceManager();
  const server = new Server({
    address: env.host,
    debounce: 2000,
    maxDebounce: 10000,
    name: "collab",
    port: env.port,
    quiet: env.nodeEnv === "test",
    timeout: 30000,
    unloadImmediately: false,
    async onConnect(data) {
      try {
        const sessionContext = requireCollabSession(data.requestParameters, env);

        data.context = {
          ...(data.context as Record<string, unknown> | undefined),
          reconnectSessionId: data.requestParameters.get("lastKnownSessionId"),
          presenceSessionId: data.socketId,
          session: sessionContext.session,
          user: sessionContext.user
        } satisfies CollabSessionContext;
      } catch (error) {
        logger.error("collab.connection.rejected", {
          documentName: data.documentName,
          reason: error instanceof Error ? error.message : "Invalid session token.",
          socketId: data.socketId
        });

        throw error;
      }
    },
    async connected(data) {
      const context = data.context as CollabSessionContext & {
        presenceSessionId?: string;
      };
      const document = data.connection.document;

      if (context.user && context.presenceSessionId) {
        const resumed = presence.resumeConnection(
          document.name,
          context.presenceSessionId,
          context.reconnectSessionId,
          {
          displayName: context.user.name,
          user: context.user
          }
        );
        document.broadcastStateless(JSON.stringify(presence.buildSnapshotEvent(document.name)));

        if (resumed.resumedFromSessionId) {
          logger.info("collab.connection.resumed", {
            documentName: document.name,
            resumedFromSessionId: resumed.resumedFromSessionId,
            socketId: data.socketId,
            userId: context.user.id
          });
        }
      }

      logger.info("collab.connection.opened", {
        documentName: data.documentName,
        userId:
          typeof data.context === "object" && data.context && "user" in data.context
            ? (data.context.user as { id?: string }).id ?? null
            : null,
        socketId: data.socketId
      });
    },
    async onAwarenessUpdate(data) {
      const context = data.context as CollabSessionContext & {
        presenceSessionId?: string;
      };

      if (!context.user || !context.presenceSessionId) {
        return;
      }

      const updated = presence.markAwarenessActive(data.documentName, context.presenceSessionId);

      if (!updated) {
        return;
      }

      data.document.broadcastStateless(JSON.stringify(presence.buildSnapshotEvent(data.documentName)));
    },
    async onDisconnect(data) {
      const context = data.context as CollabSessionContext & {
        presenceSessionId?: string;
      };

      if (context.presenceSessionId) {
        presence.removeConnection(data.documentName, context.presenceSessionId);
        data.document.broadcastStateless(JSON.stringify(presence.buildSnapshotEvent(data.documentName)));
      }

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
    },
    async onDestroy() {
      clearInterval(presenceSweep);
    }
  });
  const presenceSweep = setInterval(() => {
    const prunedDocuments = presence.pruneStaleConnections(
      Date.now(),
      PRESENCE_STALE_TIMEOUT_MS
    );

    for (const { documentId, removed } of prunedDocuments) {
      const document = server.hocuspocus.documents.get(documentId);

      if (!document) {
        continue;
      }

      document.broadcastStateless(JSON.stringify(presence.buildSnapshotEvent(documentId)));
      logger.info("collab.presence.pruned", {
        documentId,
        removedCount: removed.length
      });
    }
  }, PRESENCE_SWEEP_INTERVAL_MS);

  presenceSweep.unref();

  return server;
}
