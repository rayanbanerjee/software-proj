import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

import { createApp } from "../../src/app.js";
import type { JwtLoginIdentity } from "../../src/modules/auth/session.js";
import { defaultApiTestEnv } from "../../../../tests/config/env.js";

const preparedDatabaseUrls = new Set<string>();
const cleanedRunIds = new Set<string>();

export function applyApiTestEnv(overrides: Partial<NodeJS.ProcessEnv> = {}) {
  const databaseUrl = new URL(defaultApiTestEnv.DATABASE_URL);
  databaseUrl.searchParams.set("schema", `test_${process.pid}`);
  const runId = overrides.TEST_DB_RUN_ID ?? process.env.TEST_DB_RUN_ID ?? randomUUID();

  return {
    ...defaultApiTestEnv,
    API_DATA_DIR: mkdtempSync(path.join(tmpdir(), "collab-editor-api-test-")),
    DATABASE_URL: databaseUrl.toString(),
    TEST_DB_RUN_ID: runId,
    ...overrides
  };
}

async function resetTestDatabase(databaseUrl: string, runId: string) {
  if (cleanedRunIds.has(runId)) {
    return;
  }

  const prisma = new PrismaClient({
    datasourceUrl: databaseUrl
  });

  try {
    await prisma.$connect();
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "AuditEvent",
        "ExportJob",
        "AiRequest",
        "Revision",
        "Comment",
        "Invitation",
        "DocumentMembership",
        "Document",
        "LocalAuthCredential",
        "User"
      RESTART IDENTITY CASCADE
    `);
  } finally {
    await prisma.$disconnect();
  }

  cleanedRunIds.add(runId);
}

async function ensureTestDatabaseReady(databaseUrl: string, runId: string) {
  if (preparedDatabaseUrls.has(databaseUrl)) {
    await resetTestDatabase(databaseUrl, runId);
    return;
  }

  execFileSync(process.execPath, [path.resolve(import.meta.dirname, "../../node_modules/prisma/build/index.js"), "db", "push", "--skip-generate"], {
    cwd: path.resolve(import.meta.dirname, "../../"),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl
    },
    stdio: "pipe"
  });

  preparedDatabaseUrls.add(databaseUrl);
  await resetTestDatabase(databaseUrl, runId);
}

export async function createApiTestApp(
  options?: Parameters<typeof createApp>[0]
): Promise<FastifyInstance> {
  await ensureTestDatabaseReady(
    process.env.DATABASE_URL as string,
    process.env.TEST_DB_RUN_ID as string
  );
  const { app } = await createApp(options);
  return app;
}

export function issueTestSessionCookie(
  app: FastifyInstance,
  overrides: Partial<JwtLoginIdentity> = {}
) {
  const identity: JwtLoginIdentity = {
    email: "stub-user@example.com",
    name: "Stub User",
    imageUrl: "https://example.com/avatar.png",
    ...overrides
  };

  return app.authSessionService.issueJwtSession(identity).cookie;
}

export function createSessionHeaders(
  app: FastifyInstance,
  overrides: Partial<JwtLoginIdentity> = {}
) {
  return {
    cookie: issueTestSessionCookie(app, overrides)
  };
}
