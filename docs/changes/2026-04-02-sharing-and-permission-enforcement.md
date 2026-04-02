# Change: Sharing and Permission Enforcement

## Date

2026-04-02

## Summary

Implemented the first sharing API slice with signed invitations, invitation acceptance, owner-only role changes, revocation, permission helper reuse, and sharing audit records.

## Affected Areas

- `apps/api/src/modules/sharing/index.ts`
- `apps/api/src/modules/sharing/service.ts`
- `apps/api/src/modules/documents/service.ts`
- `apps/api/src/modules/audit/service.ts`
- `apps/api/tests/sharing.test.ts`
- `apps/api/tests/integration/sharing.integration.test.ts`
- `packages/authz/src/index.ts`
- `packages/shared-types/src/index.ts`

## Key Decisions

- keep sharing behavior in-memory for now so it matches the existing document service implementation
- enforce permissions through `@repo/authz` helpers instead of duplicating role matrices in API modules
- sign invitation tokens with the API session secret and store a hash for acceptance checks
- record sharing actions in the audit service so later persistence work has a stable event shape to follow

## Completed Tasks

- `SHARE-001`
- `SHARE-002`
- `SHARE-003`
- `SHARE-004`
- `SHARE-005`
- `SHARE-006`
- `SHARE-007`

## Follow-Up

- move invitations, memberships, and audit events onto the Prisma-backed persistence layer
- connect acceptance to real authenticated user identity instead of header-based test actors

## References

- API doc: `docs/api/sharing.md`
- spec: `docs/specs/permission-propagation.md`
