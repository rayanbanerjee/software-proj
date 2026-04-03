import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@hocuspocus/server";
import type { IncomingMessage, ServerResponse } from "node:http";
import { StringDecoder } from "node:string_decoder";
import * as Y from "yjs";

import type {
  DocumentPermissionUpdatedEvent,
  DocumentRollbackEvent,
  SessionAccessLevel
} from "@repo/shared-types";

import {
  PresenceManager,
  PRESENCE_STALE_TIMEOUT_MS,
  PRESENCE_SWEEP_INTERVAL_MS
} from "./awareness/presence.js";
import { verifyCollabSessionToken, type CollabSessionContext } from "./auth/session.js";
import { getCollabEnv, type CollabEnv } from "./config/env.js";
import { createCollabLogger, type CollabLogger } from "./logger.js";
import { isDocumentPermissionUpdatedEvent } from "./permissions/events.js";
import { WriterSlotManager } from "./writer-slots/manager.js";

type CollabDocumentRuntime = {
  broadcastStateless: (payload: string) => void;
};

type CollabDocumentsRuntime = {
  documents: Map<string, CollabDocumentRuntime>;
};

type JsonReadableRequest = Pick<IncomingMessage, "method" | "url"> & {
  on: (
    event: "data" | "end" | "error",
    listener: ((chunk: Buffer | string) => void) | (() => void) | ((error: Error) => void)
  ) => JsonReadableRequest;
};

type InternalCollabRuntime = CollabDocumentsRuntime & {
  presence?: PresenceManager;
  writerSlots?: WriterSlotManager;
};

const COLLAPSE_DATA_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "documents"
);

function sanitizeDocumentName(documentName: string) {
  return documentName.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function getDocumentStoragePath(documentName: string) {
  return join(COLLAPSE_DATA_DIR, `${sanitizeDocumentName(documentName)}.bin`);
}

function ensureDocumentStorageDir() {
  mkdirSync(COLLAPSE_DATA_DIR, { recursive: true });
}

function readStoredDocumentUpdate(documentName: string) {
  try {
    return readFileSync(getDocumentStoragePath(documentName));
  } catch {
    return null;
  }
}

function writeStoredDocumentUpdate(documentName: string, state: Uint8Array) {
  ensureDocumentStorageDir();
  writeFileSync(getDocumentStoragePath(documentName), Buffer.from(state));
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

function readJsonBody(request: JsonReadableRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder("utf8");
    let body = "";

    request.on("data", (chunk: Buffer | string) => {
      body += decoder.write(chunk);
    });

    request.on("end", () => {
      body += decoder.end();

      if (!body.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function isDocumentRollbackEvent(value: unknown): value is DocumentRollbackEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DocumentRollbackEvent>;

  return (
    candidate.type === "document.rollback"
    && typeof candidate.documentId === "string"
    && typeof candidate.revisionId === "string"
    && typeof candidate.rolledBackAt === "string"
    && typeof candidate.triggeredByUserId === "string"
  );
}

export function emitRollbackEvent(
  runtime: CollabDocumentsRuntime,
  event: DocumentRollbackEvent
): boolean {
  const document = runtime.documents.get(event.documentId);

  if (!document) {
    return false;
  }

  document.broadcastStateless(JSON.stringify(event));
  return true;
}

export function emitPermissionUpdatedEvent(
  runtime: InternalCollabRuntime,
  event: DocumentPermissionUpdatedEvent
): boolean {
  const document = runtime.documents.get(event.documentId);

  runtime.writerSlots?.updateUserAccess(event.documentId, event.userId, event.accessLevel);

  if (event.accessLevel === "none") {
    runtime.presence?.removeConnectionsForUser(event.documentId, event.userId);
  }

  if (!document) {
    return false;
  }

  document.broadcastStateless(JSON.stringify(event));

  if (runtime.writerSlots) {
    document.broadcastStateless(JSON.stringify(runtime.writerSlots.buildSnapshotEvent(event.documentId)));
  }

  if (runtime.presence && event.accessLevel === "none") {
    document.broadcastStateless(JSON.stringify(runtime.presence.buildSnapshotEvent(event.documentId)));
  }

  return true;
}

export function handleCollabRequest(
  request: JsonReadableRequest,
  response: ServerResponse,
  options: {
    activeConnections: number;
    activeDocuments: number;
    logger: CollabLogger;
    runtime: InternalCollabRuntime;
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
      activeConnections: options.activeConnections,
      activeDocuments: options.activeDocuments,
      service: "collab",
      status: "ready"
    });
    return true;
  }

  if (request.url === "/internal/events/document-rollback" && request.method === "POST") {
    return readJsonBody(request)
      .then((body) => {
        if (!isDocumentRollbackEvent(body)) {
          writeJson(response, 400, {
            error: "Invalid rollback event payload."
          });
          return true;
        }

        const broadcasted = emitRollbackEvent(options.runtime, body);

        options.logger.info("collab.document.rollback", {
          documentId: body.documentId,
          revisionId: body.revisionId,
          rolledBackAt: body.rolledBackAt,
          broadcasted,
          triggeredByUserId: body.triggeredByUserId
        });

        writeJson(response, 202, {
          broadcasted,
          status: "accepted"
        });
        return true;
      })
      .catch(() => {
        writeJson(response, 400, {
          error: "Invalid rollback event payload."
        });
        return true;
      });
  }

  if (request.url === "/internal/events/document-permission-update" && request.method === "POST") {
    return readJsonBody(request)
      .then((body) => {
        if (!isDocumentPermissionUpdatedEvent(body)) {
          writeJson(response, 400, {
            error: "Invalid permission event payload."
          });
          return true;
        }

        const broadcasted = emitPermissionUpdatedEvent(options.runtime, body);

        options.logger.info("collab.document.permission_updated", {
          accessLevel: body.accessLevel,
          broadcasted,
          documentId: body.documentId,
          role: body.role,
          triggeredByUserId: body.triggeredByUserId,
          userId: body.userId
        });

        writeJson(response, 202, {
          broadcasted,
          status: "accepted"
        });
        return true;
      })
      .catch(() => {
        writeJson(response, 400, {
          error: "Invalid permission event payload."
        });
        return true;
      });
  }

  return false;
}

export function createCollabServer(
  env: CollabEnv = getCollabEnv(),
  logger: CollabLogger = createCollabLogger()
) {
  const presence = new PresenceManager();
  const persistedStates = new Map<string, Uint8Array>();
  const writerSlots = new WriterSlotManager();
  const server = new Server({
    address: env.host,
    debounce: 2000,
    maxDebounce: 10000,
    name: "collab",
    port: env.port,
    quiet: env.nodeEnv === "test",
    timeout: 30000,
    unloadImmediately: false,
    async onAuthenticate(data) {
      try {
        const sessionContext = verifyCollabSessionToken(data.token, env.sessionSecret);

        return {
          session: sessionContext.session,
          user: sessionContext.user
        } satisfies Pick<CollabSessionContext, "session" | "user">;
      } catch (error) {
        logger.error("collab.authentication.rejected", {
          documentName: data.documentName,
          reason: error instanceof Error ? error.message : "Invalid session token.",
          socketId: data.socketId
        });

        throw error;
      }
    },
    async onLoadDocument(data) {
      const inMemoryState = persistedStates.get(data.documentName);
      const storedState = inMemoryState ?? readStoredDocumentUpdate(data.documentName);

      if (!storedState) {
        return null;
      }

      const document = new Y.Doc();
      Y.applyUpdate(document, storedState);
      return document;
    },
    async onStoreDocument(data) {
      const state = Y.encodeStateAsUpdate(data.document);

      persistedStates.set(data.documentName, state);
      writeStoredDocumentUpdate(data.documentName, state);

      logger.info("collab.document.stored", {
        bytes: state.byteLength,
        documentName: data.documentName
      });
    },
    async onConnect(data) {
      return {
        accessLevel: (data.requestParameters.get("accessLevel") === "read" ? "read" : "write") as SessionAccessLevel,
        reconnectSessionId: data.requestParameters.get("lastKnownSessionId"),
        presenceSessionId: data.socketId,
        stateVector: data.requestParameters.get("stateVector")
      } satisfies Omit<CollabSessionContext, "session" | "user">;
    },
    async connected(data) {
      const context = data.context as CollabSessionContext & {
        accessLevel?: SessionAccessLevel;
        presenceSessionId?: string;
      };
      const document = data.connection.document;

      if (context.user && context.presenceSessionId) {
        writerSlots.registerConnection(
          document.name,
          context.presenceSessionId,
          context.user.id,
          context.accessLevel ?? "write"
        );
        const resumed = presence.resumeConnection(
          document.name,
          context.presenceSessionId,
          context.reconnectSessionId,
          {
          displayName: context.user.name,
          user: context.user
          }
        );
        document.broadcastStateless(JSON.stringify(writerSlots.buildSnapshotEvent(document.name)));
        document.broadcastStateless(JSON.stringify(presence.buildSnapshotEvent(document.name)));

        if (resumed.resumedFromSessionId) {
          logger.info("collab.connection.resumed", {
            documentName: document.name,
            stateVector: context.stateVector,
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
        writerSlots.removeConnection(data.documentName, context.presenceSessionId);
        presence.removeConnection(data.documentName, context.presenceSessionId);
        data.document.broadcastStateless(JSON.stringify(writerSlots.buildSnapshotEvent(data.documentName)));
        data.document.broadcastStateless(JSON.stringify(presence.buildSnapshotEvent(data.documentName)));
      }

      logger.info("collab.connection.closed", {
        documentName: data.documentName,
        socketId: data.socketId
      });
    },
    async onRequest({ instance, request, response }) {
      const handled = await handleCollabRequest(request, response, {
          activeConnections: instance.getConnectionsCount(),
          activeDocuments: instance.getDocumentsCount(),
          logger,
          runtime: {
            documents: instance.documents,
            presence,
            writerSlots
          }
        });

      if (handled) {
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

      document.broadcastStateless(JSON.stringify(writerSlots.buildSnapshotEvent(documentId)));
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
