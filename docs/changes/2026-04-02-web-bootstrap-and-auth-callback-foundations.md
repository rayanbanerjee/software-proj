# Change: Web Bootstrap And Auth Callback Foundations

## Date

2026-04-02

## Summary

Accepted the remaining auth and snapshot architecture decisions for the first platform slice, added the initial container diagram source, converted `apps/web` into a real Next.js app, and implemented the first working Google auth callback endpoint in the API.

## Affected Areas

- `docs/adr/0007-auth-token-and-session-strategy.md`
- `docs/adr/0008-snapshot-storage-format.md`
- `docs/diagrams/container-diagram.mmd`
- `docs/diagrams/README.md`
- `docs/specs/authentication-flow.md`
- `docs/api/authentication.md`
- `docs/api/README.md`
- `docs/tasks/TASK-0005-health-and-auth-skeleton.md`
- `docs/tasks/TASK-0009-web-bootstrap-and-auth-foundations.md`
- `apps/web/*`
- `apps/api/src/modules/auth/*`
- `apps/api/tests/auth-callback.test.ts`

## Key Decisions

- issue API sessions as self-contained HMAC-signed tokens delivered through the `collab_session` cookie
- treat binary Yjs snapshots as the canonical persisted revision format
- use Mermaid source for the first committed container diagram so the architecture view stays editable in plain text
- keep the first auth callback compatible with the existing stub Google validator so the endpoint can be tested without external OAuth calls

## Completed Tasks

- `ADR-007`
- `ADR-008`
- `DOC-009`
- `WEB-001`
- `AUTH-004`

## Follow-Up

- build `AUTH-005`, `AUTH-006`, and `AUTH-007` directly on the new signed-session contract
- extend the new Next.js baseline into route structure, auth shells, and editor screens in the follow-up web tasks
- implement version snapshot creation and rollback flows on top of the accepted Yjs snapshot format

## References

- task: `docs/tasks/TASK-0009-web-bootstrap-and-auth-foundations.md`
- ADRs: `docs/adr/0003-web-framework.md`, `docs/adr/0004-collaboration-stack.md`, `docs/adr/0007-auth-token-and-session-strategy.md`, `docs/adr/0008-snapshot-storage-format.md`
