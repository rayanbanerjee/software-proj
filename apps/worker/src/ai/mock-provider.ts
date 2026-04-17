export type AiOperation =
  | "rewrite"
  | "summarize"
  | "translate"
  | "restructure";

export interface MockAiRequest {
  operation: AiOperation;
  text: string;
  parameters?: Record<string, string>;
}

export interface MockAiResponse {
  result: string;
  model: "mock-model";
  processedAt: string;
}

export async function runMockAi(input: MockAiRequest): Promise<MockAiResponse> {
  let result = "";

  switch (input.operation) {
    case "summarize":
      result = `[SUMMARY] ${input.text.slice(0, 50)}...`;
      break;
    case "rewrite":
      result = `[REWRITE] ${input.text}`;
      break;
    case "translate":
      result = `[TRANSLATED TO ${(input.parameters?.targetLanguage ?? "English").toUpperCase()}] ${input.text}`;
      break;
    case "restructure":
      result = `[RESTRUCTURED] ${input.text}`;
      break;
    default:
      result = `[UNKNOWN OPERATION] ${input.text}`;
  }

  return {
    result,
    model: "mock-model",
    processedAt: new Date().toISOString()
  };
}
