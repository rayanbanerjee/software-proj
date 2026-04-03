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

## Prerequisites

- Node.js `>= 22`
- `corepack` enabled so `pnpm` is available
- Docker Desktop running for local services
- Google OAuth client for browser sign-in
- OpenRouter API key if you want real AI responses instead of config errors

Use the repo Node version:

```bash
cat .nvmrc
```

Then install dependencies:

```bash
corepack enable
corepack pnpm install
```

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
bash infrastructure/scripts/start-local.sh
```

Stop the stack:

```bash
bash infrastructure/scripts/stop-local.sh
```

View logs:

```bash
bash infrastructure/scripts/logs-local.sh
```

One service only:

```bash
bash infrastructure/scripts/logs-local.sh api
```

### 3. Start the web app

Run the web app separately:

```bash
corepack pnpm --filter @repo/web dev -- --port 3002
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

Lint:

```bash
corepack pnpm lint
```

Typecheck:

```bash
corepack pnpm typecheck
```

Tests:

```bash
corepack pnpm test
```

Docs pipeline:

```bash
node scripts/check-docs.mjs
```

Regenerate Mermaid diagram images:

```bash
node scripts/render-ai1220-diagrams.mjs
```

Rebuild the LaTeX PDF:

```bash
xelatex -interaction=nonstopmode -halt-on-error -jobname=AI1220_system_design_document_tex -output-directory=dist AI1220_system_design_document.tex
```

## Documentation workflow

Process guidance lives in:

- [documentation-pipeline.md](/Users/rayan.banerjee/courses/software%20project/docs/process/documentation-pipeline.md)
- [CONTRIBUTING.md](/Users/rayan.banerjee/courses/software%20project/CONTRIBUTING.md)
- [git-conventions.md](/Users/rayan.banerjee/courses/software%20project/docs/process/git-conventions.md)
