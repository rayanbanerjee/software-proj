# Incomplete Tasks

The canonical backlog in `docs/process/notion-backlog.csv` is currently marked fully `Done`, so this file tracks the remaining work that is still explicitly called out in repo docs, API notes, and change follow-ups.

## Backend and auth

- Completed on `2026-04-19`:
  - real Google ID token verification is implemented for `POST /v1/auth/callback`
  - route-level auth stays in place through the shared `protectedRoute` helper
  - API rate limiting is enforced via the configured in-memory limiter

## Versions and collaboration

- Completed on `2026-04-19`:
  - revision diffs use real line-based comparison logic against stored revisions or the current document head
  - rollback events now carry the restored source revision id through the collab layer for active collaborators

## Export pipeline

- Completed on `2026-04-19`:
  - export jobs and artifacts are persisted under the local API data directory
  - export requests return queued jobs and complete through the process-local async export worker
  - PDF and DOCX exports generate real file artifacts
  - artifact files are written into a bucketed local object-storage-style directory
  - authenticated artifact downloads validate signed tokens and stream file responses

## Prototype-state data gaps

- Completed on `2026-04-19`:
  - API document metadata and comments are persisted on disk across app restarts when the data dir is reused
  - relaxed cross-account document visibility has been removed from local development

## Testing and local workflow

- Completed on `2026-04-19`:
  - Playwright browser installation is standardized through `./run.sh e2e:install`
  - the local and testing guides now document a concrete browser-install, seed, and run flow
  - auth and AI setup details are folded into the local setup documentation
