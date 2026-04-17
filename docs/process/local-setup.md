# Local Setup

## Prerequisites

- Node.js `>= 22`
- `corepack` enabled so `pnpm` is available
- Docker Desktop running
- Google OAuth client for browser sign-in
- OpenRouter or OpenAI API key if you want real AI responses

Use the repository Node version:

```bash
cat .nvmrc
```

Install dependencies:

```bash
corepack enable
corepack pnpm install
```

## Environment files

Create the local API env file:

```bash
cp apps/api/.env.example apps/api/.env.local
```

Important API values:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `WEB_ORIGIN=http://localhost:3002`
- `COLLAB_URL=ws://localhost:4001`
- `OPENROUTER_API_KEY` or `OPENAI_API_KEY`

Create the local web env file:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Important web values:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`

## Recommended local workflow

Start the local stack:

```bash
./run.sh start
```

Run the web app:

```bash
./run.sh web -- --port 3002
```

Stop the local stack:

```bash
./run.sh stop
```

Follow logs:

```bash
./run.sh logs
./run.sh logs api
```

## Testing

Backend coverage currently includes:

- API route and service tests under `apps/api/tests`
- collaboration server tests under `apps/collab/tests`
- worker tests under `apps/worker/tests`

Frontend coverage currently includes:

- web unit tests under `apps/web/tests`
- Playwright E2E shell coverage in `apps/web/tests/e2e`

Useful commands:

```bash
./run.sh test:backend
./run.sh test:frontend
./run.sh test:e2e
./run.sh check
```

## Database helpers

Generate Prisma client:

```bash
./run.sh prisma:generate
```

Run dev migrations:

```bash
./run.sh db:migrate
```

Seed demo data:

```bash
./run.sh db:seed
```
