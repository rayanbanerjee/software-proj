# Change: Export Request And Status Routes

## Date

2026-04-02

## Summary

Implemented the first authenticated exports API slice with request, status, and download-link routes on the document surface.

## Affected Areas

- `apps/api/src/modules/exports`
- `apps/api/tests`
- `docs/api`

## Completed Tasks

- `EXP-001`
- `EXP-002`
- `EXP-006`

## Follow-Up

- connect export requests to persistent job storage
- add a real artifact endpoint and object-storage integration
- wire the web export modal to the new status endpoints

## References

- task: `docs/tasks/TASK-0024-export-request-and-status-routes.md`
- spec: `docs/specs/export-pipeline.md`
