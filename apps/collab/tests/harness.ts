import { createHmac } from "node:crypto";

import type { CollabEnv } from "../src/config/env.js";
import type { CollabLogger } from "../src/server.js";
import { createCollabServer } from "../src/server.js";

type LoggedEntry = {
  message: string;
  meta: Record<string, unknown>;
};

type MockDocument = {
  broadcasts: string[];
  broadcastStateless: (payload: string) => void;
  name: string;
};

export function createSignedSessionToken(
  secret: string,
  overrides: Partial<Record<string, unknown>> = {}
) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const claims = {
    v: 1,
    provider: "google",
    sub: "google:user_owner",
    email: "owner@example.com",
    name: "Owner Demo",
    imageUrl: "https://example.com/avatar.png",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
    ...overrides
  };
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedClaims).digest("base64url");

  return `${encodedClaims}.${signature}`;
}

export function createCollabTestHarness() {
  const env: CollabEnv = {
    host: "127.0.0.1",
    nodeEnv: "test",
    port: 4100,
    sessionSecret: "secret"
  };
  const infoLogs: LoggedEntry[] = [];
  const errorLogs: LoggedEntry[] = [];
  const logger: CollabLogger = {
    info(message, meta) {
      infoLogs.push({
        message,
        meta: meta ?? {}
      });
    },
    error(message, meta) {
      errorLogs.push({
        message,
        meta: meta ?? {}
      });
    }
  };
  const server = createCollabServer(env, logger);

  function createDocument(name: string): MockDocument {
    return {
      name,
      broadcasts: [],
      broadcastStateless(payload: string) {
        this.broadcasts.push(payload);
      }
    };
  }

  function createConnection(documentName: string) {
    return {
      document: createDocument(documentName)
    };
  }

  function createHookPayload(options: {
    context?: Record<string, unknown>;
    documentName?: string;
    requestParameters?: URLSearchParams;
    socketId?: string;
  } = {}) {
    const documentName = options.documentName ?? "doc-1";
    const connection = createConnection(documentName);

    return {
      connection,
      connectionConfig: {
        isAuthenticated: true,
        readOnly: false
      },
      context: options.context ?? {},
      document: connection.document,
      documentName,
      instance: server.hocuspocus,
      request: {} as never,
      requestHeaders: {},
      requestParameters: options.requestParameters ?? new URLSearchParams(),
      socketId: options.socketId ?? "socket-1"
    };
  }

  return {
    env,
    errorLogs,
    infoLogs,
    server,
    createHookPayload,
    createSignedSessionTokenForTest(overrides: Partial<Record<string, unknown>> = {}) {
      return createSignedSessionToken(env.sessionSecret, overrides);
    }
  };
}
