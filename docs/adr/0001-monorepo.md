# ADR 0001: Monorepo Baseline

## Status

Accepted

## Context

The system design document recommends a monorepo so the web app, API, collaboration gateway, worker, and shared TypeScript packages evolve together.

## Decision

Use a pnpm workspace monorepo with `apps/*` for deployable services and `packages/*` for shared pure logic.

## Consequences

- shared contracts can evolve with service code
- CI can validate the full stack in one repository
- package boundaries must be enforced to avoid accidental coupling

