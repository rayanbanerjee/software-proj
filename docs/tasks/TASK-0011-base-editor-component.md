# TASK-0011: Base Editor Component

## Status

Completed

## Goal

Mount a real rich-text editor foundation in the web document route so later editor tasks build on an executable TipTap surface instead of static shell content.

## Scope

- install the first TipTap and ProseMirror dependencies
- define the minimal shared editor schema package contents
- add a base editor component under `apps/web/src/editor`
- mount the editor into the ready-state document workspace shell

## Non-Goals

- local persistence
- undo and redo behavior
- read-only mode
- collaboration transport

## Dependencies

- ADRs: `docs/adr/0004-collaboration-stack.md`
- Specs:
- Blockers:

## Implementation Notes

- the first pass keeps the editor schema intentionally small with document, paragraph, text, and heading support
- the mounted editor uses placeholder content so the component is visibly interactive inside the current route shell
- the editor is only shown for the ready document state; empty and error shell variants stay intact

## Progress Log

### 2026-04-02

- added TipTap and ProseMirror package dependencies
- expanded `@repo/editor-schema` with reusable minimal extension exports
- added `BaseEditor` and mounted it into the document workspace shell

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded
