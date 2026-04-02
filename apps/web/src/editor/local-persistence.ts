export const LOCAL_EDITOR_DRAFT_KEY_PREFIX = "collab-editor:draft";
export const LOCAL_EDITOR_DRAFT_DATABASE = "collab-editor-drafts";
export const LOCAL_EDITOR_DRAFT_STORE = "drafts";

export function createLocalDraftKey(documentId: string): string {
  return `${LOCAL_EDITOR_DRAFT_KEY_PREFIX}:${documentId}`;
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
