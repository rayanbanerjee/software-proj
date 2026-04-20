import { describe, expect, it } from "vitest";

import { renderDocx } from "../src/renderers/docx";

describe("renderDocx", () => {
  it("returns DOCX metadata and content", () => {
    const output = renderDocx({
      title: "Project Plan",
      content: "Hello DOCX"
    });

    expect(output.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(output.fileExtension).toBe("docx");
    expect(Buffer.isBuffer(output.content)).toBe(true);
    expect(output.content.subarray(0, 2).toString("utf8")).toBe("PK");
    expect(output.content.toString("utf8")).toContain("Project Plan");
    expect(output.content.toString("utf8")).toContain("Hello DOCX");
  });

  it("uses fallback title when missing", () => {
    const output = renderDocx({
      content: "No title"
    });

    expect(output.content.toString("utf8")).toContain("Untitled document");
  });
});
