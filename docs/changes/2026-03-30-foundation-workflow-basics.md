# Change: Foundation Workflow Basics

## Date

2026-03-30

## Summary

Completed a first batch of small repository foundation tasks to make agent and human collaboration less ambiguous and to reduce setup drift across local environments.

## Affected Areas

- `CONTRIBUTING.md`
- `.nvmrc`
- `.prettierrc.json`
- `.prettierignore`
- `apps/*/.env.example`
- `docs/process/git-conventions.md`
- `docs/process/notion-backlog.csv`

## Key Decisions

- keep one repo-wide Prettier config at the root
- give each app its own local `.env.example` so setup is service-specific
- store git naming conventions in `docs/process` and link them from the root contribution guide

## Completed Tasks

- `FOUND-001`
- `FOUND-002`
- `FOUND-004`
- `FOUND-006`
- `FOUND-010`

## Follow-Up

- add ESLint and a real lint command
- pin dependencies with a checked-in lockfile
- make root typecheck and tests run against installed tooling

## References

- task backlog: `docs/process/task-backlog.md`
- notion backlog: `docs/process/notion-backlog.csv`
