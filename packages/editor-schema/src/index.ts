import Blockquote from "@tiptap/extension-blockquote";
import Bold from "@tiptap/extension-bold";
import BulletList from "@tiptap/extension-bullet-list";
import Document from "@tiptap/extension-document";
import HardBreak from "@tiptap/extension-hard-break";
import Heading from "@tiptap/extension-heading";
import History from "@tiptap/extension-history";
import Italic from "@tiptap/extension-italic";
import ListItem from "@tiptap/extension-list-item";
import OrderedList from "@tiptap/extension-ordered-list";
import Paragraph from "@tiptap/extension-paragraph";
import Strike from "@tiptap/extension-strike";
import Text from "@tiptap/extension-text";

export const editorNodeKinds = [
  "doc",
  "paragraph",
  "text",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "hardBreak"
] as const;

export const editorMarkKinds = ["bold", "italic", "strike"] as const;

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

export const richTextEditorExtensions = [
  Bold,
  Italic,
  Strike,
  BulletList,
  OrderedList,
  ListItem,
  Blockquote,
  HardBreak
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
  ...richTextEditorExtensions,
  ...historyEditorExtensions
] as const;
