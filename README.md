# Collaborative Document Editor

Collaborative document editor with realtime Yjs/Hocuspocus sync, Google sign-in, comments, versions, export scaffolding, and AI proposal flows.

## Repository layout

- `apps/web`: Next.js web client
- `apps/api`: Fastify API for auth, documents, comments, AI, sharing, versions, and exports
- `apps/collab`: Hocuspocus/Yjs realtime collaboration server
- `apps/worker`: background worker process
- `packages/*`: shared types and support packages
- `infrastructure/*`: Docker and local helper scripts
- `docs/*`: ADRs, API docs, specs, task tracking, diagrams

## Quick start

Install dependencies:

```bash
corepack enable
corepack pnpm install
```

Copy the local env templates:

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
```

Start the local stack:

```bash
./run.sh start
```

Run the web app:

```bash
./run.sh web -- --port 3002
```

Useful local commands:

```bash
./run.sh check
./run.sh test
./run.sh test:backend
./run.sh test:frontend
./run.sh test:e2e
./run.sh logs api
./run.sh stop
```

For the full environment and testing guide, see [local-setup.md](/Users/indira.duisembayeva/Documents/New%20project/software-proj/docs/process/local-setup.md).
For the confirmed backend and frontend testing coverage, see [testing-guide.md](/Users/indira.duisembayeva/Documents/New%20project/software-proj/docs/process/testing-guide.md).

## Prerequisites

- Node.js `>= 22`
- `corepack` enabled so `pnpm` is available
- Docker Desktop running for local services
- Google OAuth client for browser sign-in
- OpenRouter API key if you want real AI responses instead of config errors

## Environment setup

The examples are templates only. Real values belong in app-local env files.

### API

Create `apps/api/.env.local`:

```bash
cp apps/api/.env.example apps/api/.env.local
```

Minimum important values:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `WEB_ORIGIN=http://localhost:3002`
- `COLLAB_URL=ws://localhost:4001`
- `OPENROUTER_API_KEY` or `OPENAI_API_KEY`
- optional `OPENROUTER_MODEL=qwen/qwen3.6-plus:free`

### Web

Create `apps/web/.env.local`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Minimum important values:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`

### Google OAuth

In Google Cloud Console, the OAuth client should allow:

- authorized JavaScript origin: `http://localhost:3002`
- authorized redirect URI: `http://localhost:4000/v1/auth/callback`

## How to start locally

### 1. Start Docker Desktop

Confirm the daemon is up:

```bash
docker info
```

### 2. Start the local stack

This builds and starts Postgres, Redis, MinIO, API, collab, and worker:

```bash
./run.sh start
```

Stop the stack:

```bash
./run.sh stop
```

View logs:

```bash
./run.sh logs
```

One service only:

```bash
./run.sh logs api
```

### 3. Start the web app

Run the web app separately:

```bash
./run.sh web -- --port 3002
```

### 4. Open the app

- web: `http://localhost:3002`
- auth: `http://localhost:3002/auth`
- documents: `http://localhost:3002/documents`
- API health: `http://localhost:4000/health`
- collab health: `http://localhost:4001/health`
- worker health: `http://localhost:4002/health`
- MinIO console: `http://localhost:9001`

### 5. Sign in and test

Recommended smoke test:

1. Open `http://localhost:3002/auth`
2. Sign in with Google
3. Go to `/documents`
4. Create a document manually with `New document`
5. Open the same document in two tabs
6. Verify:
   - typing syncs between tabs
   - comments can be added
   - rename persists
   - AI proposals return when a real key is configured

## Development notes

- no starter documents are created automatically anymore
- in local development, cross-account document visibility is relaxed to simplify collaboration testing
- metadata and comments are still API-memory-backed in the current prototype
- realtime Yjs content is persisted by the collab service locally

## Database and Prisma

After the stack is up, run migrations if needed:

```bash
corepack pnpm --filter @repo/api db:migrate:dev
```

Generate Prisma client:

```bash
corepack pnpm --filter @repo/api prisma:generate
```

## Validation

Repository-wide checks:

```bash
./run.sh check
./run.sh test
```

Backend testing:

```bash
./run.sh test:backend
```

Frontend testing:

```bash
./run.sh test:frontend
./run.sh test:e2e
```

Regenerate Mermaid diagram images:

```bash
node scripts/render-ai1220-diagrams.mjs
```

## Documentation workflow

Process guidance lives in:

- [documentation-pipeline.md](/Users/indira.duisembayeva/Documents/New%20project/software-proj/docs/process/documentation-pipeline.md)
- [CONTRIBUTING.md](/Users/indira.duisembayeva/Documents/New%20project/software-proj/CONTRIBUTING.md)
- [git-conventions.md](/Users/indira.duisembayeva/Documents/New%20project/software-proj/docs/process/git-conventions.md)
- [local-setup.md](/Users/indira.duisembayeva/Documents/New%20project/software-proj/docs/process/local-setup.md)
