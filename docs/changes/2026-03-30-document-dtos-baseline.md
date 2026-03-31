# Change: Document DTOs Baseline

## Date

2026-03-30

## Summary

Expanded `@repo/shared-types` with the first stable document API contracts so upcoming document service endpoints can share one DTO vocabulary across the API and web app.

## Affected Areas

- `packages/shared-types/src/index.ts`

## Key Decisions

- keep document DTOs transport-focused and JSON-friendly by using string timestamps
- separate list-item shape from full metadata shape so list endpoints can stay lighter
- include a permission summary in document metadata to support future UI gating and API responses without duplicating role logic in consumers

## Completed Tasks

- `PKG-001`

## Follow-Up

- add session DTOs for collaboration APIs in `PKG-002`
- add document service API docs once create, list, and metadata endpoints are implemented

## References

- task backlog: `docs/process/task-backlog.md`
- API notes: `docs/api/README.md`
