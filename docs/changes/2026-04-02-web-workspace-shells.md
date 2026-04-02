# Change: Web Workspace Shells

## Date

2026-04-02

## Summary

Expanded the initial Next.js app into a routed workspace shell with shared design tokens, auth state shells, a document list scaffold, and a document editor scaffold with toolbar, presence, history, modal, offline, and state-preview components.

## Affected Areas

- `apps/web/src/app/(workspace)/*`
- `apps/web/src/components/chrome/*`
- `apps/web/src/components/auth/*`
- `apps/web/src/components/documents/*`
- `apps/web/src/lib/app-shell.ts`
- `apps/web/src/app/globals.css`
- `apps/web/tests/app-shell.test.ts`
- `docs/tasks/TASK-0010-web-workspace-shells.md`

## Completed Tasks

- `WEB-002`
- `WEB-003`
- `WEB-004`
- `WEB-005`
- `WEB-007`
- `WEB-008`
- `WEB-009`
- `WEB-010`
- `WEB-011`
- `WEB-012`
- `WEB-013`
- `WEB-014`
- `WEB-015`

## Blocked Tasks

- `WEB-006` remains blocked because `DOCSVC-001` is still `Backlog` in `docs/process/notion-backlog.csv`

## Follow-Up

- connect the list and editor routes to real document service data once `DOCSVC-001` and later document API tasks are complete
- replace the query-string shell toggles with real interaction state when the editor, sharing, AI, export, and sync tasks land

## References

- task: `docs/tasks/TASK-0010-web-workspace-shells.md`
- ADRs: `docs/adr/0003-web-framework.md`, `docs/adr/0007-auth-token-and-session-strategy.md`
