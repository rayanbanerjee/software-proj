#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage: ./run.sh <command> [args]

Core local workflow:
  start                 Start Docker-backed local services and service containers
  stop                  Stop the local Docker stack
  logs [service]        Follow logs for all services or one named service
  web [extra args]      Run the Next.js web app locally
  api [extra args]      Run the Fastify API locally
  collab [extra args]   Run the collaboration server locally
  worker [extra args]   Run the worker locally

Validation:
  check                 Run lint, typecheck, docs check, and E2E setup check
  test                  Run the full repository test suite
  test:backend          Run API, collab, and worker tests
  test:frontend         Run web unit tests and E2E setup checks
  e2e:install           Install the Playwright browser used by the web E2E suite
  test:e2e              Run Playwright E2E tests for the web app

Database helpers:
  prisma:generate       Generate the Prisma client
  db:migrate            Run Prisma dev migrations for the API
  db:seed               Seed demo data for local development
EOF
}

run_pnpm() {
  (cd "$ROOT_DIR" && corepack pnpm "$@")
}

command="${1:-help}"

case "$command" in
  help|-h|--help)
    usage
    ;;
  start)
    shift
    "$ROOT_DIR/infrastructure/scripts/start-local.sh" "$@"
    ;;
  stop)
    shift
    "$ROOT_DIR/infrastructure/scripts/stop-local.sh" "$@"
    ;;
  logs)
    shift
    "$ROOT_DIR/infrastructure/scripts/logs-local.sh" "$@"
    ;;
  web)
    shift
    run_pnpm --filter @repo/web dev "$@"
    ;;
  api)
    shift
    run_pnpm --filter @repo/api dev "$@"
    ;;
  collab)
    shift
    run_pnpm --filter @repo/collab dev "$@"
    ;;
  worker)
    shift
    run_pnpm --filter @repo/worker dev "$@"
    ;;
  check)
    run_pnpm lint
    run_pnpm typecheck
    run_pnpm docs:check
    run_pnpm e2e:check
    ;;
  test)
    run_pnpm test
    ;;
  test:backend)
    run_pnpm --filter @repo/api test
    run_pnpm --filter @repo/collab test
    run_pnpm --filter @repo/worker test
    ;;
  test:frontend)
    run_pnpm --filter @repo/web test
    run_pnpm e2e:check
    ;;
  e2e:install)
    run_pnpm e2e:install
    ;;
  test:e2e)
    run_pnpm --filter @repo/web test:e2e
    ;;
  prisma:generate)
    run_pnpm --filter @repo/api prisma:generate
    ;;
  db:migrate)
    run_pnpm --filter @repo/api db:migrate:dev
    ;;
  db:seed)
    run_pnpm --filter @repo/api db:seed
    ;;
  *)
    echo "Unknown command: $command" >&2
    echo >&2
    usage >&2
    exit 1
    ;;
esac
