import { afterEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";

import { createCollabTestHarness } from "./harness.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createProsemirrorDocument(text: string) {
  const document = new Y.Doc();
  const fragment = document.getXmlFragment("prosemirror");
  const lines = text.split("\n");
  const paragraphs = lines.map((line) => {
    const paragraph = new Y.XmlElement("paragraph");

    if (line.length > 0) {
      const textNode = new Y.XmlText();
      textNode.insert(0, line);
      paragraph.insert(0, [textNode]);
    }

    return paragraph;
  });

  fragment.insert(0, paragraphs);
  return document;
}

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

  it("writes persisted realtime content back into the API document store", async () => {
    const harness = createCollabTestHarness();
    const documentName = `doc-sync-${Date.now()}`;
    const payload = harness.createHookPayload({ documentName });
    const document = createProsemirrorDocument("Line one\nLine two");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 202
    });

    globalThis.fetch = fetchMock as typeof fetch;

    await harness.server.configuration.onStoreDocument?.({
      ...payload,
      clientsCount: 1,
      document
    } as never);

    expect(fetchMock).toHaveBeenCalledWith(
      `http://localhost:4000/internal/documents/${documentName}/content-sync`,
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-token": "secret"
        }
      })
    );

    const [, requestInit] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      richText: {
        type: "doc"
      },
      text: "Line one\nLine two"
    });
  });
});
