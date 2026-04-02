# TASK-0015: Session Lifecycle Spec And Sequence Diagram

## Status

Completed

## Goal

Document the expected lifecycle for opening a document and joining a live collaboration session so later collab and web work has a stable behavioral reference.

## Scope

- define the document session lifecycle in a durable spec
- add the open-document and join-session sequence diagram source
- align the spec with the current API auth and collab handshake contracts
- refresh backlog tracking for newly completed docs work

## Non-Goals

- implementing the full collab join endpoint
- specifying low-level Yjs binary message details
- defining offline recovery internals

## Dependencies

- ADRs: `ADR-004`, `ADR-007`
- Specs: `DOC-002`
- Blockers:

## Implementation Notes

- keep the lifecycle description concrete enough to guide `COLLAB-003`
- describe what already exists versus what later tasks still need to implement
- use Mermaid source so the diagram stays editable in-repo

## Progress Log

### 2026-04-02

- added the document session lifecycle spec
- added the open-document and join-session Mermaid sequence diagram
- refreshed stale backlog states for already-landed DTO, migration, and integration-harness work

## Definition of Done

- code merged
- related docs updated
- follow-up items recorded
