# Docker

## Local services

This directory defines the local backing services used during development:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`
- MinIO object storage on `localhost:9000`
- MinIO console on `localhost:9001`

## Start

```bash
./infrastructure/scripts/start-local.sh
```

## Stop

```bash
./infrastructure/scripts/stop-local.sh
```

## View logs

```bash
./infrastructure/scripts/logs-local.sh
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
- service containers for `api`, `collab`, and `worker` are intentionally deferred to later tasks
- the seed script assumes Prisma migrations have already been applied to the local database
