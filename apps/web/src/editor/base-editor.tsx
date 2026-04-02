"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { minimalEditorExtensions } from "@repo/editor-schema";

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

export function BaseEditor() {
  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "base-editor-content"
      }
    },
    content: starterContent,
    extensions: [...minimalEditorExtensions]
  });

  return (
    <section className="base-editor-shell">
      <div className="base-editor-header">
        <span className="workspace-kicker">EDIT-002</span>
        <h3>Base editor component</h3>
        <p>TipTap is mounted and ready for richer editor behavior in follow-up tasks.</p>
      </div>
      <div className="base-editor-frame">
        <EditorContent editor={editor} />
      </div>
    </section>
  );
}
