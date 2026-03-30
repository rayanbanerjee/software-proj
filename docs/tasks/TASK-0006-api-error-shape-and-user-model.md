# TASK-0006: API Error Shape And User Model

## Status

Completed

## Goal

Standardize the API error envelope, finalize the first user model baseline, and register the documents module skeleton so downstream API work has stable boundaries.

## Scope

- add standard API error response handling
- extend the Prisma user model baseline
- add shared user profile mapping
- register the documents module skeleton

## Non-Goals

- implementing document CRUD routes
- adding auth sessions or current-user endpoints
- adding database migrations beyond the schema baseline

## Dependencies

- ADRs: `docs/adr/0002-api-framework.md`, `docs/adr/0006-database-orm.md`
- Specs:
- Blockers:

## Implementation Notes

- error handling is centralized so later modules inherit one shape
- the user model now includes a `googleSubject` field to align with Google auth plans
- the documents module is a registration boundary only in this batch

## Progress Log

### 2026-03-30

- added centralized error handling
- added user profile mapping from Prisma model to shared type
- registered the documents module skeleton
- added tests for errors and user profile mapping

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded

