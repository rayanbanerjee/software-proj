# ADR 0003: Web Framework

## Status

Accepted

## Context

The system design document already points to React and Next.js, but the repository still needs an explicit implementation choice for how the web app should be set up before `WEB-001` begins.

## Decision

Use Next.js with the App Router as the web application baseline.

## Consequences

- route structure and layout composition can follow the App Router model from the start
- server and client component boundaries can be introduced incrementally as the product grows
- the repo can use a mainstream React full-stack framework without inventing custom app bootstrapping
- current placeholder TSX files remain temporary until `WEB-001` replaces them with a real Next.js app

## Links

- Task: `docs/tasks/TASK-0002-framework-decisions-and-test-foundation.md`
- Spec:
- Related ADR: `docs/adr/0001-monorepo.md`

