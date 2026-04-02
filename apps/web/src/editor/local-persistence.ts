export const LOCAL_EDITOR_DRAFT_KEY_PREFIX = "collab-editor:draft";

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
