# Change: Package Fixtures And UI Baseline

## Date

2026-03-31

## Summary

Completed the remaining package baseline work by expanding reusable sample document fixtures and giving the shared UI package a concrete primitives structure for future component work.

## Affected Areas

- `packages/test-fixtures/src/index.ts`
- `packages/test-fixtures/tests/index.test.ts`
- `packages/ui/src/index.ts`
- `packages/ui/src/primitives.ts`
- `packages/ui/tests/index.test.ts`

## Key Decisions

- provide both fixed sample documents and small factory helpers so tests can reuse defaults without copying large objects
- keep the initial UI package framework-agnostic by exporting typed primitive presets rather than React components before the web app stack is in place
- add lightweight tests so these package baselines stay validated as they evolve

## Completed Tasks

- `PKG-008`
- `PKG-009`

## Follow-Up

- expand fixture factories further when API integration tests are added
- evolve UI primitives into real shared components once the Next.js app and component patterns are in place

## References

- task backlog: `docs/process/task-backlog.md`
