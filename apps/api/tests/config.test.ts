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
    expect(env.GOOGLE_CLIENT_ID).toBe("test-google-client-id.apps.googleusercontent.com");
    expect(env.JWT_ISSUER).toBe("collab-editor-api-test");
  });
});
