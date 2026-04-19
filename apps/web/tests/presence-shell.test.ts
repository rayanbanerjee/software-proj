import { describe, expect, it } from "vitest";

import { getPresenceEmptyStateCopy } from "../src/components/documents/presence-shell";

describe("presence shell empty-state copy", () => {
  it("shows collaborator copy when the realtime session is connected", () => {
    expect(getPresenceEmptyStateCopy("connected")).toBe("No active collaborators");
  });

  it("shows connecting copy while the realtime session is starting", () => {
    expect(getPresenceEmptyStateCopy("idle")).toBe("Connecting presence...");
    expect(getPresenceEmptyStateCopy("connecting")).toBe("Connecting presence...");
  });

  it("avoids claiming the client is offline for reconnect and error states", () => {
    expect(getPresenceEmptyStateCopy("disconnected")).toBe("Presence unavailable right now");
    expect(getPresenceEmptyStateCopy("error")).toBe("Presence unavailable right now");
  });
});
