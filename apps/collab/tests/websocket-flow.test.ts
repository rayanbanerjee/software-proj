import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";

import { PresenceManager } from "../src/awareness/presence.js";
import { handleCollabRequest } from "../src/server.js";
import { WriterSlotManager } from "../src/writer-slots/manager.js";
import { createCollabTestHarness, createSignedSessionToken } from "./harness.js";

function createMockResponse() {
  let statusCode = 200;
  let body = "";

  return {
    response: {
      end(value: string) {
        body = value;
      },
      writeHead(nextStatusCode: number) {
        statusCode = nextStatusCode;
      }
    },
    readJson() {
      return {
        body: JSON.parse(body),
        statusCode
      };
    }
  };
}

describe("collab websocket flow", () => {
  it("rejects invalid websocket session tokens and logs the failed authentication", async () => {
    const harness = createCollabTestHarness();
    const payload = harness.createHookPayload({
      socketId: "socket-bad"
    });
    const token = createSignedSessionToken("wrong-secret");

    Object.assign(payload, { token });

    await expect(
      harness.server.configuration.onAuthenticate?.(payload as never)
    ).rejects.toThrow("Session token signature is invalid.");

    expect(
      harness.errorLogs.some((entry) =>
        entry.message === "collab.authentication.rejected"
        && entry.meta.socketId === "socket-bad"
        && entry.meta.reason === "Session token signature is invalid."
      )
    ).toBe(true);
  });

  it("keeps read-only websocket sessions out of active writer slots while preserving presence", async () => {
    const harness = createCollabTestHarness({
      accessLevel: "read",
      role: "viewer"
    });
    const token = harness.createSignedSessionTokenForTest({
      email: "viewer@example.com",
      name: "Viewer Demo",
      sub: "google:user_viewer"
    });
    const payload = harness.createHookPayload({
      requestParameters: new URLSearchParams([
        ["accessLevel", "write"]
      ]),
      socketId: "socket-read"
    });

    Object.assign(payload, { token });
    const connectContext = await harness.server.configuration.onConnect?.(payload as never);
    const authContext = await harness.server.configuration.onAuthenticate?.(payload as never);
    payload.context = {
      ...payload.context,
      ...connectContext,
      ...authContext
    };

    await harness.server.configuration.connected?.(payload as never);

    const writerSnapshot = JSON.parse(payload.document.broadcasts[0] ?? "{}");
    const presenceSnapshot = JSON.parse(payload.document.broadcasts[1] ?? "{}");

    expect(payload.context).toMatchObject({
      accessLevel: "read",
      presenceSessionId: "socket-read",
      user: {
        id: "google:user_viewer"
      }
    });
    expect(payload.connectionConfig.readOnly).toBe(true);
    expect(harness.accessRequests).toEqual([
      expect.objectContaining({
        body: {
          userId: "google:user_viewer"
        },
        url: "http://localhost:4000/internal/documents/doc-1/collab-access"
      })
    ]);
    expect(writerSnapshot).toMatchObject({
      type: "writer.slot.snapshot",
      documentId: "doc-1",
      activeWriterSessionIds: [],
      queuedWriterSessionIds: []
    });
    expect(presenceSnapshot).toMatchObject({
      type: "presence.snapshot",
      documentId: "doc-1",
      collaborators: [
        expect.objectContaining({
          sessionId: "socket-read",
          userId: "google:user_viewer",
          accessLevel: "read",
          connectionStatus: "active",
          isPresent: true,
          role: "viewer"
        })
      ]
    });
  });

  it("broadcasts websocket permission revocation snapshots that remove presence and writer access", async () => {
    const response = createMockResponse();
    const broadcasts: string[] = [];
    const request = new EventEmitter() as EventEmitter & {
      method: string;
      url: string;
    };
    request.method = "POST";
    request.url = "/internal/events/document-permission-update";

    const presence = new PresenceManager();
    const writerSlots = new WriterSlotManager();
    const logger = {
      child() {
        return logger;
      },
      info() {},
      warn() {},
      error() {}
    };
    const runtime = {
      documents: new Map([
        ["doc-1", {
          broadcastStateless(payload: string) {
            broadcasts.push(payload);
          }
        }]
      ]),
      presence,
      writerSlots
    };

    presence.upsertConnection("doc-1", "socket-1", {
      displayName: "Editor Demo",
      user: {
        id: "google:user_editor",
        name: "Editor Demo"
      }
    });
    writerSlots.registerConnection("doc-1", "socket-1", "google:user_editor", "write");

    const handledPromise = handleCollabRequest(request, response.response as never, {
      activeConnections: 1,
      activeDocuments: 1,
      logger,
      runtime
    });

    request.emit(
      "data",
      Buffer.from(
        JSON.stringify({
          type: "document.permission.updated",
          documentId: "doc-1",
          userId: "google:user_editor",
          role: null,
          accessLevel: "none",
          changedAt: "2026-04-18T10:00:00.000Z",
          triggeredByUserId: "google:user_owner"
        })
      )
    );
    request.emit("end");

    const handled = await handledPromise;
    const permissionEvent = JSON.parse(broadcasts[0] ?? "{}");
    const writerSnapshot = JSON.parse(broadcasts[1] ?? "{}");
    const presenceSnapshot = JSON.parse(broadcasts[2] ?? "{}");

    expect(handled).toBe(true);
    expect(permissionEvent).toMatchObject({
      type: "document.permission.updated",
      documentId: "doc-1",
      userId: "google:user_editor",
      accessLevel: "none"
    });
    expect(writerSnapshot).toMatchObject({
      type: "writer.slot.snapshot",
      documentId: "doc-1",
      activeWriterSessionIds: [],
      queuedWriterSessionIds: []
    });
    expect(presenceSnapshot).toMatchObject({
      type: "presence.snapshot",
      documentId: "doc-1",
      collaborators: []
    });
    expect(response.readJson()).toEqual({
      body: {
        broadcasted: true,
        status: "accepted"
      },
      statusCode: 202
    });
  });
});
