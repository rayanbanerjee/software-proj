# TASK-0010: Web Workspace Shells

## Status

Done

## Goal

Build the next layer of the web application after `WEB-001`: route structure, shared workspace layout, auth shell states, document list and editor shells, and the supporting UI components that future editor tasks can build on.

## Scope

- complete `WEB-002` base layout and route structure
- complete `WEB-003` shared design tokens and CSS foundation
- complete `WEB-004` auth shell states
- complete `WEB-005` document list page scaffold
- complete `WEB-007` document editor route scaffold
- complete `WEB-008` through `WEB-015` as shell-level editor UI components
- leave `WEB-006` blocked until `DOCSVC-001` is complete in the canonical backlog

## Non-Goals

- implementing real backend-driven data fetching
- implementing the new document creation flow
- adding a real editor engine, collaboration transport, or modal business logic

## Dependencies

- ADRs: `docs/adr/0003-web-framework.md`
- Specs:
- Blockers: `WEB-006` remains blocked by `DOCSVC-001`

## Implementation Notes

- route and layout work should stay inside `apps/web` and extend the Next.js App Router baseline from `WEB-001`
- shell components should use placeholder data and clean boundaries so later work can replace static content incrementally
- the document editor route should be able to preview ready, empty, error, and loading states without requiring backend data

## Progress Log

### 2026-04-02

- confirmed `WEB-002`, `WEB-003`, and `WEB-004` are unblocked because `WEB-001` and `AUTH-004` are `Done`
- confirmed `WEB-006` is still blocked because `DOCSVC-001` remains `Backlog` in `docs/process/notion-backlog.csv`
- implemented `WEB-002`, `WEB-003`, `WEB-004`, `WEB-005`, `WEB-007`, `WEB-008`, `WEB-009`, `WEB-010`, `WEB-011`, `WEB-012`, `WEB-013`, `WEB-014`, and `WEB-015` inside `apps/web`
- added the workspace route group, shared CSS foundation, auth shells, document list scaffold, editor scaffold, and route-level loading or state previews
- left `WEB-006` intentionally unimplemented and documented as blocked so no fake create flow sneaks ahead of `DOCSVC-001`

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded
