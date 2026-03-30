# Contributing

## Workflow

1. Read [docs/process/documentation-pipeline.md](/Users/rayan.banerjee/courses/software%20project/docs/process/documentation-pipeline.md).
2. Check [docs/process/task-backlog.md](/Users/rayan.banerjee/courses/software%20project/docs/process/task-backlog.md) before creating new task IDs.
3. If the work is non-trivial, create or update the corresponding `docs/tasks/TASK-XXXX-*.md` file.
4. Update related ADRs, specs, API docs, or change notes in the same branch as the code change.
5. Leave a handoff note if the work is incomplete.

## Branch Naming

Use one of these prefixes:

- `feat/<scope>`
- `fix/<scope>`
- `docs/<scope>`
- `chore/<scope>`
- `refactor/<scope>`
- `test/<scope>`

Examples:

- `feat/auth-callback`
- `docs/collab-session-spec`
- `chore/local-docker-setup`

## Commit Naming

Use concise Conventional Commit style messages:

- `feat: add auth callback endpoint`
- `fix: guard invite acceptance for revoked tokens`
- `docs: record collaboration session lifecycle`
- `chore: add app env examples`

## Pull Request Expectations

- keep scope small and reviewable
- link the task ID in the PR title or body
- update docs when behavior or structure changes
- include follow-up items instead of hiding them

## Agent Rules

- do not create duplicate task docs for the same scope
- prefer editing canonical docs over adding parallel notes
- treat `docs/process/notion-backlog.csv` as the source for task status
- regenerate `docs/process/notion-board-import.csv` after backlog changes

