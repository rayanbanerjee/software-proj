import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = {
    ...originalEnv,
    DATABASE_URL: "postgres://postgres:postgres@localhost:5432/collab_editor",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
    NODE_ENV: "test",
    OBJECT_STORAGE_BUCKET: "collab-editor",
    OBJECT_STORAGE_ENDPOINT: "http://localhost:9000",
    PORT: "4000",
    REDIS_URL: "redis://localhost:6379",
    SESSION_SECRET: "secret"
  };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("documents module", () => {
  it("creates a document and returns owner permissions", async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: {
        "x-user-id": "user_owner",
        "x-user-name": "Owner Demo"
      },
      payload: {
        title: "Project kickoff"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      document: {
        title: "Project kickoff",
        archivedAt: null,
        permissions: {
          role: "owner",
          canEdit: true,
          canShare: true
        }
      }
    });

    await app.close();
  });

  it("lists only documents the current user can view", async () => {
    const { app } = await createApp();

    await app.inject({
      method: "POST",
      url: "/v1/documents",
      headers: {
        "x-user-id": "user_owner"
      },
      payload: {
        title: "Visible to owner"
      }
    });

    const response = await app.inject({
      method: "GET",
      url: "/v1/documents",
      headers: {
        "x-user-id": "user_owner"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      documents: [
        {
          title: "Visible to owner",
          role: "owner"
        }
      ]
    });

    const otherUserResponse = await app.inject({
      method: "GET",
      url: "/v1/documents",
      headers: {
        "x-user-id": "user_viewer"
      }
    });

    expect(otherUserResponse.statusCode).toBe(200);
    expect(otherUserResponse.json()).toEqual({
      documents: []
    });

    await app.close();
  });
});
