import { describe, expect, it } from "vitest";

import { getCollabEnv } from "../src/config/env.js";

describe("getCollabEnv", () => {
  it("uses defaults when optional values are missing", () => {
    const env = getCollabEnv({
      JWT_ISSUER: "collab-editor-api",
      SESSION_SECRET: "secret"
    });

    expect(env).toEqual({
      host: "0.0.0.0",
      jwtIssuer: "collab-editor-api",
      nodeEnv: "development",
      port: 4001,
      sessionSecret: "secret"
    });
  });

  it("parses explicit host, port, and node env values", () => {
    const env = getCollabEnv({
      HOST: "127.0.0.1",
      JWT_ISSUER: "collab-editor-api",
      NODE_ENV: "test",
      PORT: "4100",
      SESSION_SECRET: "secret"
    });

    expect(env).toEqual({
      host: "127.0.0.1",
      jwtIssuer: "collab-editor-api",
      nodeEnv: "test",
      port: 4100,
      sessionSecret: "secret"
    });
  });

  it("throws on invalid numeric ports", () => {
    expect(() =>
      getCollabEnv({
        JWT_ISSUER: "collab-editor-api",
        PORT: "abc"
      })
    ).toThrow("Invalid integer for PORT");
  });

  it("requires the shared session secret", () => {
    expect(() => getCollabEnv({
      JWT_ISSUER: "collab-editor-api"
    })).toThrow("Missing required environment variable: SESSION_SECRET");
  });

  it("requires the JWT issuer", () => {
    expect(() => getCollabEnv({
      SESSION_SECRET: "secret"
    })).toThrow("Missing required environment variable: JWT_ISSUER");
  });
});
