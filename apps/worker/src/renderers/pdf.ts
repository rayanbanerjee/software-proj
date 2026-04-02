export interface PdfRenderInput {
  title?: string;
  content: string;
}

export interface PdfRenderResult {
  mimeType: "application/pdf";
  fileExtension: "pdf";
  content: string;
}

export function renderPdfStub(input: PdfRenderInput): PdfRenderResult {
  const title = input.title?.trim() || "Untitled document";
  const body = input.content.trim();

  return {
    mimeType: "application/pdf",
    fileExtension: "pdf",
    content: `PDF_STUB\nTITLE:${title}\nBODY:${body}\n`
  };
}