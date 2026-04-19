export interface PdfRenderInput {
  title?: string;
  content: string;
}

export interface PdfRenderResult {
  mimeType: "application/pdf";
  fileExtension: "pdf";
  content: Buffer;
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function renderPdf(input: PdfRenderInput): PdfRenderResult {
  const title = input.title?.trim() || "Untitled document";
  const lines = [title, "", ...input.content.replace(/\r\n/g, "\n").split("\n")].map(escapePdfText);
  let yPosition = 780;
  const textCommands = [
    "BT",
    "/F1 12 Tf"
  ];

  for (const line of lines) {
    textCommands.push(`1 0 0 1 50 ${yPosition} Tm (${line}) Tj`);
    yPosition -= 18;
  }

  textCommands.push("ET");

  const stream = textCommands.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return {
    mimeType: "application/pdf",
    fileExtension: "pdf",
    content: Buffer.from(pdf, "utf8")
  };
}

export const renderPdfStub = renderPdf;
