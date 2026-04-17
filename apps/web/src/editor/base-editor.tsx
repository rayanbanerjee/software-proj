"use client";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AiAction } from "@repo/shared-types";
import {
  baseEditorExtensions,
  headingEditorExtensions,
  minimalEditorExtensions
} from "@repo/editor-schema";
import type * as Y from "yjs";
import type { DocumentRecord } from "../lib/app-shell";
import { getCollaboratorColors } from "../lib/collab-colors";

import { getEditorModeLabel, isEditorReadOnly } from "./access";
import {
  clearRecoveryBuffer,
  createRecoveryBufferKey,
  createLocalDraftKey,
  readRecoveryBuffer,
  readStoredDraft,
  readStoredDraftFromIndexedDb,
  shouldReplayRecoveryBuffer,
  writeRecoveryBuffer,
  writeStoredDraft,
  writeStoredDraftToIndexedDb
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

function editorHasMeaningfulContent(value: { getJSON: () => unknown }) {
  const json = value.getJSON() as {
    content?: Array<{
      content?: Array<{ text?: string; type?: string }>;
      type?: string;
    }>;
  };

  return (json.content ?? []).some((node) => {
    const textContent = (node.content ?? [])
      .map((entry) => entry.text ?? "")
      .join("")
      .trim();

    return textContent.length > 0 || node.type === "heading";
  });
}

interface BaseEditorProps {
  accessLevel?: "none" | "read" | "write";
  blameMode?: boolean;
  collaboratorSeeds?: readonly string[];
  collaborationDocument?: Y.Doc | null;
  collaborationProvider?: HocuspocusProvider | null;
  collaborationUser?: null | {
    displayName: string;
    sessionId: string;
    userId: string;
  };
  documentId?: string;
  initialTitle?: string;
  isRenamingTitle?: boolean;
  onRenameTitle?: (nextTitle: string) => Promise<void> | void;
  onAiActionSelect?: (payload: { action: AiAction; from: number; selectedText: string; to: number }) => void;
  pendingAiApplication?: null | {
    proposalId: string;
    selection: {
      from: number;
      to: number;
    };
    text: string;
  };
  onAiApplicationHandled?: (proposalId: string) => void;
  role?: DocumentRecord["role"];
  serverStateVector?: string | null;
  syncState?: "online" | "offline" | "reconnecting" | "recovered";
}

export function BaseEditor({
  accessLevel = "write",
  blameMode = false,
  collaboratorSeeds = [],
  collaborationDocument = null,
  collaborationProvider = null,
  collaborationUser = null,
  documentId = "route-shell-document",
  initialTitle = "Untitled document",
  isRenamingTitle = false,
  onRenameTitle,
  onAiActionSelect,
  pendingAiApplication = null,
  onAiApplicationHandled,
  role = "owner",
  serverStateVector = null,
  syncState = "online"
}: BaseEditorProps) {
  type EditorContentValue = Parameters<NonNullable<typeof editor>["commands"]["setContent"]>[0];
  const [aiMenu, setAiMenu] = useState<null | { text: string; x: number; y: number }>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const hasCollaboration = Boolean(collaborationDocument);
  const readOnly = accessLevel !== "write" || isEditorReadOnly(role);
  const collaboratorColors = getCollaboratorColors(collaboratorSeeds);
  const currentCollaboratorColor = getCollaboratorColors([
    collaborationUser?.userId ?? collaborationUser?.sessionId ?? "local-user"
  ])[0];

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: `base-editor-content${readOnly ? " base-editor-content-readonly" : ""}`
      }
    },
    content: hasCollaboration ? undefined : starterContent,
    extensions: hasCollaboration && collaborationDocument
      ? [
          ...baseEditorExtensions,
          ...headingEditorExtensions,
          Collaboration.configure({
            document: collaborationDocument
          }),
          ...(collaborationProvider && collaborationUser
            ? [
                CollaborationCursor.configure({
                  provider: collaborationProvider,
                  user: {
                    color: currentCollaboratorColor.ring,
                    name: collaborationUser.displayName
                  }
                })
              ]
            : [])
        ]
      : [...minimalEditorExtensions],
    onUpdate({ editor: currentEditor }) {
      if (typeof window === "undefined") {
        return;
      }

      const key = createLocalDraftKey(documentId);
      const recoveryKey = createRecoveryBufferKey(documentId);
      const content = currentEditor.getJSON();

      writeStoredDraft(
        window.localStorage,
        key,
        content
      );
      void writeStoredDraftToIndexedDb(window.indexedDB, key, content);
      writeRecoveryBuffer(window.localStorage, recoveryKey, {
        content,
        pendingWrites: syncState === "online" ? 0 : 1,
        savedAt: new Date().toISOString(),
        sourceStateVector: serverStateVector
      });
    }
  }, [
    collaborationDocument,
    collaborationProvider,
    collaborationUser,
    currentCollaboratorColor.ring,
    documentId,
    hasCollaboration,
    readOnly
  ]);

  useEffect(() => {
    setHasHydratedDraft(false);
  }, [documentId, hasCollaboration]);

  useEffect(() => {
    setTitle(initialTitle);
    setAiMenu(null);
  }, [documentId, initialTitle]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    const awareness = collaborationProvider?.awareness;

    if (!hasCollaboration || !awareness || !collaborationUser) {
      return;
    }

    awareness.setLocalStateField("user", {
      color: currentCollaboratorColor.ring,
      name: collaborationUser.displayName
    });
  }, [
    collaborationProvider,
    collaborationUser,
    currentCollaboratorColor.ring,
    hasCollaboration
  ]);

  useEffect(() => {
    if (!editor || typeof window === "undefined" || hasHydratedDraft) {
      return;
    }

    const key = createLocalDraftKey(documentId);

    void (async () => {
      const indexedDbDraft = await readStoredDraftFromIndexedDb(window.indexedDB, key);
      const storedDraft = indexedDbDraft ?? readStoredDraft(window.localStorage, key);
      const recoveryBuffer = readRecoveryBuffer(window.localStorage, createRecoveryBufferKey(documentId));
      const shouldReplay = shouldReplayRecoveryBuffer({
        recoveryBuffer,
        serverStateVector,
        syncState
      });

      if (shouldReplay && recoveryBuffer) {
        editor.commands.setContent(recoveryBuffer.content as EditorContentValue);
      } else if (storedDraft && (!hasCollaboration || !editorHasMeaningfulContent(editor))) {
        editor.commands.setContent(storedDraft as EditorContentValue);
      }

      if (syncState === "recovered" && recoveryBuffer && !shouldReplay) {
        clearRecoveryBuffer(window.localStorage, createRecoveryBufferKey(documentId));
      }

      setHasHydratedDraft(true);
    })();
  }, [documentId, editor, hasCollaboration, hasHydratedDraft, serverStateVector, syncState]);

  useEffect(() => {
    if (!editor || !pendingAiApplication || readOnly) {
      return;
    }

    editor.chain().focus().insertContentAt(pendingAiApplication.selection, pendingAiApplication.text).run();
    onAiApplicationHandled?.(pendingAiApplication.proposalId);
  }, [editor, onAiApplicationHandled, pendingAiApplication, readOnly]);

  const selection = getSelectionSummary(editor);
  const history = getEditorHistoryState(editor);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentEditor = editor;
    const root = currentEditor.view.dom as HTMLElement;

    function applyBlameStyling() {
      const blocks = Array.from(root.children) as HTMLElement[];

      blocks.forEach((block, index) => {
        if (!blameMode) {
          block.style.removeProperty("background");
          block.style.removeProperty("box-shadow");
          block.style.removeProperty("border-radius");
          block.style.removeProperty("padding-left");
          block.style.removeProperty("padding-right");
          return;
        }

        const color = collaboratorColors[index % collaboratorColors.length];

        block.style.background = `linear-gradient(90deg, ${color.fill} 0%, rgba(255,255,255,0) 92%)`;
        block.style.boxShadow = `inset 4px 0 0 ${color.ring}`;
        block.style.borderRadius = "8px";
        block.style.paddingLeft = "12px";
        block.style.paddingRight = "12px";
      });
    }

    function handleContextMenu(event: MouseEvent) {
      const { from, to } = currentEditor.state.selection;
      const selectedText = currentEditor.state.doc.textBetween(from, to, " ").trim();

      if (!selectedText) {
        setAiMenu(null);
        return;
      }

      event.preventDefault();
      setAiMenu({
        text: selectedText,
        x: event.clientX,
        y: event.clientY
      });
    }

    function handleWindowClick() {
      setAiMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAiMenu(null);
      }
    }

    function refresh() {
      requestAnimationFrame(applyBlameStyling);
    }

    root.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleWindowClick);
    window.addEventListener("keydown", handleKeyDown);
    currentEditor.on("update", refresh);
    currentEditor.on("selectionUpdate", refresh);
    refresh();

    return () => {
      root.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleWindowClick);
      window.removeEventListener("keydown", handleKeyDown);
      currentEditor.off("update", refresh);
      currentEditor.off("selectionUpdate", refresh);
    };
  }, [blameMode, collaboratorColors, editor]);

  function setParagraph() {
    editor?.chain().focus().setParagraph().run();
  }

  function setHeading(level: 1 | 2 | 3) {
    editor?.chain().focus().toggleHeading({ level }).run();
  }

  async function commitTitleChange() {
    const trimmedTitle = title.trim();

    if (!onRenameTitle || trimmedTitle.length === 0 || trimmedTitle === initialTitle) {
      setTitle(initialTitle);
      return;
    }

    try {
      await onRenameTitle(trimmedTitle);
    } catch {
      setTitle(initialTitle);
    }
  }

  async function handleTitleBlur() {
    await commitTitleChange();
  }

  async function handleTitleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    await commitTitleChange();
  }

  return (
    <section className="base-editor-shell">
      <label className="base-editor-title">
        <input
          aria-label="Document title"
          className="base-editor-title-input"
          disabled={readOnly || isRenamingTitle}
          onBlur={() => void handleTitleBlur()}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => void handleTitleKeyDown(event)}
          readOnly={readOnly}
          type="text"
          value={title}
        />
        <small>
          {getEditorModeLabel(role)} · {isRenamingTitle ? "Saving title..." : syncState === "online" ? "Synced" : syncState}
        </small>
      </label>

      <div className="base-editor-toolbar" aria-label="Editor block controls">
        <button
          className={`base-editor-button${selection.currentBlock === "paragraph" ? " base-editor-button-active" : ""}`}
          disabled={readOnly}
          onClick={setParagraph}
          type="button"
        >
          P
        </button>
        <button
          className={`base-editor-button${selection.currentBlock === "heading-1" ? " base-editor-button-active" : ""}`}
          disabled={readOnly}
          onClick={() => setHeading(1)}
          type="button"
        >
          1
        </button>
        <button
          className={`base-editor-button${selection.currentBlock === "heading-2" ? " base-editor-button-active" : ""}`}
          disabled={readOnly}
          onClick={() => setHeading(2)}
          type="button"
        >
          2
        </button>
        <button
          className={`base-editor-button${selection.currentBlock === "heading-3" ? " base-editor-button-active" : ""}`}
          disabled={readOnly}
          onClick={() => setHeading(3)}
          type="button"
        >
          3
        </button>
        <button
          className="base-editor-button"
          disabled={readOnly || !history.canUndo}
          onClick={() => runUndo(editor)}
          type="button"
        >
          {"<"}
        </button>
        <button
          className="base-editor-button"
          disabled={readOnly || !history.canRedo}
          onClick={() => runRedo(editor)}
          type="button"
        >
          {">"}
        </button>
        <div className="base-editor-statusline">
          <span>{syncState === "online" ? "live" : syncState}</span>
          <span>{blameMode ? "blame" : "writing"}</span>
          <span>{selection.empty ? "caret" : `selection ${selection.from}-${selection.to}`}</span>
        </div>
      </div>

      <div className="base-editor-frame">
        <EditorContent editor={editor} />
      </div>
      {aiMenu ? (
        <div
          className="ai-context-menu"
          style={{
            left: aiMenu.x,
            top: aiMenu.y
          }}
        >
          {([
            "rewrite",
            "summarize",
            "translate",
            "restructure"
          ] as const).map((action) => (
            <button
              className="ai-context-menu-item"
              key={action}
              onClick={() => {
                const currentSelection = editor?.state.selection;

                if (!currentSelection) {
                  return;
                }

                onAiActionSelect?.({
                  action,
                  from: currentSelection.from,
                  selectedText: aiMenu.text,
                  to: currentSelection.to
                });
                setAiMenu(null);
              }}
              type="button"
            >
              {action === "rewrite"
                ? "Rewrite"
                : action === "summarize"
                  ? "Summarize"
                  : action === "translate"
                    ? "Translate to English"
                    : "Tone adjustment"}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
