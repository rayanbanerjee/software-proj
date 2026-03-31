# Change: Prompt Templates And Package Scripts

## Date

2026-03-31

## Summary

Added an explicit version model for AI prompt templates and replaced package-level placeholder scripts with real build, lint, test, and typecheck commands so package workflows run cleanly.

## Affected Areas

- `packages/prompt-templates/src/index.ts`
- `packages/authz/package.json`
- `packages/editor-schema/package.json`
- `packages/prompt-templates/package.json`
- `packages/shared-types/package.json`
- `packages/test-fixtures/package.json`
- `packages/ui/package.json`

## Key Decisions

- version prompt templates explicitly so future AI request handling can tie prompts to stable contract revisions
- keep package build and typecheck commands aligned on `tsc -p tsconfig.json`
- use package-scoped lint commands and `vitest --passWithNoTests` to avoid placeholder script drift while tests are still being added incrementally

## Completed Tasks

- `PKG-007`
- `PKG-010`

## Follow-Up

- add dedicated package tests where current packages still rely on no-test passes
- consider extracting a shared package script convention once more internal packages are added

## References

- task backlog: `docs/process/task-backlog.md`
- AI DTOs: `packages/shared-types/src/index.ts`
