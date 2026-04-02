# Task Backlog

## Purpose

This is the canonical shared backlog for pending project work. Agents should read this file before creating new task trackers so work is not duplicated.

Notion sync source:

- `docs/process/notion-backlog.csv`

Suggested Notion properties:

- `Task ID`
- `Title`
- `Area`
- `Status`
- `Priority`
- `Owner`
- `Depends On`
- `Definition of Done`
- `Docs Required`
- `Repo Path`

Default status values:

- `Backlog`
- `Ready`
- `In Progress`
- `Blocked`
- `Done`

## Prioritized first slice

1. `DB-003` Create documents table or model.
2. `DB-004` Create memberships table or model.
3. `DOCSVC-001` Implement create document endpoint.
4. `TEST-003` Add API integration test harness.
5. `WORK-001` Initialize worker runtime.
6. `INFRA-003` Add API service container.
7. `COLLAB-002` Add session token verification.
8. `SHARE-005` Add permission matrix enforcement helpers.
9. `INFRA-004` Add collab service container.
10. `INFRA-005` Add worker service container.

## Recently completed

- `FOUND-001` Add root `CONTRIBUTING.md` with repo workflow
- `FOUND-002` Add `.nvmrc` or `.node-version`
- `FOUND-003` Add pinned `pnpm-lock.yaml`
- `FOUND-004` Add app-level `.env.example` files
- `FOUND-005` Add shared ESLint config
- `FOUND-006` Add shared Prettier config
- `FOUND-007` Add root `lint` script that actually runs
- `FOUND-008` Make root `typecheck` pass cleanly
- `FOUND-009` Add root `test` placeholders that pass
- `FOUND-010` Add commit and branch naming conventions doc
- `DOC-001` Commit current documentation pipeline changes
- `ADR-002` Decide `NestJS` vs `Fastify` for API
- `ADR-003` Decide `Next.js` app setup details
- `ADR-004` Decide collab server stack around `Yjs/Hocuspocus`
- `ADR-005` Decide queue and job framework for worker
- `ADR-006` Decide database ORM or query layer
- `TEST-001` Decide and set up Vitest or Jest
- `TEST-002` Add shared test config
- `API-001` Initialize a real API framework in `apps/api`
- `API-002` Add health check endpoint
- `API-003` Add config loader and env validation
- `API-005` Add standard error response shape
- `API-006` Add auth module skeleton
- `API-007` Add documents module skeleton
- `DB-001` Choose ORM and add initial config
- `DB-002` Create users table or model
- `AUTH-001` Add Google auth config fields
- `AUTH-002` Implement Google token validation service stub
- `AUTH-003` Add user profile model
- `AUTH-005` Add session issuance logic
- `AUTH-006` Add auth guard middleware
- `AUTH-007` Add current-user endpoint
- `DOC-003` Add authentication flow spec
- `COLLAB-001` Initialize real collaboration server
- `PKG-008` Add test fixtures for sample documents
- `TEST-006` Add fixture factories
- `INFRA-001` Add Docker Compose for Postgres and Redis
- `INFRA-002` Add local object storage service to Compose
- `INFRA-006` Add startup helper scripts
- `INFRA-007` Add local bootstrap README
- `OPS-005` Add health and readiness endpoints

## Micro Tasks

| Task ID | Title | Area | Priority | Depends On | Docs Required | Repo Path |
| --- | --- | --- | --- | --- | --- | --- |
| FOUND-001 | Add root `CONTRIBUTING.md` with repo workflow | Foundation | High | TASK-0001 | change note | `/` |
| FOUND-002 | Add `.nvmrc` or `.node-version` | Foundation | Medium |  | none | `/` |
| FOUND-003 | Add pinned `pnpm-lock.yaml` | Foundation | Medium |  | change note | `/` |
| FOUND-004 | Add app-level `.env.example` files | Foundation | High |  | change note | `/apps` |
| FOUND-005 | Add shared ESLint config | Foundation | High |  | task doc + change note | `/` |
| FOUND-006 | Add shared Prettier config | Foundation | High |  | change note | `/` |
| FOUND-007 | Add root `lint` script that actually runs | Foundation | High | FOUND-005 | change note | `/package.json` |
| FOUND-008 | Make root `typecheck` pass cleanly | Foundation | High |  | change note | `/` |
| FOUND-009 | Add root `test` placeholders that pass | Foundation | Medium |  | none | `/` |
| FOUND-010 | Add commit and branch naming conventions doc | Foundation | Medium | TASK-0001 | change note | `/docs/process` |
| DOC-001 | Commit current documentation pipeline changes | Docs | High | TASK-0001 | handoff + change note | `/docs` |
| DOC-002 | Add `docs/api/websocket-events.md` | Docs | High | COLLAB-001 | api doc + change note | `/docs/api` |
| DOC-003 | Add authentication flow spec | Docs | High | AUTH-002 | spec | `/docs/specs` |
| DOC-004 | Add document session lifecycle spec | Docs | High | COLLAB-003 | spec | `/docs/specs` |
| DOC-005 | Add permission propagation spec | Docs | High | SHARE-005,COLLAB-008 | spec | `/docs/specs` |
| DOC-006 | Add AI proposal lifecycle spec | Docs | High | AI-002,AI-007 | spec | `/docs/specs` |
| DOC-007 | Add versioning model spec | Docs | High | VER-001 | spec | `/docs/specs` |
| DOC-008 | Add export pipeline spec | Docs | Medium | EXP-001 | spec | `/docs/specs` |
| DOC-009 | Add initial container diagram source file | Docs | Medium | ADR-002,ADR-004,ADR-005 | diagram | `/docs/diagrams` |
| DOC-010 | Add sequence diagram for open document and join session | Docs | Medium | DOC-004 | diagram | `/docs/diagrams` |
| ADR-002 | Decide `NestJS` vs `Fastify` for API | Architecture | High |  | ADR + task doc | `/docs/adr` |
| ADR-003 | Decide `Next.js` app setup details | Architecture | High |  | ADR + task doc | `/docs/adr` |
| ADR-004 | Decide collab server stack around `Yjs/Hocuspocus` | Architecture | High |  | ADR + task doc | `/docs/adr` |
| ADR-005 | Decide queue and job framework for worker | Architecture | High |  | ADR + task doc | `/docs/adr` |
| ADR-006 | Decide database ORM or query layer | Architecture | High |  | ADR + task doc | `/docs/adr` |
| ADR-007 | Decide auth token and session strategy | Architecture | High |  | ADR + task doc | `/docs/adr` |
| ADR-008 | Decide snapshot storage format | Architecture | Medium | ADR-004 | ADR + task doc | `/docs/adr` |
| WEB-001 | Turn `apps/web` into a real Next.js app | Web | High | ADR-003 | task doc + change note | `/apps/web` |
| WEB-002 | Add base layout and route structure | Web | High | WEB-001 | none | `/apps/web` |
| WEB-003 | Add shared design tokens and CSS foundation | Web | Medium | WEB-001 | change note | `/apps/web` |
| WEB-004 | Add auth shell states | Web | Medium | AUTH-004 | none | `/apps/web` |
| WEB-005 | Add document list page scaffold | Web | High | WEB-002 | none | `/apps/web` |
| WEB-006 | Add new document button flow stub | Web | High | WEB-005,DOCSVC-001 | none | `/apps/web` |
| WEB-007 | Add document editor route scaffold | Web | High | WEB-002 | none | `/apps/web` |
| WEB-008 | Add editor toolbar shell | Web | Medium | WEB-007 | none | `/apps/web` |
| WEB-009 | Add collaborator presence UI shell | Web | Medium | WEB-007 | none | `/apps/web` |
| WEB-010 | Add version history panel shell | Web | Medium | WEB-007 | none | `/apps/web` |
| WEB-011 | Add sharing modal shell | Web | Medium | WEB-007 | none | `/apps/web` |
| WEB-012 | Add AI action menu shell | Web | Medium | WEB-007 | none | `/apps/web` |
| WEB-013 | Add export modal shell | Web | Medium | WEB-007 | none | `/apps/web` |
| WEB-014 | Add offline status banner component | Web | Medium | WEB-007 | none | `/apps/web` |
| WEB-015 | Add empty, error, and loading states for document screen | Web | Medium | WEB-007 | none | `/apps/web` |
| EDIT-001 | Install TipTap and ProseMirror dependencies | Editor | High | WEB-001,ADR-004 | change note | `/apps/web,/packages/editor-schema` |
| EDIT-002 | Create base editor component | Editor | High | EDIT-001 | task doc | `/apps/web/src/editor` |
| EDIT-003 | Define minimal editor schema package contents | Editor | High | EDIT-001 | change note | `/packages/editor-schema` |
| EDIT-004 | Add paragraph, text, and heading support | Editor | Medium | EDIT-002,EDIT-003 | none | `/apps/web/src/editor` |
| EDIT-005 | Add local editor state persistence stub | Editor | Medium | EDIT-002 | none | `/apps/web/src/editor` |
| EDIT-006 | Add editor selection state helpers | Editor | Medium | EDIT-002 | none | `/apps/web/src/editor` |
| EDIT-007 | Add document title editing UI | Editor | Medium | WEB-007 | none | `/apps/web` |
| EDIT-008 | Add undo and redo hooks | Editor | Medium | EDIT-002 | none | `/apps/web/src/editor` |
| EDIT-009 | Add read-only editor mode | Editor | High | EDIT-002,SHARE-005 | none | `/apps/web/src/editor` |
| EDIT-010 | Add basic editor tests | Editor | Medium | TEST-001,EDIT-002 | none | `/apps/web/tests` |
| PKG-001 | Expand `shared-types` for document DTOs | Packages | High | ADR-002 | change note | `/packages/shared-types` |
| PKG-002 | Expand `shared-types` for session DTOs | Packages | High | ADR-004 | change note | `/packages/shared-types` |
| PKG-003 | Expand `shared-types` for AI DTOs | Packages | High | AI-001 | change note | `/packages/shared-types` |
| PKG-004 | Expand `shared-types` for version and export DTOs | Packages | High | VER-001,EXP-001 | change note | `/packages/shared-types` |
| PKG-005 | Add permission enums and constants to `authz` | Packages | High |  | change note | `/packages/authz` |
| PKG-006 | Add `canView`, `canEdit`, and `canShare` helpers | Packages | High | PKG-005 | none | `/packages/authz` |
| PKG-007 | Add prompt template version model | Packages | Medium | AI-002 | change note | `/packages/prompt-templates` |
| PKG-008 | Add test fixtures for sample documents | Packages | Medium | TEST-006 | none | `/packages/test-fixtures` |
| PKG-009 | Add reusable UI primitives package structure | Packages | Medium | WEB-001 | none | `/packages/ui` |
| PKG-010 | Make package build and typecheck scripts work | Packages | High | FOUND-008 | none | `/packages` |
| API-001 | Initialize real API framework in `apps/api` | API | High | ADR-002 | task doc + change note | `/apps/api` |
| API-002 | Add health check endpoint | API | Medium | API-001 | none | `/apps/api` |
| API-003 | Add config loader and env validation | API | High | API-001 | change note | `/apps/api/src/config` |
| API-004 | Add request logging middleware | API | Medium | API-001,OPS-001 | none | `/apps/api` |
| API-005 | Add standard error response shape | API | High | API-001 | api doc | `/apps/api` |
| API-006 | Add auth module skeleton | API | High | API-001 | none | `/apps/api/src/modules/auth` |
| API-007 | Add documents module skeleton | API | High | API-001 | none | `/apps/api/src/modules/documents` |
| API-008 | Add sharing module skeleton | API | High | API-001 | none | `/apps/api/src/modules/sharing` |
| API-009 | Add versions module skeleton | API | Medium | API-001 | none | `/apps/api/src/modules/versions` |
| API-010 | Add AI module skeleton | API | Medium | API-001 | none | `/apps/api/src/modules/ai` |
| API-011 | Add exports module skeleton | API | Medium | API-001 | none | `/apps/api/src/modules/exports` |
| API-012 | Add comments module skeleton | API | Low | API-001 | none | `/apps/api/src/modules/comments` |
| API-013 | Add audit module skeleton | API | Medium | API-001 | none | `/apps/api/src/modules/audit` |
| AUTH-001 | Add Google auth config fields | Auth | High | API-003 | api doc | `/apps/api/src/config` |
| AUTH-002 | Implement Google token validation service stub | Auth | High | AUTH-001,API-006 | spec + change note | `/apps/api/src/modules/auth` |
| AUTH-003 | Add user profile model | Auth | High | DB-002 | none | `/apps/api,/packages/shared-types` |
| AUTH-004 | Add auth callback endpoint | Auth | High | AUTH-002 | api doc | `/apps/api/src/modules/auth` |
| AUTH-005 | Add session issuance logic | Auth | High | ADR-007,AUTH-002 | ADR or spec | `/apps/api/src/modules/auth` |
| AUTH-006 | Add auth guard middleware | Auth | High | AUTH-005 | none | `/apps/api` |
| AUTH-007 | Add current-user endpoint | Auth | Medium | AUTH-006 | api doc | `/apps/api/src/modules/auth` |
| AUTH-008 | Add auth integration tests | Auth | Medium | TEST-003,AUTH-004 | none | `/apps/api/tests/integration` |
| DB-001 | Choose ORM and add initial config | Database | High | ADR-006 | ADR + task doc | `/apps/api,/docs/adr` |
| DB-002 | Create users table or model | Database | High | DB-001 | change note | `/apps/api` |
| DB-003 | Create documents table or model | Database | High | DB-001 | change note | `/apps/api` |
| DB-004 | Create memberships table or model | Database | High | DB-001 | change note | `/apps/api` |
| DB-005 | Create invitations table or model | Database | Medium | DB-001 | none | `/apps/api` |
| DB-006 | Create revisions table or model | Database | High | DB-001 | none | `/apps/api` |
| DB-007 | Create AI requests table or model | Database | High | DB-001 | none | `/apps/api` |
| DB-008 | Create export jobs table or model | Database | Medium | DB-001 | none | `/apps/api` |
| DB-009 | Create audit events table or model | Database | Medium | DB-001 | none | `/apps/api` |
| DB-010 | Add local migration workflow | Database | High | DB-001 | change note | `/apps/api,/infrastructure` |
| DB-011 | Add seed script with demo data | Database | Medium | DB-002,DB-003,DB-004 | none | `/apps/api` |
| DOCSVC-001 | Implement create document endpoint | Document Service | High | API-007,DB-003,DB-004 | api doc + change note | `/apps/api/src/modules/documents` |
| DOCSVC-002 | Implement list documents endpoint | Document Service | High | DOCSVC-001 | api doc | `/apps/api/src/modules/documents` |
| DOCSVC-003 | Implement get document metadata endpoint | Document Service | High | DOCSVC-001 | api doc | `/apps/api/src/modules/documents` |
| DOCSVC-004 | Implement rename document endpoint | Document Service | Medium | DOCSVC-003 | api doc | `/apps/api/src/modules/documents` |
| DOCSVC-005 | Implement archive or delete document endpoint | Document Service | Medium | DOCSVC-003 | api doc | `/apps/api/src/modules/documents` |
| DOCSVC-006 | Add owner membership on create | Document Service | High | DOCSVC-001 | none | `/apps/api/src/modules/documents` |
| DOCSVC-007 | Add CRUD integration tests | Document Service | Medium | TEST-003,DOCSVC-005 | none | `/apps/api/tests/integration` |
| SHARE-001 | Implement invite creation endpoint | Sharing | High | API-008,DB-005 | api doc | `/apps/api/src/modules/sharing` |
| SHARE-002 | Implement invitation accept endpoint | Sharing | High | SHARE-001 | api doc | `/apps/api/src/modules/sharing` |
| SHARE-003 | Implement role update endpoint | Sharing | High | SHARE-001,PKG-006 | api doc | `/apps/api/src/modules/sharing` |
| SHARE-004 | Implement revoke access endpoint | Sharing | High | SHARE-003 | api doc | `/apps/api/src/modules/sharing` |
| SHARE-005 | Add permission matrix enforcement helpers | Sharing | High | PKG-006 | spec + change note | `/apps/api,/packages/authz` |
| SHARE-006 | Add API tests for role restrictions | Sharing | Medium | TEST-003,SHARE-005 | none | `/apps/api/tests/integration` |
| SHARE-007 | Add audit log entries for sharing changes | Sharing | Medium | API-013,SHARE-003 | none | `/apps/api/src/modules/sharing` |
| COLLAB-001 | Initialize real collaboration server | Collaboration | High | ADR-004 | task doc + change note | `/apps/collab` |
| COLLAB-002 | Add session token verification | Collaboration | High | COLLAB-001,AUTH-005 | none | `/apps/collab` |
| COLLAB-003 | Add document join flow | Collaboration | High | COLLAB-002,PKG-002 | spec + api doc | `/apps/collab` |
| COLLAB-004 | Add presence awareness channel | Collaboration | High | COLLAB-003 | none | `/apps/collab/src/awareness` |
| COLLAB-005 | Add heartbeat timeout cleanup | Collaboration | Medium | COLLAB-004 | none | `/apps/collab/src/awareness` |
| COLLAB-006 | Add writer-slot allocation logic | Collaboration | High | COLLAB-003 | none | `/apps/collab/src/writer-slots` |
| COLLAB-007 | Add writer-slot queue logic | Collaboration | Medium | COLLAB-006 | none | `/apps/collab/src/writer-slots` |
| COLLAB-008 | Add permission update push event | Collaboration | High | SHARE-003,COLLAB-003 | spec + api doc | `/apps/collab/src/permissions` |
| COLLAB-009 | Add disconnect and reconnect handling | Collaboration | High | COLLAB-003 | spec | `/apps/collab/src/sessions` |
| COLLAB-010 | Add collaboration service tests | Collaboration | Medium | TEST-004,COLLAB-009 | none | `/apps/collab/tests` |
| SYNC-001 | Add IndexedDB persistence for local edits | Sync | High | EDIT-002,COLLAB-003 | spec | `/apps/web/src/editor` |
| SYNC-002 | Add reconnect banner UX | Sync | Medium | WEB-014 | none | `/apps/web` |
| SYNC-003 | Add state-vector reconnect flow | Sync | High | SYNC-001,COLLAB-009 | spec | `/apps/web,/apps/collab` |
| SYNC-004 | Add unsynced local recovery buffer | Sync | High | SYNC-003 | spec | `/apps/web/src/editor` |
| SYNC-005 | Add permission-changed-while-offline handling | Sync | High | SYNC-004,SHARE-005 | spec | `/apps/web,/apps/collab` |
| SYNC-006 | Add reconnect integration test | Sync | Medium | TEST-004,SYNC-003 | none | `/apps/collab/tests` |
| VER-001 | Add revision creation policy service | Versioning | High | DB-006,ADR-008 | spec + change note | `/apps/api/src/modules/versions` |
| VER-002 | Add revision list endpoint | Versioning | High | VER-001 | api doc | `/apps/api/src/modules/versions` |
| VER-003 | Add revision detail endpoint | Versioning | Medium | VER-002 | api doc | `/apps/api/src/modules/versions` |
| VER-004 | Add diff endpoint stub | Versioning | Medium | VER-002 | api doc | `/apps/api/src/modules/versions` |
| VER-005 | Add rollback endpoint | Versioning | High | VER-002 | api doc + change note | `/apps/api/src/modules/versions` |
| VER-006 | Add rollback event to collab service | Versioning | High | VER-005,COLLAB-003 | spec | `/apps/collab` |
| VER-007 | Add version history UI data hook | Versioning | Medium | WEB-010,VER-002 | none | `/apps/web` |
| VER-008 | Add versioning tests | Versioning | Medium | TEST-003,VER-005 | none | `/apps/api/tests/integration` |
| AI-001 | Add AI request model | AI | High | DB-007 | none | `/apps/api/src/modules/ai` |
| AI-002 | Add AI request submission endpoint | AI | High | API-010,AI-001 | api doc + spec | `/apps/api/src/modules/ai` |
| AI-003 | Add allowed action enum validation | AI | Medium | AI-002 | none | `/apps/api/src/modules/ai` |
| AI-004 | Add context-scope validation | AI | Medium | AI-002 | none | `/apps/api/src/modules/ai` |
| AI-005 | Add optional masking flag handling | AI | Medium | AI-002 | spec | `/apps/api/src/modules/ai` |
| AI-006 | Add proposal result model | AI | High | AI-001 | none | `/apps/api/src/modules/ai,/packages/shared-types` |
| AI-007 | Add stale proposal detection helper | AI | High | AI-006 | spec + change note | `/apps/api/src/modules/ai` |
| AI-008 | Add proposal accept endpoint | AI | Medium | AI-007 | api doc | `/apps/api/src/modules/ai` |
| AI-009 | Add proposal reject endpoint | AI | Medium | AI-006 | api doc | `/apps/api/src/modules/ai` |
| AI-010 | Add AI request status endpoint | AI | Medium | AI-002 | api doc | `/apps/api/src/modules/ai` |
| AI-011 | Add AI panel UI state model | AI | Medium | WEB-012,AI-010 | none | `/apps/web` |
| AI-012 | Add mock provider client | AI | High | ADR-005,AI-002 | none | `/apps/worker,/apps/api` |
| AI-013 | Add AI integration tests with fixtures | AI | Medium | TEST-003,AI-012 | none | `/apps/api/tests/integration` |
| WORK-001 | Initialize worker runtime | Worker | High | ADR-005 | task doc + change note | `/apps/worker` |
| WORK-002 | Add queue connection config | Worker | High | WORK-001 | none | `/apps/worker` |
| WORK-003 | Add AI job processor stub | Worker | High | WORK-002,AI-002 | none | `/apps/worker/src/ai-jobs` |
| WORK-004 | Add export job processor stub | Worker | Medium | WORK-002,EXP-001 | none | `/apps/worker/src/export-jobs` |
| WORK-005 | Add revision summary job stub | Worker | Medium | WORK-002,VER-001 | none | `/apps/worker/src/revision-jobs` |
| WORK-006 | Add retry and backoff defaults | Worker | Medium | WORK-002 | none | `/apps/worker` |
| WORK-007 | Add worker tests | Worker | Medium | TEST-001,WORK-003 | none | `/apps/worker/tests` |
| EXP-001 | Add export job request endpoint | Export | High | API-011,DB-008 | api doc | `/apps/api/src/modules/exports` |
| EXP-002 | Add export job status endpoint | Export | Medium | EXP-001 | api doc | `/apps/api/src/modules/exports` |
| EXP-003 | Add plain-text renderer | Export | High | EXP-001 | none | `/apps/worker/src/export-jobs` |
| EXP-004 | Add PDF renderer stub | Export | Medium | EXP-001 | none | `/apps/worker/src/export-jobs` |
| EXP-005 | Add DOCX renderer stub | Export | Medium | EXP-001 | none | `/apps/worker/src/export-jobs` |
| EXP-006 | Add secure download URL flow | Export | Medium | EXP-002 | spec | `/apps/api,/apps/worker` |
| EXP-007 | Add export UI integration | Export | Medium | WEB-013,EXP-002 | none | `/apps/web` |
| INFRA-001 | Add Docker Compose for Postgres and Redis | Infrastructure | High | DB-001 | change note | `/infrastructure/docker` |
| INFRA-002 | Add local object storage service to Compose | Infrastructure | Medium | INFRA-001 | none | `/infrastructure/docker` |
| INFRA-003 | Add API service container | Infrastructure | Medium | API-001 | none | `/infrastructure/docker` |
| INFRA-004 | Add collab service container | Infrastructure | Medium | COLLAB-001 | none | `/infrastructure/docker` |
| INFRA-005 | Add worker service container | Infrastructure | Medium | WORK-001 | none | `/infrastructure/docker` |
| INFRA-006 | Add startup helper scripts | Infrastructure | Medium | INFRA-001 | none | `/infrastructure/scripts` |
| INFRA-007 | Add local bootstrap README | Infrastructure | Medium | INFRA-001 | change note | `/infrastructure` |
| TEST-001 | Decide and set up Vitest or Jest | Testing | High | ADR-002,ADR-003 | task doc + change note | `/` |
| TEST-002 | Add shared test config | Testing | High | TEST-001 | none | `/` |
| TEST-003 | Add API integration test harness | Testing | High | TEST-001,API-001,DB-001 | none | `/apps/api/tests` |
| TEST-004 | Add collaboration test harness | Testing | High | TEST-001,COLLAB-001 | none | `/apps/collab/tests` |
| TEST-005 | Add web E2E framework setup | Testing | Medium | TEST-001,WEB-001 | none | `/apps/web/tests` |
| TEST-006 | Add fixture factories | Testing | Medium | TEST-001 | none | `/packages/test-fixtures` |
| TEST-007 | Refine CI test matrix | Testing | Low | TEST-003,TEST-004,TEST-005 | change note | `/.github/workflows` |
| OPS-001 | Add structured logger abstraction | Ops | Medium | API-001 | change note | `/apps/api,/apps/collab,/apps/worker` |
| OPS-002 | Add request ID propagation | Ops | Medium | OPS-001 | none | `/apps/api` |
| OPS-003 | Add audit event schema | Ops | Medium | API-013,DB-009 | spec | `/apps/api,/packages/shared-types` |
| OPS-004 | Add basic metrics list doc | Ops | Low | TASK-0001 | spec | `/docs/specs` |
| OPS-005 | Add health and readiness endpoints | Ops | Medium | API-002,COLLAB-001,WORK-001 | api doc | `/apps` |
| OPS-006 | Add rate-limit config placeholders | Ops | Low | API-003 | none | `/apps/api` |
