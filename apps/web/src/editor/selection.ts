type MinimalEditorLike = {
  isActive: (name: string, attributes?: Record<string, unknown>) => boolean;
  state: {
    selection: {
      empty: boolean;
      from: number;
      to: number;
    };
  };
};

export interface EditorSelectionSummary {
  empty: boolean;
  from: number;
  to: number;
  marks: {
    bold: boolean;
    italic: boolean;
    strike: boolean;
  };
  currentBlock: "code-block" | "paragraph" | "heading-1" | "heading-2" | "heading-3" | "unknown";
  currentList: "bulletList" | "none" | "orderedList";
  inBlockquote: boolean;
}

export function getCurrentBlock(editor: MinimalEditorLike | null): EditorSelectionSummary["currentBlock"] {
  if (!editor) {
    return "unknown";
  }

  if (editor.isActive("heading", { level: 1 })) {
    return "heading-1";
  }

  if (editor.isActive("heading", { level: 2 })) {
    return "heading-2";
  }

  if (editor.isActive("heading", { level: 3 })) {
    return "heading-3";
  }

  if (editor.isActive("codeBlock")) {
    return "code-block";
  }

  if (editor.isActive("paragraph")) {
    return "paragraph";
  }

  return "unknown";
}

export function getSelectionSummary(editor: MinimalEditorLike | null): EditorSelectionSummary {
  if (!editor) {
    return {
      empty: true,
      from: 0,
      to: 0,
      marks: {
        bold: false,
        italic: false,
        strike: false
      },
      currentBlock: "unknown",
      currentList: "none",
      inBlockquote: false
    };
  }

  return {
    empty: editor.state.selection.empty,
    from: editor.state.selection.from,
    to: editor.state.selection.to,
    marks: {
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike")
    },
    currentBlock: getCurrentBlock(editor),
    currentList: editor.isActive("bulletList")
      ? "bulletList"
      : editor.isActive("orderedList")
        ? "orderedList"
        : "none",
    inBlockquote: editor.isActive("blockquote")
  };
}

export function hasExpandedSelection(editor: MinimalEditorLike | null): boolean {
  return !getSelectionSummary(editor).empty;
}
