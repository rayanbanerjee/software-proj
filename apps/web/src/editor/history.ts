type MinimalHistoryEditor = {
  can: () => {
    chain: () => {
      focus: () => {
        undo: () => { run: () => boolean };
        redo: () => { run: () => boolean };
      };
    };
  };
  chain: () => {
    focus: () => {
      undo: () => { run: () => boolean };
      redo: () => { run: () => boolean };
    };
  };
};

export interface EditorHistoryState {
  canRedo: boolean;
  canUndo: boolean;
}

export function getEditorHistoryState(editor: MinimalHistoryEditor | null): EditorHistoryState {
  if (!editor) {
    return {
      canRedo: false,
      canUndo: false
    };
  }

  return {
    canUndo: editor.can().chain().focus().undo().run(),
    canRedo: editor.can().chain().focus().redo().run()
  };
}

export function runUndo(editor: MinimalHistoryEditor | null): boolean {
  if (!editor) {
    return false;
  }

  return editor.chain().focus().undo().run();
}

export function runRedo(editor: MinimalHistoryEditor | null): boolean {
  if (!editor) {
    return false;
  }

  return editor.chain().focus().redo().run();
}
