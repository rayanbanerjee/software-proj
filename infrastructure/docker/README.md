# Docker

## Local services

This directory defines the local backing services used during development:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MinIO object storage on `localhost:9000`
- MinIO console on `localhost:9001`
- API service on `localhost:4000`
- collaboration service on `localhost:4001`
- worker health endpoint on `localhost:4002`

## Start

```bash
./infrastructure/scripts/start-local.sh
```

This now starts the backing services and the `api`, `collab`, and `worker` containers defined in Compose.

## Stop

```bash
./infrastructure/scripts/stop-local.sh
```

## View logs

```bash
./infrastructure/scripts/logs-local.sh
```

To follow logs for one service only:

```bash
./infrastructure/scripts/logs-local.sh api
```

## Prisma workflow

After the local services are running, apply Prisma migrations from the API package:

```bash
pnpm --filter @repo/api db:migrate:dev
```

To apply committed migrations in a non-interactive environment:

```bash
pnpm --filter @repo/api db:migrate:deploy
```

If the Prisma client needs to be regenerated after schema changes:

```bash
pnpm --filter @repo/api prisma:generate
```

To load demo users, documents, and memberships for local development:

```bash
pnpm --filter @repo/api db:seed
```

## Default credentials

### PostgreSQL

- database: `collab_editor`
- user: `postgres`
- password: `postgres`

### MinIO

- user: `minioadmin`
- password: `minioadmin`

## Notes

- these settings are for local development only
- the object storage bucket still needs to be created by the application bootstrap or a future helper script
- the service containers run the workspace `dev` commands inside a shared monorepo image built from `infrastructure/docker/Dockerfile.dev`
- `api`, `collab`, and `worker` depend on the backing services but do not yet run database migrations automatically
- the seed script assumes Prisma migrations have already been applied to the local database
