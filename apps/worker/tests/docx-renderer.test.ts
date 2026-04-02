import { describe, expect, it } from "vitest";

import { renderDocxStub } from "../src/renderers/docx";

describe("renderDocxStub", () => {
  it("returns DOCX stub metadata and content", () => {
    const output = renderDocxStub({
      title: "Project Plan",
      content: "Hello DOCX"
    });

    expect(output.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(output.fileExtension).toBe("docx");
    expect(output.content).toContain("DOCX_STUB");
    expect(output.content).toContain("TITLE:Project Plan");
    expect(output.content).toContain("BODY:Hello DOCX");
  });

  it("uses fallback title when missing", () => {
    const output = renderDocxStub({
      content: "No title"
    });

    expect(output.content).toContain("TITLE:Untitled document");
  });
});