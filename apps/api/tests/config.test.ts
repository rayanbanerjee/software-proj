import { describe, expect, it } from "vitest";

import { parseApiEnv } from "../src/config/env.js";
import { defaultApiTestEnv } from "../../../tests/config/env.js";

describe("api env parsing", () => {
  it("parses required api configuration", () => {
    const env = parseApiEnv({
      ...defaultApiTestEnv
    });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe("test");
    expect(env.GOOGLE_CLIENT_ID).toBe("client-id");
    expect(env.RATE_LIMIT_WINDOW_MS).toBe(60_000);
    expect(env.RATE_LIMIT_MAX_REQUESTS).toBe(120);
    expect(env.OPENROUTER_MODEL).toBe("qwen/qwen3.6-plus:free");
    expect(env.OPENROUTER_BASE_URL).toBe("https://openrouter.ai/api/v1");
  });

  it("falls back to OPENAI_API_KEY when OPENROUTER_API_KEY is unset", () => {
    const env = parseApiEnv({
      ...defaultApiTestEnv,
      OPENAI_API_KEY: "shell-openai-key"
    });

    expect(env.OPENROUTER_API_KEY).toBe("shell-openai-key");
  });
});
