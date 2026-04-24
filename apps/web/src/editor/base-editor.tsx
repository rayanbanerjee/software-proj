"use client";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import type { HocuspocusProvider } from "@hocuspocus/provider";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { AiAction } from "@repo/shared-types";
import {
  baseEditorExtensions,
  headingEditorExtensions,
  minimalEditorExtensions,
  richTextEditorExtensions
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
import { getEditorHistoryState, runRedo, runUndo } from "./history";
import { getSelectionSummary } from "./selection";

type EditorContentValue = Parameters<NonNullable<ReturnType<typeof useEditor>>["commands"]["setContent"]>[0];

const starterContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: {
        level: 1
      },
      content: [
        {
          type: "text",
          text: "Untitled document"
        }
      ]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Start writing here. Use headings, lists, quotes, and code blocks from the toolbar."
        }
      ]
    }
  ]
};

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

    return textContent.length > 0 || node.type === "heading" || node.type === "codeBlock";
  });
}

function getEditorPlainText(editor: Editor | null) {
  if (!editor) {
    return "";
  }

  return editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n\n").trim();
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
  isRevertingRevision?: boolean;
  onRenameTitle?: (nextTitle: string) => Promise<void> | void;
  onExitBlame?: () => void;
  onRevertRevision?: (revisionId: string) => Promise<void> | void;
  onAiActionSelect?: (payload: { action: AiAction; from: number; selectedText: string; to: number }) => void;
  pendingAiApplication?: null | {
    proposalId: string;
    selection: {
      from: number;
      to: number;
    };
    text: string;
  };
  revisionComparison?: null | {
    errorMessage?: string | null;
    isLoading: boolean;
    label: string;
    revisionId: string | null;
    snapshotText?: string | null;
    title?: string | null;
  };
  revisionRevertEnabled?: boolean;
  onAiApplicationHandled?: (proposalId: string) => void;
  role?: DocumentRecord["role"];
  serverStateVector?: string | null;
  syncState?: "online" | "offline" | "reconnecting" | "recovered";
}

function ToolbarButton(props: {
  active?: boolean;
  children: string;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className={`base-editor-button${props.active ? " base-editor-button-active" : ""}`}
      disabled={props.disabled}
      onClick={props.onClick}
      title={props.title}
      type="button"
    >
      {props.children}
    </button>
  );
}

function buildEditorExtensions(input: {
  collaborationDocument: Y.Doc | null;
  collaborationProvider: HocuspocusProvider | null;
  collaborationUser: BaseEditorProps["collaborationUser"];
  cursorColor: string;
}) {
  if (!input.collaborationDocument) {
    return [...minimalEditorExtensions];
  }

  return [
    ...baseEditorExtensions,
    ...headingEditorExtensions,
    ...richTextEditorExtensions,
    Collaboration.configure({
      document: input.collaborationDocument
    }),
    ...(input.collaborationProvider && input.collaborationUser
      ? [
          CollaborationCursor.configure({
            provider: input.collaborationProvider,
            user: {
              color: input.cursorColor,
              name: input.collaborationUser.displayName
            }
          })
        ]
      : [])
  ];
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
  isRevertingRevision = false,
  onRenameTitle,
  onExitBlame,
  onRevertRevision,
  onAiActionSelect,
  pendingAiApplication = null,
  revisionComparison = null,
  revisionRevertEnabled = false,
  onAiApplicationHandled,
  role = "owner",
  serverStateVector = null,
  syncState = "online"
}: BaseEditorProps) {
  const [aiMenu, setAiMenu] = useState<null | { text: string; x: number; y: number }>(null);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const [currentDocumentText, setCurrentDocumentText] = useState("");
  const [title, setTitle] = useState(initialTitle);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const committedTitleRef = useRef(initialTitle);
  const isSubmittingTitleRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const hasCollaboration = Boolean(collaborationDocument);
  const readOnly = accessLevel !== "write" || isEditorReadOnly(role);
  const currentCollaboratorColor = getCollaboratorColors([
    collaborationUser?.userId ?? collaborationUser?.sessionId ?? "local-user"
  ])[0];
  const editorExtensions = useMemo(
    () =>
      buildEditorExtensions({
        collaborationDocument,
        collaborationProvider,
        collaborationUser,
        cursorColor: currentCollaboratorColor.ring
      }),
    [collaborationDocument, collaborationProvider, collaborationUser, currentCollaboratorColor.ring]
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !readOnly,
      editorProps: {
        attributes: {
          class: `base-editor-content${readOnly ? " base-editor-content-readonly" : ""}`
        }
      },
      content: hasCollaboration ? undefined : (starterContent as never),
      extensions: editorExtensions,
      onUpdate({ editor: currentEditor }) {
        setCurrentDocumentText(getEditorPlainText(currentEditor));

        if (typeof window === "undefined" || hasCollaboration) {
          return;
        }

        const key = createLocalDraftKey(documentId);
        const recoveryKey = createRecoveryBufferKey(documentId);
        const content = currentEditor.getJSON();

        writeStoredDraft(window.localStorage, key, content);
        void writeStoredDraftToIndexedDb(window.indexedDB, key, content);
        writeRecoveryBuffer(window.localStorage, recoveryKey, {
          content,
          pendingWrites: syncState === "online" ? 0 : 1,
          savedAt: new Date().toISOString(),
          sourceStateVector: serverStateVector
        });
      }
    },
    [documentId, editorExtensions, hasCollaboration, readOnly, serverStateVector, syncState]
  );

  const selection = getSelectionSummary(editor);
  const history = getEditorHistoryState(editor);
  const collaboratorCount = hasCollaboration
    ? Math.max(1, collaboratorSeeds.length)
    : 1;

  useEffect(() => {
    setTitle(initialTitle);
    setAiMenu(null);
  }, [documentId, initialTitle]);

  useEffect(() => {
    setHasHydratedDraft(false);
  }, [documentId, hasCollaboration]);

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

    if (hasCollaboration) {
      setHasHydratedDraft(true);
      return;
    }

    const key = createLocalDraftKey(documentId);

    void (async () => {
      const indexedDbDraft = await readStoredDraftFromIndexedDb(window.indexedDB, key);
      const storedDraft = indexedDbDraft ?? readStoredDraft(window.localStorage, key);
      const recoveryKey = createRecoveryBufferKey(documentId);
      const recoveryBuffer = readRecoveryBuffer(window.localStorage, recoveryKey);
      const shouldReplay = shouldReplayRecoveryBuffer({
        recoveryBuffer,
        serverStateVector,
        syncState
      });

      if (shouldReplay && recoveryBuffer) {
        editor.commands.setContent(recoveryBuffer.content as EditorContentValue);
      } else if (storedDraft && !editorHasMeaningfulContent(editor)) {
        editor.commands.setContent(storedDraft as EditorContentValue);
      }

      if ((syncState === "recovered" || syncState === "online") && recoveryBuffer && !shouldReplay) {
        clearRecoveryBuffer(window.localStorage, recoveryKey);
      }

      setHasHydratedDraft(true);
    })();
  }, [documentId, editor, hasCollaboration, hasHydratedDraft, serverStateVector, syncState]);

  useEffect(() => {
    if (!editor) {
      setCurrentDocumentText("");
      return;
    }

    function updateCurrentDocumentText() {
      setCurrentDocumentText(getEditorPlainText(editor));
    }

    updateCurrentDocumentText();
    editor.on("transaction", updateCurrentDocumentText);
    editor.on("update", updateCurrentDocumentText);

    return () => {
      editor.off("transaction", updateCurrentDocumentText);
      editor.off("update", updateCurrentDocumentText);
    };
  }, [editor, documentId]);

  useEffect(() => {
    if (!editor || !pendingAiApplication || readOnly) {
      return;
    }

    editor.chain().focus().insertContentAt(pendingAiApplication.selection, pendingAiApplication.text).run();
    onAiApplicationHandled?.(pendingAiApplication.proposalId);
  }, [editor, onAiApplicationHandled, pendingAiApplication, readOnly]);

  useEffect(() => {
    committedTitleRef.current = initialTitle;
    setTitle(initialTitle);
    setIsEditingTitle(false);
  }, [initialTitle]);

  useEffect(() => {
    if (!isEditingTitle) {
      return;
    }

    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isEditingTitle]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentEditor = editor;
    const root = currentEditor.view.dom as HTMLElement;

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

    function handleWindowKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAiMenu(null);
      }
    }

    root.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("click", handleWindowClick);
    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      root.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("click", handleWindowClick);
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [editor]);

  function setParagraph() {
    editor?.chain().focus().setParagraph().run();
  }

  function setHeading(level: 1 | 2 | 3) {
    editor?.chain().focus().toggleHeading({ level }).run();
  }

  function toggleBold() {
    editor?.chain().focus().toggleBold().run();
  }

  function toggleItalic() {
    editor?.chain().focus().toggleItalic().run();
  }

  function toggleStrike() {
    editor?.chain().focus().toggleStrike().run();
  }

  function toggleBulletList() {
    editor?.chain().focus().toggleBulletList().run();
  }

  function toggleOrderedList() {
    editor?.chain().focus().toggleOrderedList().run();
  }

  function toggleBlockquote() {
    editor?.chain().focus().toggleBlockquote().run();
  }

  function toggleCodeBlock() {
    editor?.chain().focus().toggleCodeBlock().run();
  }

  async function commitTitleChange() {
    if (isSubmittingTitleRef.current) {
      return;
    }

    const trimmedTitle = title.trim();
    const committedTitle = committedTitleRef.current;

    if (!onRenameTitle || trimmedTitle.length === 0 || trimmedTitle === committedTitle) {
      setTitle(committedTitle);
      setIsEditingTitle(false);
      return;
    }

    isSubmittingTitleRef.current = true;

    try {
      await onRenameTitle(trimmedTitle);
      committedTitleRef.current = trimmedTitle;
      setTitle(trimmedTitle);
      setIsEditingTitle(false);
    } catch {
      setTitle(committedTitle);
    } finally {
      isSubmittingTitleRef.current = false;
    }
  }

  async function handleTitleBlur() {
    await commitTitleChange();
  }

  async function handleTitleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setTitle(committedTitleRef.current);
      setIsEditingTitle(false);
      event.currentTarget.blur();
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    event.currentTarget.blur();
    await commitTitleChange();
  }

  return (
    <section className="base-editor-shell" data-revert-preview={blameMode && revisionComparison ? "true" : "false"}>
      <label className="base-editor-title">
        {readOnly ? (
          <div className="base-editor-title-display" aria-label="Document title">
            {title}
          </div>
        ) : isEditingTitle ? (
          <input
            ref={titleInputRef}
            aria-label="Document title"
            className="base-editor-title-input"
            disabled={isRenamingTitle}
            onBlur={() => void handleTitleBlur()}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => void handleTitleKeyDown(event)}
            type="text"
            value={title}
          />
        ) : (
          <button
            aria-label="Rename document"
            className="base-editor-title-display base-editor-title-trigger"
            disabled={isRenamingTitle}
            onClick={() => setIsEditingTitle(true)}
            type="button"
          >
            {title}
          </button>
        )}
        <small>
          {getEditorModeLabel(role)} · {isRenamingTitle ? "Saving title..." : readOnly ? (syncState === "online" ? "Synced" : syncState) : isEditingTitle ? "Press Enter to save" : "Click title to rename"}
        </small>
      </label>

      <div className="base-editor-toolbar" aria-label="Editor controls">
        <div className="base-editor-toolbar-group">
          <ToolbarButton active={selection.marks.bold} disabled={readOnly} onClick={toggleBold} title="Bold">
            B
          </ToolbarButton>
          <ToolbarButton active={selection.marks.italic} disabled={readOnly} onClick={toggleItalic} title="Italic">
            I
          </ToolbarButton>
          <ToolbarButton active={selection.marks.strike} disabled={readOnly} onClick={toggleStrike} title="Strike">
            S
          </ToolbarButton>
        </div>

        <div className="base-editor-toolbar-group">
          <ToolbarButton active={selection.currentBlock === "paragraph"} disabled={readOnly} onClick={setParagraph} title="Paragraph">
            P
          </ToolbarButton>
          <ToolbarButton active={selection.currentBlock === "heading-1"} disabled={readOnly} onClick={() => setHeading(1)} title="Heading 1">
            H1
          </ToolbarButton>
          <ToolbarButton active={selection.currentBlock === "heading-2"} disabled={readOnly} onClick={() => setHeading(2)} title="Heading 2">
            H2
          </ToolbarButton>
          <ToolbarButton active={selection.currentBlock === "heading-3"} disabled={readOnly} onClick={() => setHeading(3)} title="Heading 3">
            H3
          </ToolbarButton>
          <ToolbarButton active={selection.currentBlock === "code-block"} disabled={readOnly} onClick={toggleCodeBlock} title="Code block">
            {"</>"}
          </ToolbarButton>
        </div>

        <div className="base-editor-toolbar-group">
          <ToolbarButton active={selection.currentList === "bulletList"} disabled={readOnly} onClick={toggleBulletList} title="Bullet list">
            UL
          </ToolbarButton>
          <ToolbarButton active={selection.currentList === "orderedList"} disabled={readOnly} onClick={toggleOrderedList} title="Ordered list">
            OL
          </ToolbarButton>
          <ToolbarButton active={selection.inBlockquote} disabled={readOnly} onClick={toggleBlockquote} title="Blockquote">
            "
          </ToolbarButton>
        </div>

        <div className="base-editor-toolbar-group">
          <ToolbarButton disabled={readOnly || !history.canUndo} onClick={() => runUndo(editor)} title="Undo">
            {"<"}
          </ToolbarButton>
          <ToolbarButton disabled={readOnly || !history.canRedo} onClick={() => runRedo(editor)} title="Redo">
            {">"}
          </ToolbarButton>
        </div>

        <div className="base-editor-statusline">
          <span>{syncState === "online" ? "live" : syncState}</span>
          <span>{blameMode ? "blame" : "writing"}</span>
          <span>{collaboratorCount} active</span>
          <span>{selection.empty ? "caret" : `selection ${selection.from}-${selection.to}`}</span>
        </div>
      </div>

      {blameMode ? (
        <div className="base-editor-blame-banner" role="status">
          <div>
            <strong>Blame mode is on</strong>
            <span>Select a revision in the sidebar to inspect what changed, preview the document state, or revert.</span>
          </div>
          {onExitBlame ? (
            <button className="base-editor-blame-exit" onClick={onExitBlame} type="button">
              Back to writing
            </button>
          ) : null}
        </div>
      ) : null}

      {blameMode && revisionComparison ? (
        <section className="base-editor-revert-preview" aria-label="Revision selected for revert">
          <div className="base-editor-revert-preview-header">
            <div>
              <span className="section-chip">Comparison</span>
              <strong>{revisionComparison.label}</strong>
            </div>
            <button
              className="base-editor-revert-action"
              disabled={
                !revisionComparison.revisionId ||
                revisionComparison.isLoading ||
                isRevertingRevision ||
                !revisionRevertEnabled
              }
              onClick={() => {
                if (revisionComparison.revisionId) {
                  void onRevertRevision?.(revisionComparison.revisionId);
                }
              }}
              type="button"
            >
              {isRevertingRevision ? "Reverting..." : "Revert to this revision"}
            </button>
          </div>
          {revisionComparison.errorMessage ? (
            <p className="base-editor-revert-preview-error">{revisionComparison.errorMessage}</p>
          ) : (
            <div className="base-editor-compare-grid">
              <article className="base-editor-revert-page">
                <span>Selected revision</span>
                <strong>{revisionComparison.title ?? "Revision snapshot"}</strong>
                <pre>
                  {revisionComparison.isLoading
                    ? "Loading revision snapshot..."
                    : revisionComparison.snapshotText?.trim() || "No snapshot text available for this revision."}
                </pre>
              </article>
              <article className="base-editor-revert-page base-editor-current-page">
                <span>Current workspace</span>
                <strong>{title}</strong>
                <pre>{currentDocumentText || "No current document text available."}</pre>
              </article>
            </div>
          )}
        </section>
      ) : null}

      <div
        className={`base-editor-frame${blameMode && revisionComparison ? " base-editor-frame-suppressed" : ""}`}
        data-blame-mode={blameMode ? "true" : "false"}
        data-read-only={readOnly ? "true" : "false"}
      >
        {editor ? <EditorContent editor={editor} /> : <div className="base-editor-loading">Loading editor...</div>}
      </div>

      {aiMenu ? (
        <div
          className="ai-context-menu"
          style={{
            left: aiMenu.x,
            top: aiMenu.y
          }}
        >
          {(["rewrite", "summarize", "translate", "restructure"] as const).map((action) => (
            <button
              className="ai-context-menu-item"
              key={action}
              onClick={() => {
                if (!editor) {
                  return;
                }

                const currentSelection = editor.state.selection;

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
