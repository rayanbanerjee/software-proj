# TASK-0004: API Bootstrap And Config

## Status

Completed

## Goal

Establish the first runnable API service baseline with Fastify, validated environment configuration, Prisma setup, and explicit Google auth config requirements.

## Scope

- initialize the API app with Fastify
- add environment parsing and validation
- add Prisma schema and package wiring
- document the auth-related config surface

## Non-Goals

- implementing auth callbacks or token validation logic
- defining full database models beyond the initial schema baseline
- implementing business endpoints beyond a basic service bootstrap

## Dependencies

- ADRs: `docs/adr/0002-api-framework.md`, `docs/adr/0006-database-orm.md`
- Specs:
- Blockers:

## Implementation Notes

- the first API slice should be lightweight but runnable
- config parsing is shared at the app boundary so later modules reuse one source of truth
- Prisma is introduced with a starter schema and generation workflow, not full migrations yet

## Progress Log

### 2026-03-30

- added Fastify bootstrap files
- added validated API env config
- added Prisma schema baseline
- documented Google auth config requirements

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded

