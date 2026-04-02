# Spec: Service Metrics List

## Status

Draft

## Goal

Define a minimal metrics baseline for the API, collaboration service, and worker so future observability work has a concrete starting point.

## Scope

- counters, gauges, and timers the services should eventually expose
- operational signals for API requests, collaboration sessions, and background jobs
- naming guidance and service ownership

## Non-Goals

- binding to a specific metrics vendor
- dashboard design
- alert thresholds

## Naming Guidance

- use stable snake-case or dot-separated names per service area
- keep labels low-cardinality
- avoid user ids, document ids, or other unbounded identifiers in metric labels

## API Metrics

- `api.requests_total`
  - counter by route group, method, and response class
- `api.request_duration_ms`
  - timer or histogram by route group
- `api.auth_failures_total`
  - counter for missing, invalid, or expired session attempts
- `api.documents_created_total`
  - counter for successful document creation
- `api.sharing_changes_total`
  - counter for invitation, role update, and revoke actions
- `api.export_requests_total`
  - counter for export job submissions

## Collaboration Metrics

- `collab.active_connections`
  - gauge of current websocket connections
- `collab.active_documents`
  - gauge of documents with active sessions
- `collab.presence_snapshots_total`
  - counter of stateless presence broadcasts
- `collab.reconnect_resumptions_total`
  - counter of successful reconnect replacements
- `collab.presence_pruned_total`
  - counter of stale-session cleanup removals
- `collab.connection_rejections_total`
  - counter of failed authenticated connect attempts

## Worker Metrics

- `worker.jobs_started_total`
  - counter by queue name
- `worker.jobs_completed_total`
  - counter by queue name
- `worker.jobs_failed_total`
  - counter by queue name
- `worker.job_duration_ms`
  - timer or histogram by queue name
- `worker.queue_registrations_total`
  - counter for worker boot registration activity

## Export Metrics

- `exports.render_requests_total`
  - counter by format
- `exports.render_failures_total`
  - counter by format
- `exports.download_links_created_total`
  - counter of signed download responses

## Versioning Metrics

- `versions.revisions_created_total`
  - counter of revision checkpoints
- `versions.rollbacks_total`
  - counter of rollback operations
- `versions.summary_jobs_total`
  - counter of revision summary jobs enqueued

## Future Work

- attach concrete instrumentation points in each service
- expose a scrape or export endpoint where appropriate
- define alert thresholds once real traffic patterns exist
