import { describe, expect, it } from "vitest";

import { consumeSseBuffer } from "../src/lib/ai-stream";

describe("AI stream parsing", () => {
  it("parses complete SSE payloads and preserves partial remainder", () => {
    const consumed = consumeSseBuffer(
      [
        'data: {"type":"started","requestId":"ai_1","status":"running"}',
        "",
        'data: {"type":"delta","requestId":"ai_1","delta":"Hello","text":"Hello"}',
        "",
        'data: {"type":"delta","requestId":"ai_1","delta":" wor'
      ].join("\n")
    );

    expect(consumed.events).toEqual([
      {
        requestId: "ai_1",
        status: "running",
        type: "started"
      },
      {
        delta: "Hello",
        requestId: "ai_1",
        text: "Hello",
        type: "delta"
      }
    ]);
    expect(consumed.remainder).toBe('data: {"type":"delta","requestId":"ai_1","delta":" wor');
  });
});
