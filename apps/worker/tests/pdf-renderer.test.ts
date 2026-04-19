import { describe, expect, it } from "vitest";

import { renderPdf } from "../src/renderers/pdf";

describe("renderPdf", () => {
  it("returns PDF metadata and content", () => {
    const output = renderPdf({
      title: "Design Notes",
      content: "Hello PDF"
    });

    expect(output.mimeType).toBe("application/pdf");
    expect(output.fileExtension).toBe("pdf");
    expect(Buffer.isBuffer(output.content)).toBe(true);
    expect(output.content.toString("utf8")).toContain("%PDF-1.4");
    expect(output.content.toString("utf8")).toContain("Design Notes");
    expect(output.content.toString("utf8")).toContain("Hello PDF");
  });

  it("uses fallback title when missing", () => {
    const output = renderPdf({
      content: "No title"
    });

    expect(output.content.toString("utf8")).toContain("Untitled document");
  });
});
