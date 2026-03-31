# Change: Shared Runtime DTOs

## Date

2026-03-31

## Summary

Expanded `@repo/shared-types` with the next runtime contract batch for collaboration sessions, AI requests and proposals, and version/export flows so upcoming API and collab work can build on one shared DTO set.

## Affected Areas

- `packages/shared-types/src/index.ts`

## Key Decisions

- keep transport contracts JSON-friendly by using string timestamp fields throughout
- define collaboration session payloads around join, leave, heartbeat, and presence summaries
- define AI contracts around request submission, status polling, and proposal accept or reject flows
- split revision and export payloads into summary and detail shapes so later endpoints can stay lightweight where possible

## Completed Tasks

- `PKG-002`
- `PKG-003`
- `PKG-004`

## Follow-Up

- wire the new session DTOs into `COLLAB-003` and the future websocket event documentation
- align AI endpoint implementation and prompt template versioning with these request and proposal contracts
- add concrete versioning and export specs once `VER-001` and `EXP-001` are implemented

## References

- task backlog: `docs/process/task-backlog.md`
- ADR: `docs/adr/0004-collaboration-stack.md`
- API notes: `docs/api/README.md`
