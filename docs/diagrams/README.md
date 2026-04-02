# Diagrams

Add container, sequence, and deployment diagrams derived from the system design document.

Recommended conventions:

- one file per diagram topic
- include the source format next to rendered exports when possible
- link each diagram from the relevant ADR or spec

Current source files:

- `docs/diagrams/container-diagram.mmd`: initial service/container view based on the accepted monorepo, API, web, collaboration, worker, and database ADRs
- `docs/diagrams/open-document-and-join-session.mmd`: sequence view for opening a document, verifying access, and establishing the collaboration session
