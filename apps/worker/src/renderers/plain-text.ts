export interface PlainTextRenderInput {
  title?: string;
  content: string;
}

export function renderPlainText(input: PlainTextRenderInput): string {
  const title = input.title?.trim();
  const body = input.content.replace(/\r\n/g, "\n").trim();

  if (!title) {
    return `${body}\n`;
  }

  return `${title}\n\n${body}\n`;
}