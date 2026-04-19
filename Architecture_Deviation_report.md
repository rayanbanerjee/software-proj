# Architecture Deviation Report

This report compares the intended architecture in the Assignment 1 system design report against the implemented repository, with the Assignment brief used as the requirements baseline. The overall shape is still recognizably aligned: monorepo, web client, API, realtime collaboration service, AI-assisted workflow, versions, sharing, and exports are all present. The main deviations are mostly about consolidation, persistence strategy, and how much of the “full platform” design was compressed into a more delivery-friendly implementation.

# Design Area: Service Boundaries And Runtime Topology

- The original design proposed a distinct AI service plus a background worker as first-class runtime containers. In the implemented system, AI request handling lives inside the Fastify API, and the worker exists more as a foundation layer than as the primary path for live AI and export processing.
- The intended architecture separated business API, AI orchestration, and async processing quite cleanly. The implemented system takes a more compact route: the API owns a larger share of orchestration logic, which reduces operational sprawl but also narrows the separation between application logic and long-running work.
- The planned storage stack assumed PostgreSQL, Redis, and object storage as active architectural pillars. In practice, the running system leans much more heavily on local filesystem-backed persistence and process-local state, with the heavier infrastructure still present as a future-ready scaffold rather than the main source of truth everywhere.

# Design Area: Data Persistence And Storage Model

- The design report positioned PostgreSQL as the durable home for users, documents, permissions, versions, and AI metadata. The repo contains a credible Prisma schema for that model, but most active runtime services currently persist to JSON files under the API data directory rather than to the database.
- The intended split was “durable metadata in the database, large artifacts in object storage, transient collaboration state elsewhere.” The implementation keeps that conceptual split only partially: documents, comments, AI requests, and export jobs are persisted locally in app-managed files, while object-storage-style behavior is simulated through local artifact directories.
- Version history was designed as a durable architectural concern. The current implementation supports version listing, diffs, and rollback behavior, but revision history is still maintained in-memory inside the API process rather than as fully durable multi-process state.
- Audit history exists, but it is currently the lightest part of the persistence story: audit events are kept in memory rather than written to a durable backend. That makes the feature useful for runtime behavior and tests, but softer than the original data model implied.

# Design Area: Collaboration And Document Representation

- The assignment report assumed a rich-text collaborative editor from the outset. The repo now does implement real TipTap/Yjs rich text, but the system evolved through an intermediate plain-text-heavy phase, and some adjacent features still treat plain text as the easiest shared denominator.
- The implemented system stores both structured rich-text content and a derived plain-text representation. That is a practical compromise for AI, diffing, and exports, but it differs from the cleaner original idea where document representation and historical storage would likely revolve around a more explicitly designed canonical content model.
- The original architecture framed collaboration state and durable document state as more cleanly separated. The current system does sync collab-originated edits back into API-managed document state, so the two worlds are connected, but the separation is more operational than architectural purity.

# Design Area: Authentication, Authorization, And Sharing

- The design report described a fairly classic private-document sharing model with explicit permissions. The current implementation intentionally softens that by making documents shared by default with authenticated users through a default editor role. That makes collaboration easier in local usage, but it is a noticeable deviation from the original privacy posture.
- The original role matrix stated that only Owner and Editor should be able to export documents. In the implemented authorization package, `commenter` currently retains export capability, which is a more permissive interpretation than the design report allowed.
- The design report allowed both Owner and Editor to restore versions. The current permission model is stricter on that point: rollback is effectively owner-only.
- Authentication itself is slightly more pragmatic than the original high-level framing. The system supports the intended Google-backed path, but it also keeps a local username/password-style development login flow, which is useful operationally even though it sits outside the “clean production-only identity provider” picture.

# Design Area: AI Integration

- The original design proposed AI as its own service boundary. The implementation folds AI orchestration into the API, which is a reasonable student-project simplification, but it does mean AI is less independently deployable than the report suggested.
- One important design choice was preserved very well: AI produces reviewable proposals instead of silently mutating the document. That said, the UX is still simpler than envisioned. The report discussed partial acceptance and tracked-change-style review; the implemented UI is closer to an apply-or-dismiss workflow.
- The design report discussed model specialization and quota strategy. The current implementation is much leaner: it uses a configurable provider path, but it does not yet implement the richer per-feature model routing or the quota/budget enforcement story described in the architecture.
- The original report treated prompt handling as a configurable, template-oriented concern. The repo does have shared prompt-template packaging, so the spirit is there, but prompt lifecycle management is still closer to application-owned configuration than to a separately governed prompt system.

# Design Area: Async Processing And Exports

- The target design used an asynchronous job model for AI and exports, with a worker and queue infrastructure as explicit architectural elements. The implementation keeps the job-shaped interfaces, but much of the real execution still happens process-locally in the API rather than through a fully externalized queue-driven runtime.
- Export functionality is now real and richer than a stub, including PDF and DOCX generation, but the execution path is more compact than the design implied. It behaves like a durable local pipeline rather than a fully distributed background processing subsystem.
- The worker application exists, but it is not yet the decisive operational center for export and AI processing that the original container view pointed toward. It reads more like an architectural runway than the final backbone of async work.

# Design Area: API And Communication Model

- The design report proposed REST for business operations and push-based sync for collaboration. That split is still largely intact, so this is more of a refinement than a mismatch.
- One mild deviation is that some of the “optional extra endpoints” from the design are absorbed into the websocket/collab flow rather than exposed as distinct public API surfaces. This keeps the implementation smaller, but it means the API layer is slightly less expansive than the report’s full contract suggested.
- The original report left room for a dedicated presence bootstrap flow. The implemented system leans harder on the collaboration channel itself, which is architecturally sensible but a bit narrower than the initial contract language.

# Design Area: Code Structure And Repository Organization

- The monorepo choice matches the original design very closely. The deviation is in the exact package breakdown: the report envisioned packages such as shared validation, editor contracts, and AI prompts, while the implemented repo ended up with a somewhat different set of shared packages shaped by what was actually needed during delivery.
- The report proposed a dedicated top-level integration/e2e test layout. The actual repo mixes top-level shared tests with many app-local test suites, which is not worse, but it is less uniform than the originally described structure.
- The implementation includes a substantial amount of architecture and task documentation under `docs/`, which fits the spirit of the report well, but the documentation trail is more iterative and change-log-driven than the cleaner “final shape” implied by the Assignment 1 structure.

# Design Area: Data Model And Domain Scope

- The design report described a fairly mature domain model for users, permissions, versions, AI interactions, and sharing. The repo does contain that future-facing shape in Prisma, but the runtime model is still a slimmer operational subset of it.
- Team-based sharing and link-based sharing were part of the broader data-model ambition. The current implementation focuses on user-level sharing and invitation flows, so the sharing model is narrower than the original design horizon.
- The report anticipated AI interaction history that could clearly represent accepted, rejected, and partially applied outcomes. The implementation tracks request and proposal lifecycle well enough for core behavior, but the “partially applied” branch is still more conceptual than first-class.

# Design Area: Overall Architectural Character

- The biggest deviation is not a reversal of the original design, but a compression of it. The intended architecture described a more distributed, infrastructure-backed platform. The implemented architecture delivers the same product ideas through a more consolidated, local-first, student-friendly runtime.
- In other words, the repo is not off-architecture so much as it is on a pragmatic subset of the architecture: the core interaction model is there, while some of the heavier persistence, service isolation, and governance concerns are staged as the next layer rather than fully realized today.
