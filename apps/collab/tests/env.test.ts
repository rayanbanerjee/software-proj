import { describe, expect, it } from "vitest";

import { getCollabEnv } from "../src/config/env.js";

describe("getCollabEnv", () => {
  it("uses defaults when optional values are missing", () => {
    const env = getCollabEnv({});

    expect(env).toEqual({
      host: "0.0.0.0",
      nodeEnv: "development",
      port: 4001
    });
  });

  it("parses explicit host, port, and node env values", () => {
    const env = getCollabEnv({
      HOST: "127.0.0.1",
      NODE_ENV: "test",
      PORT: "4100"
    });

    expect(env).toEqual({
      host: "127.0.0.1",
      nodeEnv: "test",
      port: 4100
    });
  });

  it("throws on invalid numeric ports", () => {
    expect(() =>
      getCollabEnv({
        PORT: "abc"
      })
    ).toThrow("Invalid integer for PORT");
  });
});
