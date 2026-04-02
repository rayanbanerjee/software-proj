# Change: Editor Behavior Basics

## Date

2026-04-02

## Summary

Expanded the base web editor with visible paragraph and heading controls, a local draft persistence stub, and reusable selection helper utilities backed by editor-focused tests.

## Affected Areas

- `apps/web/src/editor/base-editor.tsx`
- `apps/web/src/editor/local-persistence.ts`
- `apps/web/src/editor/selection.ts`
- `apps/web/src/components/documents/document-workspace-shell.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/tests/editor-helpers.test.ts`

## Key Decisions

- expose paragraph and heading controls directly in the base editor UI so minimal block support is observable, not just configured
- keep local persistence intentionally lightweight by storing draft JSON in `localStorage`
- keep selection helpers framework-light so later undo, read-only, and collaboration work can reuse the same summaries

## Completed Tasks

- `EDIT-004`
- `EDIT-005`
- `EDIT-006`

## Follow-Up

- connect undo or redo and read-only mode to the same editor state helpers
- replace local draft storage with richer offline behavior when sync tasks begin

## References

- task backlog: `docs/process/task-backlog.md`
- editor foundation change: `docs/changes/2026-04-02-editor-foundation.md`
