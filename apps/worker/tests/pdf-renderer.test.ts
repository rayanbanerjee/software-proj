import { describe, expect, it } from "vitest";

import { renderPdfStub } from "../src/renderers/pdf";

describe("renderPdfStub", () => {
  it("returns PDF stub metadata and content", () => {
    const output = renderPdfStub({
      title: "Design Notes",
      content: "Hello PDF"
    });

    expect(output.mimeType).toBe("application/pdf");
    expect(output.fileExtension).toBe("pdf");
    expect(output.content).toContain("PDF_STUB");
    expect(output.content).toContain("TITLE:Design Notes");
    expect(output.content).toContain("BODY:Hello PDF");
  });

  it("uses fallback title when missing", () => {
    const output = renderPdfStub({
      content: "No title"
    });

    expect(output.content).toContain("TITLE:Untitled document");
  });
});