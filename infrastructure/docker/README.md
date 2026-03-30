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
