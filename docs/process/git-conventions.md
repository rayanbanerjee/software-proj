# Git Conventions

## Branches

Use short, descriptive branch names with a prefix:

- `feat/<scope>`
- `fix/<scope>`
- `docs/<scope>`
- `chore/<scope>`
- `refactor/<scope>`
- `test/<scope>`

## Commits

Use short Conventional Commit style messages:

- `feat: add document create endpoint`
- `fix: preserve recovery buffer on revoke`
- `docs: add websocket event contracts`
- `chore: add prettier config`

## Task References

- mention the task ID in the commit body or PR when the change maps to backlog work
- use the same task ID across code, docs, and handoff notes
- avoid bundling unrelated task IDs into one commit

## Pull Requests

- keep PRs scoped to one logical change area
- include docs updates in the same PR when behavior changes
- record follow-up work in the backlog instead of leaving it implicit
