"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { minimalEditorExtensions } from "@repo/editor-schema";

import {
  createLocalDraftKey,
  readStoredDraft,
  writeStoredDraft
} from "./local-persistence";
import {
  getEditorHistoryState,
  runRedo,
  runUndo
} from "./history";
import { getSelectionSummary } from "./selection";

const starterContent = `
  <h1>Editor foundation</h1>
  <p>
    This base TipTap surface is mounted inside the document route so later tasks can layer
    persistence, selection helpers, and collaboration behavior on top of a real editor.
  </p>
  <p>
    The initial schema supports headings, paragraphs, and plain text content.
  </p>
`;

interface BaseEditorProps {
  documentId?: string;
}

export function BaseEditor({ documentId = "route-shell-document" }: BaseEditorProps) {
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "base-editor-content"
      }
    },
    content: starterContent,
    extensions: [...minimalEditorExtensions],
    onUpdate({ editor: currentEditor }) {
      if (typeof window === "undefined") {
        return;
      }

      writeStoredDraft(
        window.localStorage,
        createLocalDraftKey(documentId),
        currentEditor.getJSON()
      );
    }
  });

  useEffect(() => {
    if (!editor || typeof window === "undefined" || hasHydratedDraft) {
      return;
    }

    const storedDraft = readStoredDraft(
      window.localStorage,
      createLocalDraftKey(documentId)
    );

    if (storedDraft) {
      editor.commands.setContent(storedDraft);
    }

    setHasHydratedDraft(true);
  }, [documentId, editor, hasHydratedDraft]);

  const selection = getSelectionSummary(editor);
  const history = getEditorHistoryState(editor);

  function setParagraph() {
    editor?.chain().focus().setParagraph().run();
  }

  function setHeading(level: 1 | 2 | 3) {
    editor?.chain().focus().toggleHeading({ level }).run();
  }

  return (
    <section className="base-editor-shell">
      <div className="base-editor-header">
        <span className="workspace-kicker">EDIT-002</span>
        <h3>Base editor component</h3>
        <p>TipTap is mounted and ready for richer editor behavior in follow-up tasks.</p>
      </div>

      <div className="base-editor-toolbar" aria-label="Editor block controls">
        <button
          className={`base-editor-button${selection.currentBlock === "paragraph" ? " base-editor-button-active" : ""}`}
          onClick={setParagraph}
          type="button"
        >
          Paragraph
        </button>
        <button
          className={`base-editor-button${selection.currentBlock === "heading-1" ? " base-editor-button-active" : ""}`}
          onClick={() => setHeading(1)}
          type="button"
        >
          H1
        </button>
        <button
          className={`base-editor-button${selection.currentBlock === "heading-2" ? " base-editor-button-active" : ""}`}
          onClick={() => setHeading(2)}
          type="button"
        >
          H2
        </button>
        <button
          className={`base-editor-button${selection.currentBlock === "heading-3" ? " base-editor-button-active" : ""}`}
          onClick={() => setHeading(3)}
          type="button"
        >
          H3
        </button>
        <button
          className="base-editor-button"
          disabled={!history.canUndo}
          onClick={() => runUndo(editor)}
          type="button"
        >
          Undo
        </button>
        <button
          className="base-editor-button"
          disabled={!history.canRedo}
          onClick={() => runRedo(editor)}
          type="button"
        >
          Redo
        </button>
      </div>

      <dl className="base-editor-selection-stats">
        <div>
          <dt>Block</dt>
          <dd>{selection.currentBlock}</dd>
        </div>
        <div>
          <dt>Selection</dt>
          <dd>{selection.empty ? "caret" : `${selection.from}-${selection.to}`}</dd>
        </div>
        <div>
          <dt>Local draft</dt>
          <dd>{hasHydratedDraft ? "hydrated" : "booting"}</dd>
        </div>
        <div>
          <dt>History</dt>
          <dd>{`${history.canUndo ? "undo" : "no-undo"} / ${history.canRedo ? "redo" : "no-redo"}`}</dd>
        </div>
      </dl>

      <div className="base-editor-frame">
        <EditorContent editor={editor} />
      </div>
    </section>
  );
}
