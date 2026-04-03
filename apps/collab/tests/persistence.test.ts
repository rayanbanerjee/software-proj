import { describe, expect, it } from "vitest";
import * as Y from "yjs";

import { createCollabTestHarness } from "./harness.js";

describe("collab document persistence", () => {
  it("stores and reloads Yjs document state for the same document", async () => {
    const harness = createCollabTestHarness();
    const documentName = `doc-persist-${Date.now()}`;
    const firstPayload = harness.createHookPayload({ documentName });
    const persistedDocument = new Y.Doc();

    persistedDocument.getText("default").insert(0, "Hello persisted collaboration");

    await harness.server.configuration.onStoreDocument?.({
      ...firstPayload,
      clientsCount: 1,
      document: persistedDocument,
    } as never);

    const secondPayload = harness.createHookPayload({ documentName });
    const loaded = await harness.server.configuration.onLoadDocument?.(secondPayload as never);

    expect(loaded).toBeTruthy();

    const rehydrated = new Y.Doc();
    Y.applyUpdate(rehydrated, Y.encodeStateAsUpdate(loaded as Y.Doc));

    expect(rehydrated.getText("default").toString()).toContain("Hello persisted collaboration");
  });
});
