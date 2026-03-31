# Change: Authz Permission Baseline

## Date

2026-03-30

## Summary

Completed the first reusable authorization baseline by centralizing document permission constants in `@repo/authz` and exposing simple role-check helpers for downstream API and web code.

## Affected Areas

- `packages/authz/src/index.ts`
- `packages/authz/tests/index.test.ts`

## Key Decisions

- keep the permission vocabulary centralized in one package instead of duplicating string literals
- continue using `DocumentRole` from `@repo/shared-types` as the source of role names
- expose both a generic `hasPermission` helper and focused `canView`, `canEdit`, and `canShare` helpers for common checks

## Completed Tasks

- `PKG-005`
- `PKG-006`

## Follow-Up

- wire these helpers into future sharing and editor read-only enforcement
- expand the authz package with permission propagation rules once sharing flows are implemented

## References

- task backlog: `docs/process/task-backlog.md`
