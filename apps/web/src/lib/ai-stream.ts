import type { AiStreamEvent } from "@repo/shared-types";

export function consumeSseBuffer(buffer: string): {
  events: AiStreamEvent[];
  remainder: string;
} {
  const chunks = buffer.split("\n\n");
  const remainder = chunks.pop() ?? "";
  const events: AiStreamEvent[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();

    if (!trimmed) {
      continue;
    }

    const dataLine = trimmed
      .split("\n")
      .find((line) => line.startsWith("data:"));

    if (!dataLine) {
      continue;
    }

    const payload = dataLine.replace(/^data:\s*/, "");
    events.push(JSON.parse(payload) as AiStreamEvent);
  }

  return {
    events,
    remainder
  };
}
