# Collaborative Document Editor

Base monorepo scaffold for the collaborative document editor and AI writing assistant described in the system design document.

## Repository layout

- `apps/web`: Next.js-style web client shell
- `apps/api`: API service shell
- `apps/collab`: collaboration gateway shell
- `apps/worker`: background worker shell
- `packages/*`: shared pure TypeScript packages
- `infrastructure/*`: deployment and local environment assets
- `docs/*`: ADRs, API notes, and diagrams

## Documentation pipeline

This repository assumes a large share of implementation will be done by AI agents. The collaboration contract lives in [docs/process/documentation-pipeline.md](/Users/rayan.banerjee/courses/software%20project/docs/process/documentation-pipeline.md).

Required artifacts:

- architecture and decision changes: `docs/adr/*`
- implementation specs and interface notes: `docs/specs/*`, `docs/api/*`
- active work tracking: `docs/tasks/*`
- agent handoffs and execution notes: `docs/handoffs/*`
- user-visible or repo-level change log entries: `docs/changes/*`

## Getting started

1. Install `pnpm`.
2. Copy `.env.example` values into app-specific env files as needed.
3. Add real framework dependencies before starting implementation.

## Initial priorities

- wire the web app to a real Next.js setup
- choose API framework: NestJS or Fastify
- add collaboration transport with Yjs/Hocuspocus
- define shared DTOs, authz matrix, and editor schema

## Validation

Run `pnpm docs:check` to validate the documentation pipeline structure and templates.
