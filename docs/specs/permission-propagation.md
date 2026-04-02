# Spec: Permission Propagation

## Status

Draft

## Goal

Define how document roles propagate into API authorization decisions for document and sharing actions.

## Scope

- document metadata, rename, and archive permissions
- invitation creation and acceptance behavior
- member role updates and access revocation
- audit logging for sharing changes

## Interfaces

- `@repo/authz` exports permission helpers used by API modules
- document routes read `canView` and `canEdit` through the shared permission helpers
- sharing routes read `canShare`, `canManageRoleChange`, and `canRevokeAccess`

## Data Model

- document memberships map a `userId` to a `DocumentRole`
- invitations capture `inviteeEmail`, `role`, expiration, acceptance, and revocation state
- audit events record the actor, document, target user, action, and lightweight metadata

## Flow

1. A document owner creates an invitation for a non-owner role.
2. The API signs the invitation token, stores an invitation record, and writes an audit event.
3. The invited user accepts with a matching email, which creates or updates their membership.
4. Document routes derive permission summaries from the shared authz helpers.
5. Owners may later update or revoke a member role, and those changes are audited.
6. The API posts a `document.permission.updated` event into the collab service so active sessions can downgrade writer access or be removed from presence.

## Failure Cases

- non-share members cannot create invitations
- invitation acceptance fails for revoked, expired, already accepted, or email-mismatched tokens
- non-owners cannot change roles or revoke access
- owner role cannot be assigned through invitation or role update endpoints

## Open Questions

- when the Prisma-backed implementation lands, should invitation tokens stay opaque or move to a user-facing link model
- should revocation preserve a disabled membership record instead of deleting it
