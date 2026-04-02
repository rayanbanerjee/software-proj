export interface DocxRenderInput {
  title?: string;
  content: string;
}

export interface DocxRenderResult {
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  fileExtension: "docx";
  content: string;
}

export function renderDocxStub(input: DocxRenderInput): DocxRenderResult {
  const title = input.title?.trim() || "Untitled document";
  const body = input.content.trim();

  return {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileExtension: "docx",
    content: `DOCX_STUB\nTITLE:${title}\nBODY:${body}\n`
  };
}