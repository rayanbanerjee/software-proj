# Change: Documentation Pipeline Baseline

## Date

2026-03-30

## Summary

Established the repository's first concrete collaboration pipeline for AI-agent-heavy development, including document categories, templates, and CI validation.

## Affected Areas

- `docs/process`
- `docs/templates`
- `docs/tasks`
- `docs/handoffs`
- `scripts/check-docs.mjs`
- `.github/workflows/ci.yml`

## Key Decisions

- keep enforcement lightweight and structural instead of trying to lint prose quality
- separate durable decisions, execution tracking, and handoff notes into different directories
- require task docs for non-trivial work so agents have a stable execution anchor

## Follow-Up

- add docs for API contracts and subsystem specs as implementation starts
- consider requiring changed-code-to-doc links in PR descriptions later

## References

- task: `docs/tasks/TASK-0001-documentation-pipeline.md`
- ADR: `docs/adr/0001-monorepo.md`
- commit:
