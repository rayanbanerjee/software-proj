# Change: Lint And Typecheck Foundation

## Date

2026-03-30

## Summary

Completed the first runnable quality gate setup for the repository by adding a shared ESLint config package, a real root lint command, and a root typecheck runner that checks all current app and package TypeScript projects.

## Affected Areas

- `package.json`
- `eslint.config.mjs`
- `packages/eslint-config`
- `scripts/run-typecheck.mjs`
- `apps/web/tsconfig.json`
- `apps/web/src/types/jsx.d.ts`
- `docs/process/notion-backlog.csv`

## Completed Tasks

- `FOUND-003`
- `FOUND-005`
- `FOUND-007`
- `FOUND-008`

## Follow-Up

- add package-level lint scripts if the repo later returns to turbo-based lint fanout
- replace the temporary JSX ambient types when `apps/web` is converted to a real Next.js app

## References

- task backlog: `docs/process/task-backlog.md`
- notion backlog: `docs/process/notion-backlog.csv`
