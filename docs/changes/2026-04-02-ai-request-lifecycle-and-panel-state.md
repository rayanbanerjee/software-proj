# 2026-04-02 AI Request Lifecycle And Panel State

## Summary

Upgraded the AI slice from an obsolete stub into the shared document-scoped request lifecycle, backed it with a local mock provider for deterministic development behavior, and added a concrete AI panel state model for the web shell.

## What Changed

- replaced the old `/documents/:id/ai-requests` routes with authenticated `/v1/documents/:documentId/ai/...` endpoints
- validated AI action, scope, prompt, and masking payloads against the shared DTO contract
- added in-memory request and proposal lifecycle handling with status polling plus accept and reject decisions
- introduced a local API-side mock provider client for development without external AI credentials
- added a web AI panel state helper for idle, generating, proposal-ready, and retryable states
- documented the lifecycle in API notes and a dedicated proposal spec
- synced stale Prisma-backed backlog tasks for AI requests, export jobs, and audit events

## Follow-Up

- implement stale proposal detection
- move execution through the worker queue
- persist AI request state in Prisma rather than memory
- apply accepted proposals through the normal document mutation path
