import { describe, expect, it } from "vitest";

import { getCollabEnv } from "../src/config/env.js";

describe("getCollabEnv", () => {
  it("uses defaults when optional values are missing", () => {
    const env = getCollabEnv({
      SESSION_SECRET: "secret"
    });

    expect(env).toEqual({
      host: "0.0.0.0",
      nodeEnv: "development",
      port: 4001,
      sessionSecret: "secret"
    });
  });

  it("parses explicit host, port, and node env values", () => {
    const env = getCollabEnv({
      HOST: "127.0.0.1",
      NODE_ENV: "test",
      PORT: "4100",
      SESSION_SECRET: "secret"
    });

    expect(env).toEqual({
      host: "127.0.0.1",
      nodeEnv: "test",
      port: 4100,
      sessionSecret: "secret"
    });
  });

  it("throws on invalid numeric ports", () => {
    expect(() =>
      getCollabEnv({
        PORT: "abc"
      })
    ).toThrow("Invalid integer for PORT");
  });

  it("requires the shared session secret", () => {
    expect(() => getCollabEnv({})).toThrow("Missing required environment variable: SESSION_SECRET");
  });
});
