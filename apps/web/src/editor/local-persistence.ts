export const LOCAL_EDITOR_DRAFT_KEY_PREFIX = "collab-editor:draft";
export const LOCAL_EDITOR_DRAFT_DATABASE = "collab-editor-drafts";
export const LOCAL_EDITOR_DRAFT_STORE = "drafts";
export const LOCAL_EDITOR_RECOVERY_KEY_PREFIX = "collab-editor:recovery";

export function createLocalDraftKey(documentId: string): string {
  return `${LOCAL_EDITOR_DRAFT_KEY_PREFIX}:${documentId}`;
}

export function createRecoveryBufferKey(documentId: string): string {
  return `${LOCAL_EDITOR_RECOVERY_KEY_PREFIX}:${documentId}`;
}

export function readStoredDraft(
  storage: Pick<Storage, "getItem"> | undefined,
  key: string
): unknown | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeStoredDraft(
  storage: Pick<Storage, "setItem"> | undefined,
  key: string,
  content: unknown
): void {
  if (!storage) {
    return;
  }

  storage.setItem(key, JSON.stringify(content));
}

export interface EditorRecoveryBuffer {
  content: unknown;
  pendingWrites: number;
  savedAt: string;
  sourceStateVector: string | null;
}

export function readRecoveryBuffer(
  storage: Pick<Storage, "getItem"> | undefined,
  key: string
): EditorRecoveryBuffer | null {
  const parsed = readStoredDraft(storage, key);

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const candidate = parsed as Partial<EditorRecoveryBuffer>;

  if (
    typeof candidate.pendingWrites !== "number"
    || typeof candidate.savedAt !== "string"
    || !("content" in candidate)
    || (candidate.sourceStateVector !== null && typeof candidate.sourceStateVector !== "string")
  ) {
    return null;
  }

  return {
    content: candidate.content,
    pendingWrites: candidate.pendingWrites,
    savedAt: candidate.savedAt,
    sourceStateVector: candidate.sourceStateVector
  };
}

export function writeRecoveryBuffer(
  storage: Pick<Storage, "setItem"> | undefined,
  key: string,
  value: EditorRecoveryBuffer
) {
  writeStoredDraft(storage, key, value);
}

export function clearRecoveryBuffer(
  storage: Pick<Storage, "removeItem"> | undefined,
  key: string
) {
  storage?.removeItem(key);
}

export function shouldReplayRecoveryBuffer(options: {
  recoveryBuffer: EditorRecoveryBuffer | null;
  serverStateVector: string | null;
  syncState: "online" | "offline" | "reconnecting" | "recovered";
}) {
  if (!options.recoveryBuffer) {
    return false;
  }

  if (options.syncState === "online") {
    return false;
  }

  if (options.serverStateVector === null) {
    return options.recoveryBuffer.pendingWrites > 0;
  }

  return options.recoveryBuffer.sourceStateVector !== options.serverStateVector;
}

type IndexedDbRecord = {
  content: unknown;
  key: string;
  updatedAt: string;
};

interface IndexedDbLike {
  open: (name: string, version?: number) => IDBOpenDBRequest;
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB request failed.")));
  });
}

async function withDraftStore<T>(
  indexedDb: IndexedDbLike,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(LOCAL_EDITOR_DRAFT_DATABASE, 1);

    request.addEventListener("upgradeneeded", () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(LOCAL_EDITOR_DRAFT_STORE)) {
        db.createObjectStore(LOCAL_EDITOR_DRAFT_STORE, {
          keyPath: "key"
        });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("IndexedDB open failed.")));
  });

  try {
    const transaction = database.transaction(LOCAL_EDITOR_DRAFT_STORE, mode);
    const store = transaction.objectStore(LOCAL_EDITOR_DRAFT_STORE);
    const result = await callback(store);

    await new Promise<void>((resolve, reject) => {
      transaction.addEventListener("complete", () => resolve());
      transaction.addEventListener("error", () =>
        reject(transaction.error ?? new Error("IndexedDB transaction failed."))
      );
      transaction.addEventListener("abort", () =>
        reject(transaction.error ?? new Error("IndexedDB transaction aborted."))
      );
    });

    return result;
  } finally {
    database.close();
  }
}

export async function readStoredDraftFromIndexedDb(
  indexedDb: IndexedDbLike | undefined,
  key: string
): Promise<unknown | null> {
  if (!indexedDb) {
    return null;
  }

  try {
    const record = await withDraftStore(indexedDb, "readonly", async (store) => {
      const result = await promisifyRequest(store.get(key) as IDBRequest<IndexedDbRecord | undefined>);
      return result ?? null;
    });

    return record?.content ?? null;
  } catch {
    return null;
  }
}

export async function writeStoredDraftToIndexedDb(
  indexedDb: IndexedDbLike | undefined,
  key: string,
  content: unknown
): Promise<void> {
  if (!indexedDb) {
    return;
  }

  try {
    await withDraftStore(indexedDb, "readwrite", async (store) => {
      await promisifyRequest(
        store.put({
          content,
          key,
          updatedAt: new Date().toISOString()
        })
      );
    });
  } catch {
    return;
  }
}
