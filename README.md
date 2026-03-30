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

## Getting started

1. Install `pnpm`.
2. Copy `.env.example` values into app-specific env files as needed.
3. Add real framework dependencies before starting implementation.

## Initial priorities

- wire the web app to a real Next.js setup
- choose API framework: NestJS or Fastify
- add collaboration transport with Yjs/Hocuspocus
- define shared DTOs, authz matrix, and editor schema

