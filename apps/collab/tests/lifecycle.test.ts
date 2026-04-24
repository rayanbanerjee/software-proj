import { describe, expect, it } from "vitest";

import { createCollabTestHarness } from "./harness.js";

describe("collab lifecycle hooks", () => {
  it("runs connect, awareness, reconnect, and disconnect through the server hook configuration", async () => {
    const harness = createCollabTestHarness();
    const token = harness.createSignedSessionTokenForTest();

    const firstPayload = harness.createHookPayload({
      requestParameters: new URLSearchParams([
        ["token", token]
      ]),
      socketId: "socket-1"
    });

    Object.assign(firstPayload, { token });
    const firstConnectContext = await harness.server.configuration.onConnect?.(firstPayload as never);
    const firstAuthContext = await harness.server.configuration.onAuthenticate?.(firstPayload as never);
    firstPayload.context = {
      ...firstPayload.context,
      ...firstConnectContext,
      ...firstAuthContext
    };
    await harness.server.configuration.connected?.(firstPayload as never);
    await harness.server.configuration.onAwarenessUpdate?.(firstPayload as never);

    const firstBroadcast = JSON.parse(firstPayload.document.broadcasts.at(-1) ?? "{}");

    expect(firstPayload.context).toMatchObject({
      presenceSessionId: "socket-1",
      reconnectSessionId: null,
      user: {
        id: "jwt:user_owner"
      }
    });
    expect(firstBroadcast).toMatchObject({
      type: "presence.snapshot",
      documentId: "doc-1",
      collaborators: [
        expect.objectContaining({
          sessionId: "socket-1",
          userId: "jwt:user_owner",
          connectionStatus: "active",
          isPresent: true
        })
      ]
    });

    await harness.server.configuration.onDisconnect?.(firstPayload as never);
    await harness.server.configuration.onChange?.({
      ...firstPayload,
      clientsCount: 1,
      transactionOrigin: {},
      update: new Uint8Array()
    } as never);

    const revivedBroadcast = JSON.parse(firstPayload.document.broadcasts.at(-1) ?? "{}");

    expect(revivedBroadcast).toMatchObject({
      type: "presence.snapshot",
      documentId: "doc-1",
      collaborators: [
        expect.objectContaining({
          sessionId: "socket-1",
          userId: "jwt:user_owner",
          connectionStatus: "active",
          isPresent: true
        })
      ]
    });

    await harness.server.configuration.onDisconnect?.(firstPayload as never);

    const reconnectPayload = harness.createHookPayload({
      requestParameters: new URLSearchParams([
        ["lastKnownSessionId", "socket-1"],
        ["stateVector", "sv-42"]
      ]),
      socketId: "socket-2"
    });

    Object.assign(reconnectPayload, { token });
    const reconnectConnectContext = await harness.server.configuration.onConnect?.(reconnectPayload as never);
    const reconnectAuthContext = await harness.server.configuration.onAuthenticate?.(reconnectPayload as never);
    reconnectPayload.context = {
      ...reconnectPayload.context,
      ...reconnectConnectContext,
      ...reconnectAuthContext
    };
    await harness.server.configuration.connected?.(reconnectPayload as never);

    const reconnectBroadcast = JSON.parse(reconnectPayload.document.broadcasts.at(-1) ?? "{}");

    expect(reconnectBroadcast).toMatchObject({
      collaborators: [
        expect.objectContaining({
          sessionId: "socket-2",
          userId: "jwt:user_owner",
          connectionStatus: "active"
        })
      ]
    });
    expect(reconnectBroadcast.collaborators).toHaveLength(1);
    expect(
      harness.infoLogs.some((entry) =>
        entry.message === "collab.connection.resumed"
        && entry.meta.resumedFromSessionId === "socket-1"
        && entry.meta.stateVector === "sv-42"
      )
    ).toBe(true);
  });
});
