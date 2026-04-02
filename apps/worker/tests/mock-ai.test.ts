import { describe, expect, it } from "vitest";

import { runMockAi } from "../src/ai/mock-provider";

describe("mock AI provider", () => {
  it("returns summarized output", async () => {
    const res = await runMockAi({
      operation: "summarize",
      text: "This is a long document that needs summarization."
    });

    expect(res.result).toContain("[SUMMARY]");
    expect(res.model).toBe("mock-model");
  });

  it("returns rewritten output", async () => {
    const res = await runMockAi({
      operation: "rewrite",
      text: "Rewrite this text"
    });

    expect(res.result).toContain("[REWRITE]");
  });
});