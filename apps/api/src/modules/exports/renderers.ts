import {
  createRichTextDocumentFromPlainText,
  richTextToBlocks,
  richTextToPlainText,
  type RichTextBlock,
  type RichTextDocument
} from "../documents/rich-text.js";

type ExportJobMimeType =
  | "text/plain; charset=utf-8"
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface RenderArtifactInput {
  richContent?: RichTextDocument | null;
  text: string;
  title?: string;
}

export interface RenderArtifactResult {
  content: Buffer;
  mimeType: ExportJobMimeType;
}

type ZipEntry = {
  data: Buffer;
  name: string;
};

function getDocumentBlocks(input: RenderArtifactInput): RichTextBlock[] {
  const document = input.richContent ?? createRichTextDocumentFromPlainText(input.text);
  return richTextToBlocks(document);
}

function getBlockText(block: RichTextBlock) {
  const prefix = block.listMarker
    ? `${"  ".repeat(Math.max(0, block.indent - 1))}${block.listMarker} `
    : block.kind === "blockquote"
      ? `${"  ".repeat(block.indent)}> `
      : `${"  ".repeat(block.indent)}`;

  return `${prefix}${block.spans.map((span) => span.text).join("")}`.trimEnd();
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeCrcTable() {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }

    table[index] = crc >>> 0;
  }

  return table;
}

const crcTable = makeCrcTable();

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const value of buffer) {
    crc = crcTable[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, "utf8");
    const localHeader = Buffer.alloc(30);
    const centralHeader = Buffer.alloc(46);
    const checksum = crc32(entry.data);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    localParts.push(localHeader, nameBuffer, entry.data);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + entry.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.alloc(22);

  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(0, 4);
  endOfCentralDirectory.writeUInt16LE(0, 6);
  endOfCentralDirectory.writeUInt16LE(entries.length, 8);
  endOfCentralDirectory.writeUInt16LE(entries.length, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(offset, 16);
  endOfCentralDirectory.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]);
}

function renderPlainTextArtifact(input: RenderArtifactInput): RenderArtifactResult {
  const title = input.title?.trim();
  const body = (input.richContent ? richTextToPlainText(input.richContent) : input.text).trimEnd();
  const content = title ? `${title}\n\n${body}\n` : `${body}\n`;

  return {
    mimeType: "text/plain; charset=utf-8",
    content: Buffer.from(content, "utf8")
  };
}

function getPdfBlockStyle(block: RichTextBlock, isTitle: boolean) {
  if (isTitle) {
    return {
      font: "/F2",
      size: 18,
      spacing: 26
    };
  }

  if (block.kind === "heading") {
    return {
      font: "/F2",
      size: block.level === 1 ? 16 : block.level === 2 ? 14 : 13,
      spacing: block.level === 1 ? 24 : 20
    };
  }

  if (block.kind === "blockquote") {
    return {
      font: "/F3",
      size: 12,
      spacing: 18
    };
  }

  return {
    font: "/F1",
    size: 12,
    spacing: 18
  };
}

function renderPdfArtifact(input: RenderArtifactInput): RenderArtifactResult {
  const title = input.title?.trim() || "Untitled document";
  const blocks = getDocumentBlocks(input);
  let yPosition = 780;
  const textCommands = ["BT"];
  const titledBlocks: Array<{ isTitle: boolean; text: string; block: RichTextBlock | null }> = [
    {
      isTitle: true,
      text: title,
      block: null
    },
    ...blocks.map((block) => ({
      isTitle: false,
      text: getBlockText(block),
      block
    }))
  ];

  for (const entry of titledBlocks) {
    const style = entry.isTitle || !entry.block
      ? getPdfBlockStyle({
          indent: 0,
          kind: "heading",
          level: 1,
          listMarker: null,
          spans: []
        }, true)
      : getPdfBlockStyle(entry.block, false);
    const lines = entry.text.split("\n");

    for (const line of lines) {
      textCommands.push(`${style.font} ${style.size} Tf`);
      textCommands.push(`1 0 0 1 ${50 + ((entry.block?.indent ?? 0) * 16)} ${yPosition} Tm (${escapePdfText(line)}) Tj`);
      yPosition -= style.spacing;
    }

    yPosition -= entry.isTitle ? 6 : 0;
  }

  textCommands.push("ET");

  const stream = textCommands.join("\n");
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>\nendobj",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj",
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj",
    `7 0 obj\n<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream\nendobj`
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
    content: Buffer.from(pdf, "utf8")
  };
}

function getRunProperties(input: { bold: boolean; italic: boolean; strike: boolean }) {
  const tags = [
    input.bold ? "<w:b/>" : "",
    input.italic ? "<w:i/>" : "",
    input.strike ? "<w:strike/>" : ""
  ].filter(Boolean);

  return tags.length > 0 ? `<w:rPr>${tags.join("")}</w:rPr>` : "";
}

function getParagraphXml(block: RichTextBlock) {
  const paragraphProperties = [
    block.kind === "heading"
      ? `<w:pStyle w:val="Heading${block.level ?? 1}"/>`
      : "",
    block.indent > 0
      ? `<w:ind w:left="${block.indent * 360}"/>`
      : "",
    block.kind === "blockquote"
      ? `<w:ind w:left="${Math.max(block.indent, 1) * 420}"/><w:jc w:val="left"/>`
      : ""
  ].filter(Boolean).join("");

  const runs: string[] = [];

  if (block.listMarker) {
    runs.push(`<w:r><w:t xml:space="preserve">${escapeXml(`${block.listMarker} `)}</w:t></w:r>`);
  }

  for (const span of block.spans) {
    const parts = span.text.split("\n");

    parts.forEach((part, index) => {
      if (index > 0) {
        runs.push(`<w:r><w:br/></w:r>`);
      }

      if (part.length === 0) {
        return;
      }

      runs.push(
        `<w:r>${getRunProperties(span)}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`
      );
    });
  }

  if (runs.length === 0) {
    runs.push("<w:r><w:t xml:space=\"preserve\"></w:t></w:r>");
  }

  return `<w:p>${paragraphProperties ? `<w:pPr>${paragraphProperties}</w:pPr>` : ""}${runs.join("")}</w:p>`;
}

function renderDocxArtifact(input: RenderArtifactInput): RenderArtifactResult {
  const title = input.title?.trim() || "Untitled document";
  const titleBlock: RichTextBlock = {
    indent: 0,
    kind: "heading",
    level: 1,
    listMarker: null,
    spans: [
      {
        bold: true,
        italic: false,
        strike: false,
        text: title
      }
    ]
  };
  const paragraphs = [titleBlock, ...getDocumentBlocks(input)]
    .map((block) => getParagraphXml(block))
    .join("");
  const entries: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
        "utf8"
      )
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
        "utf8"
      )
    },
    {
      name: "word/document.xml",
      data: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
 xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
 xmlns:v="urn:schemas-microsoft-com:vml"
 xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
 xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
 xmlns:w10="urn:schemas-microsoft-com:office:word"
 xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
 xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
 xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
 xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
 xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
 xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
 mc:Ignorable="w14 wp14">
  <w:body>
    ${paragraphs}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`,
        "utf8"
      )
    }
  ];

  return {
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    content: buildStoredZip(entries)
  };
}

export function renderArtifact(
  format: "docx" | "pdf" | "txt",
  input: RenderArtifactInput
): RenderArtifactResult {
  if (format === "txt") {
    return renderPlainTextArtifact(input);
  }

  if (format === "pdf") {
    return renderPdfArtifact(input);
  }

  return renderDocxArtifact(input);
}
