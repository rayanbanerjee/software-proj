export type RichTextMark = {
  attrs?: Record<string, unknown>;
  type: string;
};

export type RichTextNode = {
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
  type: string;
};

export type RichTextDocument = RichTextNode & {
  content?: RichTextNode[];
  type: "doc";
};

export type RichTextSpan = {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  text: string;
};

export type RichTextBlock = {
  indent: number;
  kind: "blockquote" | "heading" | "list-item" | "paragraph";
  level: 1 | 2 | 3 | null;
  listMarker: string | null;
  spans: RichTextSpan[];
};

type ListContext = {
  depth: number;
  marker: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function isRichTextDocument(value: unknown): value is RichTextDocument {
  return isRecord(value) && value.type === "doc";
}

export function createRichTextDocumentFromPlainText(text: string): RichTextDocument {
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.length > 0 ? normalized.split("\n") : [""];

  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: line.length > 0
        ? [
            {
              type: "text",
              text: line
            }
          ]
        : []
    }))
  };
}

function getMarks(node: RichTextNode) {
  const markTypes = new Set((node.marks ?? []).map((mark) => mark.type));

  return {
    bold: markTypes.has("bold"),
    italic: markTypes.has("italic"),
    strike: markTypes.has("strike")
  };
}

function pushText(spans: RichTextSpan[], nextSpan: RichTextSpan) {
  if (!nextSpan.text) {
    return;
  }

  const previous = spans.at(-1);

  if (
    previous
    && previous.bold === nextSpan.bold
    && previous.italic === nextSpan.italic
    && previous.strike === nextSpan.strike
  ) {
    previous.text += nextSpan.text;
    return;
  }

  spans.push(nextSpan);
}

function getInlineSpans(node: RichTextNode): RichTextSpan[] {
  if (node.type === "text") {
    return [
      {
        ...getMarks(node),
        text: node.text ?? ""
      }
    ];
  }

  if (node.type === "hardBreak") {
    return [
      {
        bold: false,
        italic: false,
        strike: false,
        text: "\n"
      }
    ];
  }

  const spans: RichTextSpan[] = [];

  for (const child of node.content ?? []) {
    for (const span of getInlineSpans(child)) {
      pushText(spans, span);
    }
  }

  return spans;
}

function createBlock(
  node: RichTextNode,
  list: ListContext | null
): RichTextBlock {
  return {
    indent: list?.depth ?? 0,
    kind:
      node.type === "heading"
        ? "heading"
        : node.type === "blockquote"
          ? "blockquote"
          : list
            ? "list-item"
            : "paragraph",
    level: node.type === "heading"
      ? ((typeof node.attrs?.level === "number" && node.attrs.level >= 1 && node.attrs.level <= 3)
          ? (node.attrs.level as 1 | 2 | 3)
          : 1)
      : null,
    listMarker: list?.marker ?? null,
    spans: getInlineSpans(node)
  };
}

function collectBlocks(
  node: RichTextNode,
  blocks: RichTextBlock[],
  list: ListContext | null = null
) {
  if (node.type === "doc") {
    for (const child of node.content ?? []) {
      collectBlocks(child, blocks, null);
    }
    return;
  }

  if (node.type === "paragraph" || node.type === "heading" || node.type === "blockquote") {
    blocks.push(createBlock(node, list));
    return;
  }

  if (node.type === "bulletList") {
    for (const item of node.content ?? []) {
      collectBlocks(item, blocks, {
        depth: (list?.depth ?? 0) + 1,
        marker: "\u2022"
      });
    }
    return;
  }

  if (node.type === "orderedList") {
    let order = typeof node.attrs?.start === "number" ? node.attrs.start : 1;

    for (const item of node.content ?? []) {
      collectBlocks(item, blocks, {
        depth: (list?.depth ?? 0) + 1,
        marker: `${order}.`
      });
      order += 1;
    }
    return;
  }

  if (node.type === "listItem") {
    const content = node.content ?? [];
    let addedTextBlock = false;

    for (const child of content) {
      const isTextBlock = child.type === "paragraph" || child.type === "heading" || child.type === "blockquote";

      if (isTextBlock) {
        blocks.push(createBlock(child, addedTextBlock ? {
          depth: list?.depth ?? 0,
          marker: null
        } : list));
        addedTextBlock = true;
        continue;
      }

      collectBlocks(child, blocks, {
        depth: (list?.depth ?? 0),
        marker: null
      });
    }

    if (!addedTextBlock && content.length === 0) {
      blocks.push({
        indent: list?.depth ?? 0,
        kind: "list-item",
        level: null,
        listMarker: list?.marker ?? null,
        spans: []
      });
    }
    return;
  }

  for (const child of node.content ?? []) {
    collectBlocks(child, blocks, list);
  }
}

export function richTextToBlocks(document: RichTextDocument | null | undefined): RichTextBlock[] {
  if (!document) {
    return [];
  }

  const blocks: RichTextBlock[] = [];
  collectBlocks(document, blocks);
  return blocks;
}

function spansToText(spans: readonly RichTextSpan[]) {
  return spans.map((span) => span.text).join("");
}

export function richTextToPlainText(document: RichTextDocument | null | undefined): string {
  return richTextToBlocks(document)
    .map((block) => {
      const prefix = block.listMarker ? `${"  ".repeat(Math.max(0, block.indent - 1))}${block.listMarker} ` : "";
      return `${prefix}${spansToText(block.spans)}`.trimEnd();
    })
    .join("\n");
}
