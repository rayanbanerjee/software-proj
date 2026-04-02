import { describe, expect, it } from "vitest";

import {
  getEditorModeLabel,
  isEditorReadOnly
} from "../src/editor/access";
import {
  LOCAL_EDITOR_DRAFT_DATABASE,
  LOCAL_EDITOR_DRAFT_KEY_PREFIX,
  LOCAL_EDITOR_RECOVERY_KEY_PREFIX,
  LOCAL_EDITOR_DRAFT_STORE,
  clearRecoveryBuffer,
  createRecoveryBufferKey,
  createLocalDraftKey,
  readRecoveryBuffer,
  readStoredDraft,
  readStoredDraftFromIndexedDb,
  shouldReplayRecoveryBuffer,
  writeRecoveryBuffer,
  writeStoredDraftToIndexedDb
} from "../src/editor/local-persistence";
import {
  getCurrentBlock,
  getSelectionSummary,
  hasExpandedSelection
} from "../src/editor/selection";

describe("editor local persistence", () => {
  class FakeRequest<T> {
    error: Error | null = null;
    result: T;
    private readonly listeners = new Map<string, Array<() => void>>();

    constructor(result: T) {
      this.result = result;
    }

    addEventListener(event: string, listener: () => void) {
      const current = this.listeners.get(event) ?? [];
      current.push(listener);
      this.listeners.set(event, current);
    }

    dispatch(event: string) {
      for (const listener of this.listeners.get(event) ?? []) {
        listener();
      }
    }
  }

  class FakeTransaction {
    error: Error | null = null;
    private readonly listeners = new Map<string, Array<() => void>>();

    constructor(private readonly records: Map<string, unknown>) {}

    addEventListener(event: string, listener: () => void) {
      const current = this.listeners.get(event) ?? [];
      current.push(listener);
      this.listeners.set(event, current);
    }

    complete() {
      setTimeout(() => {
        for (const listener of this.listeners.get("complete") ?? []) {
          listener();
        }
      }, 0);
    }

    objectStore(name: string) {
      expect(name).toBe(LOCAL_EDITOR_DRAFT_STORE);

      return {
        get: (key: string) => {
          const request = new FakeRequest<{ content: unknown; key: string; updatedAt: string } | undefined>(
            this.records.has(key)
              ? {
                  content: this.records.get(key),
                  key,
                  updatedAt: "2026-04-02T19:00:00.000Z"
                }
              : undefined
          );

          queueMicrotask(() => {
            request.dispatch("success");
            this.complete();
          });

          return request;
        },
        put: (value: { content: unknown; key: string }) => {
          this.records.set(value.key, value.content);
          const request = new FakeRequest(value);

          queueMicrotask(() => {
            request.dispatch("success");
            this.complete();
          });

          return request;
        }
      };
    }
  }

  class FakeDatabase {
    objectStoreNames = {
      contains: (name: string) => name === LOCAL_EDITOR_DRAFT_STORE
    };

    constructor(private readonly records: Map<string, unknown>) {}

    close() {
      return;
    }

    createObjectStore() {
      return;
    }

    transaction(name: string) {
      expect(name).toBe(LOCAL_EDITOR_DRAFT_STORE);
      return new FakeTransaction(this.records);
    }
  }

  class FakeIndexedDb {
    private readonly records = new Map<string, unknown>();

    open(name: string) {
      expect(name).toBe(LOCAL_EDITOR_DRAFT_DATABASE);
      const request = new FakeRequest(new FakeDatabase(this.records));

      queueMicrotask(() => {
        request.dispatch("upgradeneeded");
        request.dispatch("success");
      });

      return request as unknown as IDBOpenDBRequest;
    }
  }

  it("builds a stable local draft key per document", () => {
    expect(createLocalDraftKey("project-kickoff")).toBe(
      `${LOCAL_EDITOR_DRAFT_KEY_PREFIX}:project-kickoff`
    );
    expect(createRecoveryBufferKey("project-kickoff")).toBe(
      `${LOCAL_EDITOR_RECOVERY_KEY_PREFIX}:project-kickoff`
    );
  });

  it("parses stored JSON drafts and ignores invalid payloads", () => {
    expect(
      readStoredDraft(
        {
          getItem: () => "{\"type\":\"doc\"}"
        },
        "draft"
      )
    ).toEqual({ type: "doc" });

    expect(
      readStoredDraft(
        {
          getItem: () => "{not-json"
        },
        "draft"
      )
    ).toBeNull();
  });

  it("stores and reads drafts through the IndexedDB helper", async () => {
    const indexedDb = new FakeIndexedDb();
    const key = createLocalDraftKey("project-kickoff");

    await writeStoredDraftToIndexedDb(indexedDb as never, key, { type: "doc", version: 1 });

    await expect(readStoredDraftFromIndexedDb(indexedDb as never, key)).resolves.toEqual({
      type: "doc",
      version: 1
    });
  });

  it("stores replayable recovery buffers for reconnect flows", () => {
    const storage = new Map<string, string>();
    const key = createRecoveryBufferKey("project-kickoff");

    writeRecoveryBuffer(
      {
        setItem(itemKey, value) {
          storage.set(itemKey, value);
        }
      },
      key,
      {
        content: { type: "doc", version: 2 },
        pendingWrites: 1,
        savedAt: "2026-04-02T19:30:00.000Z",
        sourceStateVector: "sv-local"
      }
    );

    expect(
      readRecoveryBuffer(
        {
          getItem(itemKey) {
            return storage.get(itemKey) ?? null;
          }
        },
        key
      )
    ).toEqual({
      content: { type: "doc", version: 2 },
      pendingWrites: 1,
      savedAt: "2026-04-02T19:30:00.000Z",
      sourceStateVector: "sv-local"
    });
    expect(
      shouldReplayRecoveryBuffer({
        recoveryBuffer: readRecoveryBuffer(
          {
            getItem(itemKey) {
              return storage.get(itemKey) ?? null;
            }
          },
          key
        ),
        serverStateVector: "sv-remote",
        syncState: "reconnecting"
      })
    ).toBe(true);

    clearRecoveryBuffer(
      {
        removeItem(itemKey) {
          storage.delete(itemKey);
        }
      },
      key
    );

    expect(storage.has(key)).toBe(false);
  });
});

describe("editor access helpers", () => {
  it("marks commenter mode as read-only and owner mode as editable", () => {
    expect(isEditorReadOnly("commenter")).toBe(true);
    expect(isEditorReadOnly("owner")).toBe(false);
    expect(getEditorModeLabel("editor")).toBe("editable");
    expect(getEditorModeLabel("commenter")).toBe("read-only");
  });
});

describe("editor selection helpers", () => {
  const baseEditor = {
    state: {
      selection: {
        empty: false,
        from: 4,
        to: 12
      }
    },
    isActive(name: string, attributes?: Record<string, unknown>) {
      if (name === "heading" && attributes?.level === 2) {
        return true;
      }

      return false;
    }
  };

  it("summarizes selection coordinates and current block", () => {
    expect(getSelectionSummary(baseEditor)).toEqual({
      empty: false,
      from: 4,
      to: 12,
      currentBlock: "heading-2"
    });
  });

  it("detects expanded selections and unknown editors safely", () => {
    expect(hasExpandedSelection(baseEditor)).toBe(true);
    expect(hasExpandedSelection(null)).toBe(false);
    expect(getCurrentBlock(null)).toBe("unknown");
  });
});
