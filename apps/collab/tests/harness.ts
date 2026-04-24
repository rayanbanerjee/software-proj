import { createHmac } from "node:crypto";

import type { CollabEnv } from "../src/config/env.js";
import type { CollabLogger } from "../src/logger.js";
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
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const claims = {
    iss: "collab-editor-api",
    sub: "jwt:user_owner",
    email: "owner@example.com",
    name: "Owner Demo",
    imageUrl: "https://example.com/avatar.png",
    iat: nowSeconds,
    exp: nowSeconds + 3600,
    ...overrides
  };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest("base64url");

  return `${signingInput}.${signature}`;
}

export function createCollabTestHarness(options: {
  accessLevel?: "read" | "write";
  role?: "owner" | "editor" | "commenter" | "viewer";
} = {}) {
  const env: CollabEnv = {
    apiInternalUrl: "http://localhost:4000",
    host: "127.0.0.1",
    jwtIssuer: "collab-editor-api",
    nodeEnv: "test",
    port: 4100,
    sessionSecret: "secret"
  };
  const infoLogs: LoggedEntry[] = [];
  const errorLogs: LoggedEntry[] = [];
  const logger: CollabLogger = {
    child() {
      return logger;
    },
    info(message, meta) {
      infoLogs.push({
        message,
        meta: meta ?? {}
      });
    },
    warn(message, meta) {
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
  const accessRequests: Array<{
    body: unknown;
    headers: HeadersInit | undefined;
    url: string;
  }> = [];

  const fetchMock = async (input: string | URL | Request, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;

    accessRequests.push({
      body,
      headers: init?.headers,
      url: String(input)
    });

    return new Response(JSON.stringify({
      accessLevel: options.accessLevel ?? "write",
      documentId: "doc-1",
      role: options.role ?? "owner",
      userId: typeof body?.userId === "string" ? body.userId : "google:user_owner"
    }), {
      headers: {
        "content-type": "application/json"
      },
      status: 200
    });
  };

  const server = createCollabServer(env, logger, {
    accessFetch: fetchMock
  });

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
    accessRequests,
    server,
    createHookPayload,
    createSignedSessionTokenForTest(overrides: Partial<Record<string, unknown>> = {}) {
      return createSignedSessionToken(env.sessionSecret, overrides);
    }
  };
}
