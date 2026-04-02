import { describe, expect, it } from "vitest";

import { renderPlainText } from "../src/renderers/plain-text";

describe("renderPlainText", () => {
  it("renders content without a title", () => {
    const output = renderPlainText({
      content: "Hello world"
    });

    expect(output).toBe("Hello world\n");
  });

  it("renders title and content with spacing", () => {
    const output = renderPlainText({
      title: "Design Notes",
      content: "First line\nSecond line"
    });

    expect(output).toBe("Design Notes\n\nFirst line\nSecond line\n");
  });

  it("normalizes windows newlines and trims edges", () => {
    const output = renderPlainText({
      title: "Doc",
      content: "\r\nLine one\r\nLine two\r\n"
    });

    expect(output).toBe("Doc\n\nLine one\nLine two\n");
  });
});