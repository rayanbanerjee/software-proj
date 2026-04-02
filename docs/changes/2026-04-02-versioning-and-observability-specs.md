# Change: Versioning And Observability Specs

## Date

2026-04-02

## Summary

Added the missing versioning and service-metrics specs, then refreshed stale backlog entries for already-landed prompt-template, package-script, worker-foundation, and export-spec work.

## Affected Areas

- `docs/specs`
- `docs/process`

## Completed Tasks

- `DOC-007`
- `DOC-008`
- `OPS-004`

## Backlog Sync

- `PKG-007`
- `PKG-010`
- `WORK-001`
- `WORK-002`
- `WORK-003`
- `WORK-004`
- `WORK-005`
- `WORK-006`
- `WORK-007`

## Follow-Up

- implement the first real versioning API slice against the new model spec
- add concrete metrics instrumentation once shared logging and request-id propagation are in place
- connect export endpoints to the existing export-pipeline spec

## References

- task: `docs/tasks/TASK-0022-versioning-and-observability-specs.md`
- export spec: `docs/specs/export-pipeline.md`
