import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import History from "@tiptap/extension-history";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";

export const editorNodeKinds = ["doc", "paragraph", "text", "heading"] as const;

export const baseEditorExtensions = [
  Document,
  Paragraph,
  Text
] as const;

export const headingEditorExtensions = [
  Heading.configure({
    levels: [1, 2, 3]
  })
] as const;

export const historyEditorExtensions = [
  History.configure({
    depth: 100,
    newGroupDelay: 500
  })
] as const;

export const minimalEditorExtensions = [
  ...baseEditorExtensions,
  ...headingEditorExtensions,
  ...historyEditorExtensions
] as const;
