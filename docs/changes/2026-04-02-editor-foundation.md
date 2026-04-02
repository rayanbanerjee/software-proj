# Change: Editor Foundation

## Date

2026-04-02

## Summary

Installed the first TipTap and ProseMirror dependencies, expanded the shared editor schema package, and mounted a base editor component inside the web document route.

## Affected Areas

- `apps/web/package.json`
- `apps/web/src/editor/base-editor.tsx`
- `apps/web/src/components/documents/document-workspace-shell.tsx`
- `apps/web/src/app/globals.css`
- `packages/editor-schema/package.json`
- `packages/editor-schema/src/index.ts`

## Key Decisions

- use TipTap as the first editor runtime on top of ProseMirror-compatible packages
- keep the shared schema minimal at first with document, paragraph, text, and heading support
- mount the editor only in the ready workspace state so existing empty and error shells remain available

## Completed Tasks

- `EDIT-001`
- `EDIT-002`
- `EDIT-003`

## Follow-Up

- add richer block support and local persistence
- layer in selection helpers, undo or redo, and read-only mode on top of the mounted editor

## References

- task doc: `docs/tasks/TASK-0011-base-editor-component.md`
- task backlog: `docs/process/task-backlog.md`
