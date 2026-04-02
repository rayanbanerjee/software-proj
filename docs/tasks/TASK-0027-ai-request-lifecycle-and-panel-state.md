# TASK-0027 AI Request Lifecycle And Panel State

## Summary

Replace the obsolete AI stub routes with the shared document-scoped request lifecycle, add a local mock-provider client for development, and give the web shell a concrete AI panel state model.

## Scope

- implement authenticated AI request submission and status routes
- validate AI action, scope, and masking fields
- add proposal accept and reject placeholder endpoints
- store request and proposal lifecycle state in memory for local development
- add a mock provider client inside the API slice for deterministic local outputs
- add a web AI panel state model for idle, in-flight, proposal-ready, and retry states
- document the proposal lifecycle and API surface

## Out Of Scope

- durable AI persistence
- worker-queued execution
- stale proposal detection logic
- applying accepted proposals into editor content

## Completion

- completed `DOC-006`
- completed `AI-001`, `AI-002`, `AI-003`, `AI-004`, `AI-005`, `AI-006`, `AI-008`, `AI-009`, `AI-010`, `AI-011`, and `AI-012`
- synced previously-landed Prisma schema tasks `DB-007`, `DB-008`, and `DB-009`
