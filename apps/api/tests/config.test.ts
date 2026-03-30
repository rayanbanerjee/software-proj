import { describe, expect, it } from "vitest";

import { parseApiEnv } from "../src/config/env.js";

describe("api env parsing", () => {
  it("parses required api configuration", () => {
    const env = parseApiEnv({
      DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
      NODE_ENV: "test",
      OBJECT_STORAGE_BUCKET: "collab-editor",
      OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
      PORT: "4000",
      REDIS_URL: "redis://localhost:6379",
      SESSION_SECRET: "secret"
    });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe("test");
    expect(env.GOOGLE_CLIENT_ID).toBe("client-id");
  });
});
